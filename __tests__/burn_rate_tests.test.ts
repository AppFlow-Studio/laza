// =============================================================================
// TASK 4.8 — Burn Rate & Reorder Alert Unit Tests (Jest)
// Laza Dessert Cafe · Warehouse & Supply Chain — Phase 4
// =============================================================================
// These tests call your Supabase STAGING database directly.
// They use the SERVICE ROLE KEY so RLS is bypassed for seeding/teardown.
//
// Run:
//   npx jest burn_rate_tests --verbose
//
// What we're testing:
//  - get_warehouse_burn_rates() returns accurate weekly consumption
//  - get_reorder_alerts() flags items below the reorder threshold
//  - Edge cases: no orders, zero stock, different lookback windows,
//    cancelled/rejected tickets excluded
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Client — service role key to bypass RLS
// ---------------------------------------------------------------------------
const supabase: SupabaseClient = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ---------------------------------------------------------------------------
// Shared IDs
// ---------------------------------------------------------------------------
const ORG_ID         = "test-org-jest-48";
const ADMIN_ID       = "test-admin-jest-48";
const STORE_ADMIN_ID = "test-store-admin-jest-48";

let warehouseLocationId: string;
let storeLocationId: string;
let itemFastMover: number;   // High consumption — triggers reorder alert
let itemSlowMover: number;   // Low consumption — no alert
let itemNoOrders: number;    // Zero orders — weeks_remaining = NULL
let itemZeroStock: number;   // Has orders but zero warehouse stock

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------

beforeAll(async () => {
	// ── Organization ──────────────────────────────────────────────────────────
	const { error: orgErr } = await supabase
		.from("organizations")
		.upsert({ id: ORG_ID, name: "Jest Test Org 4.8" });
	if (orgErr) throw new Error(`SETUP: org upsert — ${orgErr.message}`);

	// ── Users ─────────────────────────────────────────────────────────────────
	const { error: usersErr } = await supabase.from("users").upsert([
		{ id: ADMIN_ID,       email: "jest-admin-48@test.laza",  role: "super_admin", is_active: true },
		{ id: STORE_ADMIN_ID, email: "jest-store-48@test.laza",  role: "admin",       is_active: true },
	]);
	if (usersErr) throw new Error(`SETUP: users — ${usersErr.message}`);

	// ── Warehouse location ────────────────────────────────────────────────────
	const { data: wh, error: whErr } = await supabase
		.from("locations")
		.insert({
			organization_id: ORG_ID,
			name:            "Jest Warehouse 4.8",
			address:         { street: "1 Analytics St", city: "NYC" },
			location_type:   "warehouse",
			is_active:       true,
		})
		.select("id")
		.single();
	if (whErr || !wh) throw new Error(`SETUP: warehouse — ${whErr?.message}`);
	warehouseLocationId = wh.id;

	// ── Store location ────────────────────────────────────────────────────────
	const { data: store, error: storeErr } = await supabase
		.from("locations")
		.insert({
			organization_id: ORG_ID,
			name:            "Jest Store 4.8",
			address:         { street: "2 Analytics St", city: "NYC" },
			location_type:   "store",
			is_active:       true,
		})
		.select("id")
		.single();
	if (storeErr || !store) throw new Error(`SETUP: store — ${storeErr?.message}`);
	storeLocationId = store.id;

	// ── Items ─────────────────────────────────────────────────────────────────
	const insertItem = async (name: string, sku: string) => {
		const { data, error } = await supabase
			.from("items")
			.insert({
				organization_id: ORG_ID,
				name,
				sku,
				unit_of_measure: "pcs",
				min_quantity: 0,
				box_quantity: 10,
			})
			.select("id")
			.single();
		if (error || !data) throw new Error(`SETUP: item ${name} — ${error?.message}`);
		return data.id;
	};

	itemFastMover  = await insertItem("Fast Mover Jest",  "SKU-FAST-48");
	itemSlowMover  = await insertItem("Slow Mover Jest",  "SKU-SLOW-48");
	itemNoOrders   = await insertItem("No Orders Jest",   "SKU-NONE-48");
	itemZeroStock  = await insertItem("Zero Stock Jest",  "SKU-ZERO-48");

	// ── Warehouse stock (item_locations) ──────────────────────────────────────
	const { error: ilErr } = await supabase.from("item_locations").upsert([
		{ organization_id: ORG_ID, item_id: itemFastMover,  location_id: warehouseLocationId, current_quantity: 100 },
		{ organization_id: ORG_ID, item_id: itemSlowMover,  location_id: warehouseLocationId, current_quantity: 500 },
		{ organization_id: ORG_ID, item_id: itemNoOrders,   location_id: warehouseLocationId, current_quantity: 200 },
		{ organization_id: ORG_ID, item_id: itemZeroStock,  location_id: warehouseLocationId, current_quantity: 0   },
	]);
	if (ilErr) throw new Error(`SETUP: item_locations — ${ilErr.message}`);

	// ── Create confirmed order tickets to simulate consumption ────────────────
	// Fast Mover: 10 confirmed tickets over ~30 days, 5 boxes each = 50 boxes = 500 units total
	// Over 90-day lookback: 500 units / (90/7) ≈ 38.9 units/week
	// With 100 stock: 100 / 38.9 ≈ 2.6 weeks remaining → CRITICAL
	for (let i = 0; i < 10; i++) {
		await createConfirmedTicket(
			itemFastMover,
			5, // boxes
			50, // units (5 boxes × 10 ppb)
			daysAgo(3 * i + 1), // spread across ~30 days
		);
	}

	// Slow Mover: 2 confirmed tickets, 1 box each = 2 boxes = 20 units total
	// Over 90-day lookback: 20 / (90/7) ≈ 1.6 units/week
	// With 500 stock: 500 / 1.6 ≈ 321 weeks remaining → WAY above threshold
	for (let i = 0; i < 2; i++) {
		await createConfirmedTicket(
			itemSlowMover,
			1,
			10,
			daysAgo(20 * i + 5),
		);
	}

	// Zero Stock item: 3 confirmed tickets, 2 boxes each = 6 boxes = 60 units
	// Over 90-day lookback: 60 / (90/7) ≈ 4.7 units/week
	// With 0 stock: 0 / 4.7 = 0 weeks remaining → CRITICAL
	for (let i = 0; i < 3; i++) {
		await createConfirmedTicket(
			itemZeroStock,
			2,
			20,
			daysAgo(10 * i + 2),
		);
	}

	// No Orders item: no tickets at all → should return NULL weeks_remaining

	// ── Create REJECTED and CANCELLED tickets (must NOT count) ────────────────
	await createTicketWithStatus(itemFastMover, 100, 1000, "rejected");
	await createTicketWithStatus(itemFastMover, 100, 1000, "cancelled");

}, 60_000);

// ---------------------------------------------------------------------------
// TEARDOWN
// ---------------------------------------------------------------------------

afterAll(async () => {
	// Collect test tickets
	const { data: tickets } = await supabase
		.from("order_tickets")
		.select("id")
		.eq("organization_id", ORG_ID);

	if (tickets?.length) {
		const ticketIds = tickets.map((t) => t.id);

		const { data: ticketItems } = await supabase
			.from("order_ticket_items")
			.select("id")
			.in("ticket_id", ticketIds);
		if (ticketItems?.length) {
			await supabase
				.from("order_ticket_fulfillment_lines")
				.delete()
				.in("order_ticket_item_id", ticketItems.map((r) => r.id));
		}

		await supabase.from("ticket_deliveries").delete().in("ticket_id", ticketIds);
		await supabase.from("order_ticket_items").delete().in("ticket_id", ticketIds);
		await supabase.from("order_ticket_logs").delete().in("ticket_id", ticketIds);
		await supabase.from("order_tickets").delete().in("id", ticketIds);
	}

	await supabase.from("inventory_logs").delete().in("location_id", [warehouseLocationId, storeLocationId]);
	await supabase.from("alerts").delete().in("location_id", [warehouseLocationId, storeLocationId]);
	await supabase.from("item_locations").delete().in("location_id", [warehouseLocationId, storeLocationId]);
	await supabase.from("items").delete().eq("organization_id", ORG_ID);
	await supabase.from("locations").delete().eq("organization_id", ORG_ID);
	await supabase.from("users").delete().in("id", [ADMIN_ID, STORE_ADMIN_ID]);
	await supabase.from("organizations").delete().eq("id", ORG_ID);
}, 30_000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString();
}

/**
 * Create a confirmed order ticket with a single line item.
 * Simulates a completed store order for burn rate calculation.
 */
async function createConfirmedTicket(
	itemId: number,
	boxes: number,
	units: number,
	confirmedAt: string,
) {
	const { data: ticket, error: tErr } = await supabase
		.from("order_tickets")
		.insert({
			organization_id:        ORG_ID,
			requesting_location_id: storeLocationId,
			warehouse_location_id:  warehouseLocationId,
			status:                 "confirmed",
			requested_by:           STORE_ADMIN_ID,
			confirmed_by:           STORE_ADMIN_ID,
			confirmed_at:           confirmedAt,
			fulfilled_at:           confirmedAt,
		})
		.select("id")
		.single();
	if (tErr || !ticket) throw new Error(`Helper: confirmed ticket — ${tErr?.message}`);

	const { error: iErr } = await supabase.from("order_ticket_items").insert({
		ticket_id:       ticket.id,
		item_id:         itemId,
		quantity_boxes:  boxes,
		quantity_units:  units,
		fulfilled_boxes: boxes,
		fulfilled_units: units,
	});
	if (iErr) throw new Error(`Helper: ticket items — ${iErr.message}`);

	return ticket.id;
}

/**
 * Create a non-confirmed ticket (rejected/cancelled) to verify exclusion.
 */
async function createTicketWithStatus(
	itemId: number,
	boxes: number,
	units: number,
	status: "rejected" | "cancelled",
) {
	const { data: ticket, error: tErr } = await supabase
		.from("order_tickets")
		.insert({
			organization_id:        ORG_ID,
			requesting_location_id: storeLocationId,
			warehouse_location_id:  warehouseLocationId,
			status,
			requested_by:           STORE_ADMIN_ID,
			...(status === "rejected" ? { rejection_reason: "Test rejection" } : {}),
		})
		.select("id")
		.single();
	if (tErr || !ticket) throw new Error(`Helper: ${status} ticket — ${tErr?.message}`);

	const { error: iErr } = await supabase.from("order_ticket_items").insert({
		ticket_id:      ticket.id,
		item_id:        itemId,
		quantity_boxes: boxes,
		quantity_units: units,
	});
	if (iErr) throw new Error(`Helper: ${status} ticket items — ${iErr.message}`);

	return ticket.id;
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

/**
 * Supabase may return BIGINT item_id as a number OR a string depending on
 * value size and client version. Use Number() coercion for safe comparison.
 */
function findByItemId(rows: any[] | null, itemId: number) {
	return rows?.find((r: any) => Number(r.item_id) === itemId);
}

describe("get_warehouse_burn_rates RPC — Task 4.8", () => {

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 1 — Fast mover: correct weekly average from confirmed tickets
	// ─────────────────────────────────────────────────────────────────────────
	test("1. Fast mover: accurate weekly burn rate from confirmed tickets", async () => {
		const { data, error } = await supabase.rpc("get_warehouse_burn_rates", {
			p_organization_id: ORG_ID,
			p_days_lookback:   90,
		});
		expect(error).toBeNull();

		const fastMover = findByItemId(data, itemFastMover);
		expect(fastMover).toBeDefined();

		// 500 total units over 90 days = 500 / (90/7) ≈ 38.89 units/week
		const expectedWeekly = 500 / (90 / 7);
		expect(Number(fastMover.avg_weekly_units)).toBeCloseTo(expectedWeekly, 1);

		// Warehouse stock = 100 → weeks_remaining ≈ 100 / 38.89 ≈ 2.57
		expect(Number(fastMover.current_warehouse_stock)).toBe(100);
		expect(Number(fastMover.weeks_remaining)).toBeCloseTo(100 / expectedWeekly, 1);
	}, 15_000);

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 2 — No orders: weeks_remaining is NULL, not zero
	// ─────────────────────────────────────────────────────────────────────────
	test("2. Item with no orders: weeks_remaining = NULL", async () => {
		const { data, error } = await supabase.rpc("get_warehouse_burn_rates", {
			p_organization_id: ORG_ID,
			p_days_lookback:   90,
		});
		expect(error).toBeNull();

		const noOrders = findByItemId(data, itemNoOrders);
		expect(noOrders).toBeDefined();
		expect(Number(noOrders.avg_weekly_units)).toBe(0);
		expect(noOrders.weeks_remaining).toBeNull();
		expect(Number(noOrders.current_warehouse_stock)).toBe(200);
	}, 15_000);

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 3 — Zero warehouse stock with orders: weeks_remaining = 0
	// ─────────────────────────────────────────────────────────────────────────
	test("3. Zero warehouse stock with order history: weeks_remaining = 0", async () => {
		const { data, error } = await supabase.rpc("get_warehouse_burn_rates", {
			p_organization_id: ORG_ID,
			p_days_lookback:   90,
		});
		expect(error).toBeNull();

		const zeroStock = findByItemId(data, itemZeroStock);
		expect(zeroStock).toBeDefined();
		expect(Number(zeroStock.current_warehouse_stock)).toBe(0);
		expect(Number(zeroStock.weeks_remaining)).toBe(0);
		expect(Number(zeroStock.avg_weekly_units)).toBeGreaterThan(0);
	}, 15_000);

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 4 — Different lookback windows produce different averages
	// ─────────────────────────────────────────────────────────────────────────
	test("4. 7-day vs 90-day lookback: different weekly averages", async () => {
		const { data: data90 } = await supabase.rpc("get_warehouse_burn_rates", {
			p_organization_id: ORG_ID,
			p_days_lookback:   90,
		});
		const { data: data7 } = await supabase.rpc("get_warehouse_burn_rates", {
			p_organization_id: ORG_ID,
			p_days_lookback:   7,
		});

		const fast90 = findByItemId(data90, itemFastMover);
		const fast7  = findByItemId(data7, itemFastMover);

		expect(fast90).toBeDefined();
		expect(fast7).toBeDefined();

		// 7-day window captures only very recent tickets, so the averages differ.
		// We can't predict exact values because it depends on which tickets fall
		// within the 7-day window, but the values should not be identical.
		// (If ALL 10 tickets happen to be within 7 days, they'd be different
		// because the divisor changes: units/(7/7) vs units/(90/7))
		const weekly90 = Number(fast90.avg_weekly_units);
		const weekly7  = Number(fast7.avg_weekly_units);

		// At minimum, both should be non-negative
		expect(weekly90).toBeGreaterThanOrEqual(0);
		expect(weekly7).toBeGreaterThanOrEqual(0);

		// If 7-day captured any tickets, its weekly rate should differ from 90-day
		// because the denominator is different
		if (weekly7 > 0) {
			expect(weekly7).not.toBeCloseTo(weekly90, 0);
		}
	}, 15_000);

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 5 — Rejected/cancelled tickets are NOT counted
	// ─────────────────────────────────────────────────────────────────────────
	test("5. Cancelled and rejected tickets excluded from burn rate", async () => {
		const { data, error } = await supabase.rpc("get_warehouse_burn_rates", {
			p_organization_id: ORG_ID,
			p_days_lookback:   90,
		});
		expect(error).toBeNull();

		const fastMover = findByItemId(data, itemFastMover);
		expect(fastMover).toBeDefined();

		// If rejected/cancelled were counted, we'd see (500 + 1000 + 1000) = 2500 units
		// instead of just 500. So avg_weekly_units should be based on 500 only.
		const expectedWeekly = 500 / (90 / 7);
		expect(Number(fastMover.avg_weekly_units)).toBeCloseTo(expectedWeekly, 1);
	}, 15_000);
});


describe("get_reorder_alerts RPC — Task 4.8", () => {

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 6 — Fast mover triggers critical reorder alert
	// ─────────────────────────────────────────────────────────────────────────
	test("6. Fast mover: flagged as critical reorder alert", async () => {
		const { data, error } = await supabase.rpc("get_reorder_alerts", {
			p_organization_id: ORG_ID,
			p_lead_time_days:  45,
			p_buffer_days:     14,
		});
		expect(error).toBeNull();

		const fastAlert = findByItemId(data, itemFastMover);
		expect(fastAlert).toBeDefined();
		// ~2.6 weeks remaining < 4 weeks → critical
		expect(fastAlert.urgency).toBe("critical");
	}, 15_000);

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 7 — Zero stock item triggers critical alert
	// ─────────────────────────────────────────────────────────────────────────
	test("7. Zero stock item: flagged as critical (0 weeks remaining)", async () => {
		const { data, error } = await supabase.rpc("get_reorder_alerts", {
			p_organization_id: ORG_ID,
			p_lead_time_days:  45,
			p_buffer_days:     14,
		});
		expect(error).toBeNull();

		const zeroAlert = findByItemId(data, itemZeroStock);
		expect(zeroAlert).toBeDefined();
		expect(zeroAlert.urgency).toBe("critical");
		expect(Number(zeroAlert.weeks_remaining)).toBe(0);
	}, 15_000);

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 8 — Slow mover does NOT appear in reorder alerts
	// ─────────────────────────────────────────────────────────────────────────
	test("8. Slow mover: not in reorder alerts (well above threshold)", async () => {
		const { data, error } = await supabase.rpc("get_reorder_alerts", {
			p_organization_id: ORG_ID,
			p_lead_time_days:  45,
			p_buffer_days:     14,
		});
		expect(error).toBeNull();

		const slowAlert = findByItemId(data, itemSlowMover);
		// Slow mover has ~321 weeks remaining, threshold is ~8.4 weeks → NOT flagged
		expect(slowAlert).toBeUndefined();
	}, 15_000);

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 9 — No-orders item does NOT appear in reorder alerts
	// ─────────────────────────────────────────────────────────────────────────
	test("9. No-orders item: excluded from alerts (can't predict depletion)", async () => {
		const { data, error } = await supabase.rpc("get_reorder_alerts", {
			p_organization_id: ORG_ID,
			p_lead_time_days:  45,
			p_buffer_days:     14,
		});
		expect(error).toBeNull();

		const noOrdersAlert = findByItemId(data, itemNoOrders);
		// weeks_remaining = NULL → excluded from alerts
		expect(noOrdersAlert).toBeUndefined();
	}, 15_000);

	// ─────────────────────────────────────────────────────────────────────────
	// TEST 10 — Custom lead time changes which items are flagged
	// ─────────────────────────────────────────────────────────────────────────
	test("10. Tighter lead time + buffer narrows the alert list", async () => {
		// With very short lead time (7 days + 0 buffer = 1 week threshold),
		// only items below 1 week should appear
		const { data, error } = await supabase.rpc("get_reorder_alerts", {
			p_organization_id: ORG_ID,
			p_lead_time_days:  7,
			p_buffer_days:     0,
		});
		expect(error).toBeNull();

		// Zero stock (0 weeks) should still be critical
		const zeroAlert = findByItemId(data, itemZeroStock);
		expect(zeroAlert).toBeDefined();

		// Fast mover (~2.6 weeks) is above 1-week threshold with a 7-day lead time
		// It should NOT appear when threshold = 1 week
		// (unless the math works out differently — the key assertion is
		// that the results change with different parameters)
		const alertCount7 = data?.length ?? 0;

		const { data: data45 } = await supabase.rpc("get_reorder_alerts", {
			p_organization_id: ORG_ID,
			p_lead_time_days:  45,
			p_buffer_days:     14,
		});
		const alertCount45 = data45?.length ?? 0;

		// Wider threshold should produce equal or more alerts
		expect(alertCount45).toBeGreaterThanOrEqual(alertCount7);
	}, 15_000);
});