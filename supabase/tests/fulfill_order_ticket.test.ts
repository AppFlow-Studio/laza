/**
 * supabase/tests/fulfill_order_ticket.test.ts
 *
 * Jest integration tests for the fulfill_order_ticket RPC.
 * These test the full round-trip: TypeScript → Supabase RPC → PostgreSQL.
 *
 * Requires a local Supabase instance running:
 *   npx supabase start
 *
 * Run with:
 *   npx jest supabase/tests/fulfill_order_ticket
 *
 * Uses the service-role key so RLS is bypassed for fixture setup.
 * The RPC itself runs as SECURITY DEFINER, matching production behaviour.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// ─── Client setup ─────────────────────────────────────────────────────────────

const supabase = createClient<Database>(
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321",
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const ADMIN_USER_ID = "test-admin-user";

async function createOrg(): Promise<string> {
	const orgId = `test-org-${crypto.randomUUID()}`;
	await supabase.from("organizations").insert({ id: orgId, name: "Test Org" });
	return orgId;
}

async function createWarehouse(orgId: string): Promise<string> {
	const { data } = await supabase
		.from("locations")
		.insert({
			organization_id: orgId,
			name: "Test Warehouse",
			location_type: "warehouse",
			address: { street: "1 Test St", city: "NYC", state: "NY", zip: "10001" },
		})
		.select("id")
		.single();
	return data!.id;
}

async function createStore(orgId: string): Promise<string> {
	const { data } = await supabase
		.from("locations")
		.insert({
			organization_id: orgId,
			name: "Test Store",
			location_type: "store",
			address: { street: "2 Store Ave", city: "NYC", state: "NY", zip: "10002" },
		})
		.select("id")
		.single();
	return data!.id;
}

async function createItem(orgId: string, name: string, boxQty: number): Promise<number> {
	const { data } = await supabase
		.from("items")
		.insert({
			organization_id: orgId,
			name,
			sku: `SKU-${name}-${Date.now()}`,
			unit_of_measure: "pcs",
			min_quantity: 0,
			box_quantity: boxQty,
		})
		.select("id")
		.single();
	return data!.id;
}

async function stockItem(
	orgId: string,
	warehouseLocId: string,
	itemId: number,
	boxCount: number,
	piecesPerBox: number,
): Promise<void> {
	const { data: pallet } = await supabase
		.from("warehouse_pallets")
		.insert({
			organization_id: orgId,
			warehouse_location_id: warehouseLocId,
			pallet_label: `P-${crypto.randomUUID().slice(0, 6)}`,
			status: "active",
			received_at: new Date(Date.now() - 86400000).toISOString(),
		})
		.select("id")
		.single();

	await supabase.from("pallet_inventory").insert({
		pallet_id: pallet!.id,
		item_id: itemId,
		box_count: boxCount,
		initial_box_count: boxCount,
		pieces_per_box_override: piecesPerBox,
	});

	await supabase.from("item_locations").upsert({
		item_id: itemId,
		location_id: warehouseLocId,
		current_quantity: boxCount * piecesPerBox,
	});
}

async function createTicket(
	orgId: string,
	storeLocId: string,
	warehouseLocId: string,
	items: Array<{ itemId: number; boxes: number; units: number }>,
): Promise<string> {
	const { data: ticket } = await supabase
		.from("order_tickets")
		.insert({
			organization_id: orgId,
			requesting_location_id: storeLocId,
			warehouse_location_id: warehouseLocId,
			status: "submitted",
			requested_by: "test-store-user",
			submitted_at: new Date().toISOString(),
		})
		.select("id")
		.single();

	await supabase.from("order_ticket_items").insert(
		items.map((i) => ({
			ticket_id: ticket!.id,
			item_id: i.itemId,
			quantity_boxes: i.boxes,
			quantity_units: i.units,
		})),
	);

	return ticket!.id;
}

/** Wipes all test data for a given org — called in afterEach */
async function cleanupOrg(orgId: string): Promise<void> {
	// Cascade deletes via FK constraints handle related rows.
	// Delete in reverse dependency order to be safe.
	await supabase.from("organizations").delete().eq("id", orgId);
}

// Ensure the test admin user exists
beforeAll(async () => {
	await supabase.from("users").upsert({
		id: ADMIN_USER_ID,
		email: "admin@test.local",
		role: "super_admin",
	});
});


// =============================================================================
// TEST 1: Fulfill with sufficient stock → success, quantities deducted
// =============================================================================
describe("fulfill_order_ticket — sufficient stock", () => {
	let orgId: string, warehouseLocId: string, storeLocId: string;
	let itemId: number, ticketId: string;

	beforeEach(async () => {
		orgId          = await createOrg();
		warehouseLocId = await createWarehouse(orgId);
		storeLocId     = await createStore(orgId);
		itemId         = await createItem(orgId, "Nutella", 12);
		await stockItem(orgId, warehouseLocId, itemId, 10, 12); // 10 boxes × 12 pcs
		ticketId = await createTicket(orgId, storeLocId, warehouseLocId, [
			{ itemId, boxes: 3, units: 36 },
		]);
	});
	afterEach(() => cleanupOrg(orgId));

	it("returns success=true", async () => {
		const { data, error } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		expect(error).toBeNull();
		expect(data.success).toBe(true);
	});

	it("sets ticket status to fulfilled", async () => {
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		const { data } = await supabase
			.from("order_tickets")
			.select("status")
			.eq("id", ticketId)
			.single();
		expect(data!.status).toBe("fulfilled");
	});

	it("decrements pallet box_count by the requested amount", async () => {
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		const { data } = await supabase
			.from("pallet_inventory")
			.select("box_count, warehouse_pallets!inner(warehouse_location_id)")
			.eq("item_id", itemId);
		const totalBoxes = data!.reduce((sum, r) => sum + r.box_count, 0);
		expect(totalBoxes).toBe(7); // 10 - 3 = 7
	});

	it("creates a fulfillment_line with correct pieces_per_box_at_time", async () => {
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		const { data: ticketItems } = await supabase
			.from("order_ticket_items")
			.select("id")
			.eq("ticket_id", ticketId);
		const { data: lines } = await supabase
			.from("order_ticket_fulfillment_lines")
			.select("pieces_per_box_at_time, boxes_deducted")
			.eq("order_ticket_item_id", ticketItems![0].id);
		expect(lines).toHaveLength(1);
		expect(lines![0].pieces_per_box_at_time).toBe(12);
		expect(lines![0].boxes_deducted).toBe(3);
	});
});


// =============================================================================
// TEST 2: One item insufficient → full rollback
// =============================================================================
describe("fulfill_order_ticket — insufficient stock", () => {
	let orgId: string, warehouseLocId: string, storeLocId: string;
	let itemAId: number, itemBId: number, ticketId: string;

	beforeEach(async () => {
		orgId          = await createOrg();
		warehouseLocId = await createWarehouse(orgId);
		storeLocId     = await createStore(orgId);
		itemAId        = await createItem(orgId, "Pistachio", 10);
		itemBId        = await createItem(orgId, "Matcha", 10);
		await stockItem(orgId, warehouseLocId, itemAId, 5, 10); // enough
		await stockItem(orgId, warehouseLocId, itemBId, 2, 10); // only 2 boxes
		ticketId = await createTicket(orgId, storeLocId, warehouseLocId, [
			{ itemId: itemAId, boxes: 3, units: 30 },
			{ itemId: itemBId, boxes: 5, units: 50 }, // 5 > 2 available
		]);
	});
	afterEach(() => cleanupOrg(orgId));

	it("returns an error for insufficient stock", async () => {
		const { error } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/insufficient stock/i);
	});

	it("leaves ticket status unchanged", async () => {
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		const { data } = await supabase
			.from("order_tickets")
			.select("status")
			.eq("id", ticketId)
			.single();
		expect(data!.status).toBe("submitted");
	});

	it("does not deduct any stock from either item", async () => {
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		const { data } = await supabase
			.from("pallet_inventory")
			.select("item_id, box_count");
		const itemABoxes = data!.filter((r) => r.item_id === itemAId).reduce((s, r) => s + r.box_count, 0);
		const itemBBoxes = data!.filter((r) => r.item_id === itemBId).reduce((s, r) => s + r.box_count, 0);
		expect(itemABoxes).toBe(5); // unchanged
		expect(itemBBoxes).toBe(2); // unchanged
	});

	it("creates no fulfillment_lines", async () => {
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		const { data: items } = await supabase
			.from("order_ticket_items")
			.select("id")
			.eq("ticket_id", ticketId);
		const itemIds = items!.map((i) => i.id);
		const { count } = await supabase
			.from("order_ticket_fulfillment_lines")
			.select("id", { count: "exact", head: true })
			.in("order_ticket_item_id", itemIds);
		expect(count).toBe(0);
	});
});


// =============================================================================
// TEST 3: Already-fulfilled ticket → error
// =============================================================================
describe("fulfill_order_ticket — already fulfilled", () => {
	let orgId: string, warehouseLocId: string, storeLocId: string, ticketId: string;

	beforeEach(async () => {
		orgId          = await createOrg();
		warehouseLocId = await createWarehouse(orgId);
		storeLocId     = await createStore(orgId);
		const itemId   = await createItem(orgId, "Kunafa", 6);
		await stockItem(orgId, warehouseLocId, itemId, 10, 6);
		const { data } = await supabase
			.from("order_tickets")
			.insert({
				organization_id: orgId,
				requesting_location_id: storeLocId,
				warehouse_location_id: warehouseLocId,
				status: "fulfilled", // already done
				requested_by: "test-user",
			})
			.select("id")
			.single();
		ticketId = data!.id;
	});
	afterEach(() => cleanupOrg(orgId));

	it("returns an error for invalid status", async () => {
		const { error } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/invalid status|fulfilled/i);
	});
});


// =============================================================================
// TEST 4: Cancelled ticket → error
// =============================================================================
describe("fulfill_order_ticket — cancelled ticket", () => {
	let orgId: string, warehouseLocId: string, storeLocId: string, ticketId: string;

	beforeEach(async () => {
		orgId          = await createOrg();
		warehouseLocId = await createWarehouse(orgId);
		storeLocId     = await createStore(orgId);
		const { data } = await supabase
			.from("order_tickets")
			.insert({
				organization_id: orgId,
				requesting_location_id: storeLocId,
				warehouse_location_id: warehouseLocId,
				status: "cancelled",
				requested_by: "test-user",
			})
			.select("id")
			.single();
		ticketId = data!.id;
	});
	afterEach(() => cleanupOrg(orgId));

	it("returns an error for cancelled status", async () => {
		const { error } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/invalid status|cancelled/i);
	});
});


// =============================================================================
// TEST 5: Same ticket called twice → second call errors, stock deducted once
// =============================================================================
describe("fulfill_order_ticket — double fulfillment", () => {
	let orgId: string, warehouseLocId: string, storeLocId: string;
	let itemId: number, ticketId: string;

	beforeEach(async () => {
		orgId          = await createOrg();
		warehouseLocId = await createWarehouse(orgId);
		storeLocId     = await createStore(orgId);
		itemId         = await createItem(orgId, "Waffle", 4);
		await stockItem(orgId, warehouseLocId, itemId, 20, 4);
		ticketId = await createTicket(orgId, storeLocId, warehouseLocId, [
			{ itemId, boxes: 5, units: 20 },
		]);
	});
	afterEach(() => cleanupOrg(orgId));

	it("first call succeeds, second call errors", async () => {
		const first = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		expect(first.error).toBeNull();

		const second = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		expect(second.error).not.toBeNull();
	});

	it("stock is deducted exactly once", async () => {
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		const { data } = await supabase
			.from("pallet_inventory")
			.select("box_count")
			.eq("item_id", itemId);
		const totalBoxes = data!.reduce((s, r) => s + r.box_count, 0);
		expect(totalBoxes).toBe(15); // 20 - 5 = 15, not 20 - 10
	});
});


// =============================================================================
// TEST 6: Two tickets depleting same item → first wins, second errors
// =============================================================================
describe("fulfill_order_ticket — competing tickets", () => {
	let orgId: string, warehouseLocId: string, storeLocId: string;
	let itemId: number, ticketAId: string, ticketBId: string;

	beforeEach(async () => {
		orgId          = await createOrg();
		warehouseLocId = await createWarehouse(orgId);
		storeLocId     = await createStore(orgId);
		itemId         = await createItem(orgId, "Milkshake", 6);
		await stockItem(orgId, warehouseLocId, itemId, 8, 6); // 8 boxes total
		ticketAId = await createTicket(orgId, storeLocId, warehouseLocId, [{ itemId, boxes: 5, units: 30 }]);
		ticketBId = await createTicket(orgId, storeLocId, warehouseLocId, [{ itemId, boxes: 5, units: 30 }]);
	});
	afterEach(() => cleanupOrg(orgId));

	it("first ticket fulfills successfully", async () => {
		const { error } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketAId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		expect(error).toBeNull();
	});

	it("second ticket fails with insufficient stock (only 3 remain after first)", async () => {
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketAId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		const { error } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketBId,
			p_admin_user_id: ADMIN_USER_ID,
		});
		expect(error).not.toBeNull();
		expect(error!.message).toMatch(/insufficient stock/i);
	});

	it("second ticket status remains submitted", async () => {
		await supabase.rpc("fulfill_order_ticket", { p_ticket_id: ticketAId, p_admin_user_id: ADMIN_USER_ID });
		await supabase.rpc("fulfill_order_ticket", { p_ticket_id: ticketBId, p_admin_user_id: ADMIN_USER_ID });
		const { data } = await supabase
			.from("order_tickets")
			.select("status")
			.eq("id", ticketBId)
			.single();
		expect(data!.status).toBe("submitted");
	});
});


// =============================================================================
// TEST 7: Inventory logs created for each item with action_type = 'used'
// =============================================================================
describe("fulfill_order_ticket — inventory logs", () => {
	let orgId: string, warehouseLocId: string, storeLocId: string;
	let itemAId: number, itemBId: number, ticketId: string;

	beforeEach(async () => {
		orgId          = await createOrg();
		warehouseLocId = await createWarehouse(orgId);
		storeLocId     = await createStore(orgId);
		itemAId        = await createItem(orgId, "Spork", 48);
		itemBId        = await createItem(orgId, "Napkin", 100);
		await stockItem(orgId, warehouseLocId, itemAId, 10, 48);
		await stockItem(orgId, warehouseLocId, itemBId, 10, 100);
		ticketId = await createTicket(orgId, storeLocId, warehouseLocId, [
			{ itemId: itemAId, boxes: 2, units: 96  },
			{ itemId: itemBId, boxes: 3, units: 300 },
		]);
		await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
		});
	});
	afterEach(() => cleanupOrg(orgId));

	it("creates at least one inventory_log per item", async () => {
		const { count } = await supabase
			.from("inventory_logs")
			.select("id", { count: "exact", head: true })
			.eq("location_id", warehouseLocId)
			.like("notes", `%${ticketId}%`);
		expect(count).toBeGreaterThanOrEqual(2);
	});

	it("all logs have action_type = used", async () => {
		const { data } = await supabase
			.from("inventory_logs")
			.select("action_type")
			.eq("location_id", warehouseLocId)
			.like("notes", `%${ticketId}%`);
		const allUsed = data!.every((r) => r.action_type === "used");
		expect(allUsed).toBe(true);
	});

	it("all logs have negative quantity_change", async () => {
		const { data } = await supabase
			.from("inventory_logs")
			.select("quantity_change")
			.eq("location_id", warehouseLocId)
			.like("notes", `%${ticketId}%`);
		const allNegative = data!.every((r) => r.quantity_change < 0);
		expect(allNegative).toBe(true);
	});

	it("logs reference the warehouse location, not the store", async () => {
		const { data } = await supabase
			.from("inventory_logs")
			.select("location_id")
			.like("notes", `%${ticketId}%`);
		const uniqueLocations = [...new Set(data!.map((r) => r.location_id))];
		expect(uniqueLocations).toHaveLength(1);
		expect(uniqueLocations[0]).toBe(warehouseLocId);
	});
});


// =============================================================================
// TEST 8: Partial fulfillment — remainder ticket created
// =============================================================================
describe("fulfill_order_ticket — partial fulfillment", () => {
	let orgId: string, warehouseLocId: string, storeLocId: string;
	let itemAId: number, itemBId: number, ticketId: string;

	beforeEach(async () => {
		orgId          = await createOrg();
		warehouseLocId = await createWarehouse(orgId);
		storeLocId     = await createStore(orgId);
		itemAId        = await createItem(orgId, "Pistachio3", 10);
		itemBId        = await createItem(orgId, "Matcha3",    10);
		await stockItem(orgId, warehouseLocId, itemAId, 10, 10); // plenty
		await stockItem(orgId, warehouseLocId, itemBId, 2,  10); // only 2 boxes
		ticketId = await createTicket(orgId, storeLocId, warehouseLocId, [
			{ itemId: itemAId, boxes: 5, units: 50 }, // can fill fully
			{ itemId: itemBId, boxes: 5, units: 50 }, // only 2 available
		]);
	});
	afterEach(() => cleanupOrg(orgId));

	it("returns fulfillment_type = partial", async () => {
		const { data } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
			p_allow_partial: true,
		});
		expect(data.fulfillment_type).toBe("partial");
	});

	it("creates a remainder ticket with status submitted", async () => {
		const { data } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
			p_allow_partial: true,
		});
		const remainderId: string = data.remainder_ticket_id;
		expect(remainderId).toBeTruthy();

		const { data: remainder } = await supabase
			.from("order_tickets")
			.select("status, parent_ticket_id")
			.eq("id", remainderId)
			.single();
		expect(remainder!.status).toBe("submitted");
		expect(remainder!.parent_ticket_id).toBe(ticketId);
	});

	it("remainder has correct unfulfilled box count", async () => {
		const { data } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
			p_allow_partial: true,
		});
		const { data: remainderItems } = await supabase
			.from("order_ticket_items")
			.select("item_id, quantity_boxes")
			.eq("ticket_id", data.remainder_ticket_id);

		const shortItem = remainderItems!.find((r) => r.item_id === itemBId);
		expect(shortItem?.quantity_boxes).toBe(3); // 5 requested - 2 fulfilled = 3
	});

	it("fully-fulfilled item is absent from remainder", async () => {
		const { data } = await supabase.rpc("fulfill_order_ticket", {
			p_ticket_id: ticketId,
			p_admin_user_id: ADMIN_USER_ID,
			p_allow_partial: true,
		});
		const { data: remainderItems } = await supabase
			.from("order_ticket_items")
			.select("item_id")
			.eq("ticket_id", data.remainder_ticket_id);
		const itemAInRemainder = remainderItems!.some((r) => r.item_id === itemAId);
		expect(itemAInRemainder).toBe(false);
	});
});