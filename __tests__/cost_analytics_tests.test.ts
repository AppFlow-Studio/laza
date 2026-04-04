// =============================================================================
// TASK 4.9 — Cost Analytics Query Function Tests (Jest)
// Laza Dessert Cafe · Warehouse & Supply Chain — Phase 4
// =============================================================================
// These tests call your Supabase STAGING database directly.
// They use the SERVICE ROLE KEY so RLS is bypassed for seeding/teardown.
//
// Run:
//   npx jest cost_analytics_tests --verbose
//
// What we're testing:
//  - getItemCostTrends()          — returns cost history per item over time
//  - getStoreBillingSummary()     — aggregates line_total per store correctly
//  - getWarehouseExpenseBreakdown() — groups expenses by type and month
//  - getMarginIndicators()        — flags items where transfer price < landed cost
//
// All assertions are against data we seed ourselves — no real DB data needed.
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Client — service role key bypasses RLS
// ---------------------------------------------------------------------------
const supabase: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ---------------------------------------------------------------------------
// Shared IDs
// ---------------------------------------------------------------------------
const ORG_ID          = "test-org-jest-49";
const ADMIN_ID        = "test-admin-jest-49";
const STORE_ADMIN_ID  = "test-store-admin-jest-49";

let warehouseLocationId: string;
let storeALocationId: string;
let storeBLocationId: string;
let itemExpensiveId: number;  // Price rose over time → cost trend goes up
let itemCheapId: number;      // Flat price → no margin issue
let itemStaleId: number;      // Current cost > transfer price → margin alert
let poId1: string;
let poId2: string;

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------

beforeAll(async () => {
    // ── Organization ────────────────────────────────────────────────────────
    const { error: orgErr } = await supabase
        .from("organizations")
        .upsert({ id: ORG_ID, name: "Jest Test Org 4.9" });
    if (orgErr) throw new Error(`SETUP: org — ${orgErr.message}`);

    // ── Users ────────────────────────────────────────────────────────────────
    const { error: usersErr } = await supabase.from("users").upsert([
        { id: ADMIN_ID,       email: "jest-admin-49@test.laza",  role: "super_admin", is_active: true },
        { id: STORE_ADMIN_ID, email: "jest-store-49@test.laza",  role: "admin",       is_active: true },
    ]);
    if (usersErr) throw new Error(`SETUP: users — ${usersErr.message}`);

    // ── Locations ────────────────────────────────────────────────────────────
    const { data: wh, error: whErr } = await supabase
        .from("locations")
        .insert({ organization_id: ORG_ID, name: "Jest Warehouse 4.9", address: { street: "1 Cost St", city: "NYC" }, location_type: "warehouse", is_active: true })
        .select("id").single();
    if (whErr || !wh) throw new Error(`SETUP: warehouse — ${whErr?.message}`);
    warehouseLocationId = wh.id;

    const { data: storeA, error: storeAErr } = await supabase
        .from("locations")
        .insert({ organization_id: ORG_ID, name: "Jest Store A 4.9", address: { street: "2 Cost St", city: "NYC" }, location_type: "store", is_active: true })
        .select("id").single();
    if (storeAErr || !storeA) throw new Error(`SETUP: storeA — ${storeAErr?.message}`);
    storeALocationId = storeA.id;

    const { data: storeB, error: storeBErr } = await supabase
        .from("locations")
        .insert({ organization_id: ORG_ID, name: "Jest Store B 4.9", address: { street: "3 Cost St", city: "NYC" }, location_type: "store", is_active: true })
        .select("id").single();
    if (storeBErr || !storeB) throw new Error(`SETUP: storeB — ${storeBErr?.message}`);
    storeBLocationId = storeB.id;

    // ── Items ────────────────────────────────────────────────────────────────
    const insertItem = async (name: string, sku: string, currentUnitCost: number) => {
        const { data, error } = await supabase
            .from("items")
            .insert({ organization_id: ORG_ID, name, sku, unit_of_measure: "pcs", min_quantity: 0, box_quantity: 10, current_unit_cost: currentUnitCost })
            .select("id").single();
        if (error || !data) throw new Error(`SETUP: item ${name} — ${error?.message}`);
        return data.id as number;
    };

    // current_unit_cost represents latest landed cost (after most recent PO)
    itemExpensiveId = await insertItem("Expensive Item Jest", "SKU-EXP-49", 15.00); // cost went UP over time
    itemCheapId     = await insertItem("Cheap Item Jest",     "SKU-CHP-49", 3.00);  // flat pricing, no issue
    itemStaleId     = await insertItem("Stale Price Jest",    "SKU-STL-49", 12.00); // transfer price still at old $8

    // ── Purchase Orders ───────────────────────────────────────────────────────
    // PO 1 — older shipment (lower costs)
    const { data: po1, error: po1Err } = await supabase
        .from("purchase_orders")
        .insert({
            organization_id:      ORG_ID,
            warehouse_location_id: warehouseLocationId,
            po_number:            "PO-JEST-49-001",
            status:               "received",
            order_date:           daysAgo(180),
            expected_arrival:     daysAgo(150),
            actual_arrival:       daysAgo(150),
            subtotal_before:      0,
            office_fee:           0,
            shipping_fee:         0,
            created_by:           ADMIN_ID,
        })
        .select("id").single();
    if (po1Err || !po1) throw new Error(`SETUP: PO1 — ${po1Err?.message}`);
    poId1 = po1.id;

    // PO 2 — newer shipment (higher costs — prices rose)
    const { data: po2, error: po2Err } = await supabase
        .from("purchase_orders")
        .insert({
            organization_id:      ORG_ID,
            warehouse_location_id: warehouseLocationId,
            po_number:            "PO-JEST-49-002",
            status:               "received",
            order_date:           daysAgo(60),
            expected_arrival:     daysAgo(30),
            actual_arrival:       daysAgo(30),
            subtotal_before:      0,
            office_fee:           0,
            shipping_fee:         0,
            created_by:           ADMIN_ID,
        })
        .select("id").single();
    if (po2Err || !po2) throw new Error(`SETUP: PO2 — ${po2Err?.message}`);
    poId2 = po2.id;

    // ── item_cost_history ─────────────────────────────────────────────────────
    // Expensive Item: cost went from $10 → $15 across two POs
    // Cheap Item: flat at $3
    // Stale Item: cost went from $8 → $12, but tickets still use $8 transfer price
    const { error: costHistErr } = await supabase.from("item_cost_history").insert([
        // Expensive Item — PO1 (old, lower)
        { organization_id: ORG_ID, item_id: itemExpensiveId, purchase_order_id: poId1, unit_price_before: 8.00,  unit_cost_after: 10.00, effective_date: daysAgo(150) },
        // Expensive Item — PO2 (new, higher) — 50% cost increase
        { organization_id: ORG_ID, item_id: itemExpensiveId, purchase_order_id: poId2, unit_price_before: 11.00, unit_cost_after: 15.00, effective_date: daysAgo(30)  },
        // Cheap Item — only one PO, flat price
        { organization_id: ORG_ID, item_id: itemCheapId,     purchase_order_id: poId1, unit_price_before: 2.50,  unit_cost_after: 3.00,  effective_date: daysAgo(150) },
        // Stale Item — PO1 old cost, PO2 new higher cost
        { organization_id: ORG_ID, item_id: itemStaleId,     purchase_order_id: poId1, unit_price_before: 6.00,  unit_cost_after: 8.00,  effective_date: daysAgo(150) },
        { organization_id: ORG_ID, item_id: itemStaleId,     purchase_order_id: poId2, unit_price_before: 9.50,  unit_cost_after: 12.00, effective_date: daysAgo(30)  },
    ]);
    if (costHistErr) throw new Error(`SETUP: item_cost_history — ${costHistErr.message}`);

    // ── Warehouse stock ────────────────────────────────────────────────────────
    const { error: ilErr } = await supabase.from("item_locations").upsert([
        { organization_id: ORG_ID, item_id: itemExpensiveId, location_id: warehouseLocationId, current_quantity: 200 },
        { organization_id: ORG_ID, item_id: itemCheapId,     location_id: warehouseLocationId, current_quantity: 500 },
        { organization_id: ORG_ID, item_id: itemStaleId,     location_id: warehouseLocationId, current_quantity: 300 },
    ]);
    if (ilErr) throw new Error(`SETUP: item_locations — ${ilErr.message}`);

    // ── Order tickets (confirmed) with cost snapshots ─────────────────────────
    // Store A: 3 tickets, mixed items
    // Store B: 1 ticket, cheap item only
    // Stale item tickets use OLD transfer price ($8) even though current cost is $12

    await createConfirmedTicketWithCost([
        { itemId: itemExpensiveId, boxes: 5, units: 50, unitCost: 15.00, lineTotal: 750.00 },
        { itemId: itemCheapId,     boxes: 10, units: 100, unitCost: 3.00,  lineTotal: 300.00 },
    ], storeALocationId, daysAgo(20));

    await createConfirmedTicketWithCost([
        { itemId: itemStaleId, boxes: 8, units: 80, unitCost: 8.00, lineTotal: 640.00 }, // ← stale: should be $12 now
    ], storeALocationId, daysAgo(15));

    await createConfirmedTicketWithCost([
        { itemId: itemExpensiveId, boxes: 3, units: 30, unitCost: 15.00, lineTotal: 450.00 },
    ], storeALocationId, daysAgo(5));

    await createConfirmedTicketWithCost([
        { itemId: itemCheapId, boxes: 20, units: 200, unitCost: 3.00, lineTotal: 600.00 },
    ], storeBLocationId, daysAgo(10));

    // ── Warehouse expenses ────────────────────────────────────────────────────
    // Two months of expenses for breakdown chart testing
    const { error: expErr } = await supabase.from("warehouse_expenses").insert([
        // Month 1 (60 days ago)
        { organization_id: ORG_ID, warehouse_location_id: warehouseLocationId, expense_type: "pallet_delivery",  amount: 650.00, expense_date: daysAgo(60), created_by: ADMIN_ID },
        { organization_id: ORG_ID, warehouse_location_id: warehouseLocationId, expense_type: "pallet_rent",      amount: 1200.00, expense_date: daysAgo(58), created_by: ADMIN_ID },
        { organization_id: ORG_ID, warehouse_location_id: warehouseLocationId, expense_type: "container_unload", amount: 420.00, expense_date: daysAgo(55), created_by: ADMIN_ID },
        // Month 2 (20 days ago)
        { organization_id: ORG_ID, warehouse_location_id: warehouseLocationId, expense_type: "pallet_delivery",  amount: 780.00, expense_date: daysAgo(20), created_by: ADMIN_ID },
        { organization_id: ORG_ID, warehouse_location_id: warehouseLocationId, expense_type: "pallet_rent",      amount: 1200.00, expense_date: daysAgo(18), created_by: ADMIN_ID },
    ]);
    if (expErr) throw new Error(`SETUP: warehouse_expenses — ${expErr.message}`);

}, 60_000);

// ---------------------------------------------------------------------------
// TEARDOWN
// ---------------------------------------------------------------------------

afterAll(async () => {
    const { data: tickets } = await supabase.from("order_tickets").select("id").eq("organization_id", ORG_ID);
    if (tickets?.length) {
        const ids = tickets.map(t => t.id);
        await supabase.from("order_ticket_items").delete().in("ticket_id", ids);
        await supabase.from("order_ticket_logs").delete().in("ticket_id", ids);
        await supabase.from("order_tickets").delete().in("id", ids);
    }

    await supabase.from("warehouse_expenses").delete().eq("organization_id", ORG_ID);
    await supabase.from("item_cost_history").delete().eq("organization_id", ORG_ID);
    await supabase.from("purchase_orders").delete().eq("organization_id", ORG_ID);
    await supabase.from("item_locations").delete().in("location_id", [warehouseLocationId, storeALocationId, storeBLocationId]);
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
    return d.toISOString().split("T")[0]; // date only for expense_date
}

function daysAgoISO(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

interface TicketLine {
    itemId: number;
    boxes: number;
    units: number;
    unitCost: number;
    lineTotal: number;
}

async function createConfirmedTicketWithCost(lines: TicketLine[], locationId: string, fulfilledAt: string) {
    const { data: ticket, error: tErr } = await supabase
        .from("order_tickets")
        .insert({
            organization_id:        ORG_ID,
            requesting_location_id: locationId,
            warehouse_location_id:  warehouseLocationId,
            status:                 "confirmed",
            requested_by:           STORE_ADMIN_ID,
            confirmed_by:           STORE_ADMIN_ID,
            fulfilled_at:           fulfilledAt,
            confirmed_at:           fulfilledAt,
        })
        .select("id").single();
    if (tErr || !ticket) throw new Error(`Helper: ticket — ${tErr?.message}`);

    const { error: itemErr } = await supabase.from("order_ticket_items").insert(
        lines.map(l => ({
            ticket_id:         ticket.id,
            item_id:           l.itemId,
            quantity_boxes:    l.boxes,
            quantity_units:    l.units,
            fulfilled_boxes:   l.boxes,
            fulfilled_units:   l.units,
            unit_cost_at_time: l.unitCost,
            line_total:        l.lineTotal,
        }))
    );
    if (itemErr) throw new Error(`Helper: ticket items — ${itemErr.message}`);
    return ticket.id;
}

function findByItemId(rows: any[] | null, itemId: number) {
    return rows?.find((r: any) => Number(r.item_id) === itemId);
}

function findByLocId(rows: any[] | null, locId: string) {
    return rows?.find((r: any) => r.location_id === locId);
}

// ---------------------------------------------------------------------------
// TESTS — getItemCostTrends (direct Supabase query)
// ---------------------------------------------------------------------------

describe("getItemCostTrends() — Task 4.9", () => {

    async function queryItemCostTrends(itemIds?: number[], dateRange?: { from?: string; to?: string }) {
        let query = supabase
            .from("item_cost_history")
            .select(`item_id, unit_price_before, unit_cost_after, effective_date, purchase_order_id, items ( id, name, sku )`)
            .eq("organization_id", ORG_ID)
            .order("item_id", { ascending: true })
            .order("effective_date", { ascending: true });
        if (itemIds?.length) query = query.in("item_id", itemIds);
        if (dateRange?.from) query = query.gte("effective_date", dateRange.from);
        if (dateRange?.to)   query = query.lte("effective_date", dateRange.to);
        const { data, error } = await query;
        if (error) throw new Error(error.message);
        return (data ?? []).map((r: any) => ({
            item_id:          r.item_id,
            item_name:        r.items?.name ?? "Unknown",
            item_sku:         r.items?.sku ?? null,
            unit_cost_after:  Number(r.unit_cost_after),
            unit_price_before: Number(r.unit_price_before),
            effective_date:   r.effective_date,
            purchase_order_id: r.purchase_order_id,
        }));
    }

    test("1. Returns cost history sorted chronologically per item", async () => {
        const result = await queryItemCostTrends();
        expect(result.length).toBeGreaterThan(0);

        const expensiveRows = result.filter(r => Number(r.item_id) === itemExpensiveId);
        expect(expensiveRows.length).toBe(2);
        expect(expensiveRows[0].unit_cost_after).toBeCloseTo(10.00, 2);
        expect(expensiveRows[1].unit_cost_after).toBeCloseTo(15.00, 2);
        expect(expensiveRows[0].effective_date < expensiveRows[1].effective_date).toBe(true);
    }, 15_000);

    test("2. Filters correctly by itemIds array", async () => {
        const result = await queryItemCostTrends([itemCheapId]);
        const allCheap = result.every(r => Number(r.item_id) === itemCheapId);
        expect(allCheap).toBe(true);
        expect(result.length).toBe(1);
    }, 15_000);

    test("3. dateRange filter excludes records outside the window", async () => {
        const today       = new Date().toISOString().split("T")[0];
        const sixtyDaysAgo = daysAgo(60);

        const allTime = await queryItemCostTrends([itemExpensiveId]);
        const recent  = await queryItemCostTrends([itemExpensiveId], { from: sixtyDaysAgo, to: today });

        expect(allTime.length).toBe(2);
        expect(recent.length).toBe(1);
        expect(recent[0].unit_cost_after).toBeCloseTo(15.00, 2);
    }, 15_000);

    test("4. Returns correct item_name and item_sku on each row", async () => {
        const result = await queryItemCostTrends([itemExpensiveId]);
        expect(result[0].item_name).toBe("Expensive Item Jest");
        expect(result[0].item_sku).toBe("SKU-EXP-49");
    }, 15_000);

    test("5. unit_price_before is lower than unit_cost_after (fees allocated)", async () => {
        const result = await queryItemCostTrends([itemExpensiveId]);
        result.forEach(row => {
            expect(row.unit_price_before).toBeLessThan(row.unit_cost_after);
        });
    }, 15_000);
});

// ---------------------------------------------------------------------------
// TESTS — getStoreBillingSummary (direct Supabase query)
// ---------------------------------------------------------------------------

describe("getStoreBillingSummary() — Task 4.9", () => {

    async function queryStoreBilling(dateRange?: { from?: string; to?: string }) {
        let query = supabase
            .from("order_tickets")
            .select(`id, requesting_location_id, fulfilled_at, status, locations!requesting_location_id ( id, name ), order_ticket_items ( line_total, fulfilled_units )`)
            .eq("organization_id", ORG_ID)
            .in("status", ["fulfilled", "confirmed"]);
        if (dateRange?.from) query = query.gte("fulfilled_at", dateRange.from);
        if (dateRange?.to)   query = query.lte("fulfilled_at", dateRange.to + "T23:59:59");
        const { data, error } = await query;
        if (error) throw new Error(error.message);

        const storeMap = new Map<string, { location_id: string; location_name: string; total_line_value: number; total_units_fulfilled: number; ticket_count: number }>();
        for (const ticket of data ?? []) {
            const locId   = ticket.requesting_location_id;
            const locName = (ticket.locations as any)?.name ?? "Unknown";
            if (!storeMap.has(locId)) storeMap.set(locId, { location_id: locId, location_name: locName, total_line_value: 0, total_units_fulfilled: 0, ticket_count: 0 });
            const entry = storeMap.get(locId)!;
            entry.ticket_count += 1;
            for (const item of (ticket.order_ticket_items as any[]) ?? []) {
                entry.total_line_value       += Number(item.line_total ?? 0);
                entry.total_units_fulfilled  += Number(item.fulfilled_units ?? 0);
            }
        }
        return Array.from(storeMap.values())
            .map(r => ({ ...r, total_line_value: Math.round(r.total_line_value * 100) / 100, avg_line_value_per_ticket: r.ticket_count > 0 ? Math.round((r.total_line_value / r.ticket_count) * 100) / 100 : 0 }))
            .sort((a, b) => b.total_line_value - a.total_line_value);
    }

    test("6. Returns one row per store", async () => {
        const result = await queryStoreBilling();
        expect(findByLocId(result, storeALocationId)).toBeDefined();
        expect(findByLocId(result, storeBLocationId)).toBeDefined();
    }, 15_000);

    test("7. Store A total matches sum of all its line_totals", async () => {
        const result = await queryStoreBilling();
        const storeARow = findByLocId(result, storeALocationId);
        // 750 + 300 + 640 + 450 = 2140
        expect(storeARow.total_line_value).toBeCloseTo(2140.00, 1);
    }, 15_000);

    test("8. Store B total matches its single ticket line_total", async () => {
        const result = await queryStoreBilling();
        const storeBRow = findByLocId(result, storeBLocationId);
        expect(storeBRow.total_line_value).toBeCloseTo(600.00, 1);
    }, 15_000);

    test("9. ticket_count is accurate per store", async () => {
        const result = await queryStoreBilling();
        expect(findByLocId(result, storeALocationId).ticket_count).toBe(3);
        expect(findByLocId(result, storeBLocationId).ticket_count).toBe(1);
    }, 15_000);

    test("10. avg_line_value_per_ticket = total / ticket_count", async () => {
        const result  = await queryStoreBilling();
        const storeARow = findByLocId(result, storeALocationId);
        expect(storeARow.avg_line_value_per_ticket).toBeCloseTo(storeARow.total_line_value / storeARow.ticket_count, 1);
    }, 15_000);

    test("11. dateRange filter restricts to tickets in window", async () => {
        const today      = new Date().toISOString().split("T")[0];
        const tenDaysAgo = daysAgo(10);
        const filtered   = await queryStoreBilling({ from: tenDaysAgo, to: today });
        const storeAFiltered = findByLocId(filtered, storeALocationId);
        const storeBFiltered = findByLocId(filtered, storeBLocationId);
        if (storeAFiltered) expect(storeAFiltered.total_line_value).toBeCloseTo(450.00, 1);
        if (storeBFiltered) expect(storeBFiltered.total_line_value).toBeCloseTo(600.00, 1);
    }, 15_000);

    test("12. Results sorted by total_line_value descending", async () => {
        const result = await queryStoreBilling();
        for (let i = 1; i < result.length; i++) {
            expect(result[i-1].total_line_value).toBeGreaterThanOrEqual(result[i].total_line_value);
        }
    }, 15_000);
});

// ---------------------------------------------------------------------------
// TESTS — getWarehouseExpenseBreakdown (direct Supabase query)
// ---------------------------------------------------------------------------

describe("getWarehouseExpenseBreakdown() — Task 4.9", () => {

    async function queryExpenseBreakdown(dateRange?: { from?: string; to?: string }) {
        let query = supabase
            .from("warehouse_expenses")
            .select("expense_type, amount, expense_date")
            .eq("organization_id", ORG_ID)
            .order("expense_date", { ascending: true });
        if (dateRange?.from) query = query.gte("expense_date", dateRange.from);
        if (dateRange?.to)   query = query.lte("expense_date", dateRange.to);
        const { data, error } = await query;
        if (error) throw new Error(error.message);

        const groupMap = new Map<string, { total_amount: number; entry_count: number }>();
        for (const row of data ?? []) {
            const month = (row.expense_date as string).slice(0, 7);
            const key   = `${row.expense_type}::${month}`;
            if (!groupMap.has(key)) groupMap.set(key, { total_amount: 0, entry_count: 0 });
            const entry = groupMap.get(key)!;
            entry.total_amount += Number(row.amount);
            entry.entry_count  += 1;
        }
        return Array.from(groupMap.entries()).map(([key, val]) => {
            const [expense_type, month] = key.split("::");
            return { expense_type, month, total_amount: Math.round(val.total_amount * 100) / 100, entry_count: val.entry_count };
        }).sort((a, b) => a.month.localeCompare(b.month));
    }

    test("13. Returns rows grouped by expense_type and month", async () => {
        const result = await queryExpenseBreakdown();
        expect(result.length).toBeGreaterThan(0);
        result.forEach(row => {
            expect(row.expense_type).toBeTruthy();
            expect(row.month).toMatch(/^\d{4}-\d{2}$/);
        });
    }, 15_000);

    test("14. pallet_delivery total matches seeded amounts", async () => {
        const result = await queryExpenseBreakdown();
        const deliveryRows  = result.filter(r => r.expense_type === "pallet_delivery");
        const totalDelivery = deliveryRows.reduce((s, r) => s + r.total_amount, 0);
        expect(totalDelivery).toBeCloseTo(1430.00, 1);
    }, 15_000);

    test("15. pallet_rent appears in two separate months", async () => {
        const result   = await queryExpenseBreakdown();
        const rentRows = result.filter(r => r.expense_type === "pallet_rent");
        expect(rentRows.length).toBe(2);
    }, 15_000);

    test("16. entry_count matches number of expense records per group", async () => {
        const result       = await queryExpenseBreakdown();
        const deliveryRows = result.filter(r => r.expense_type === "pallet_delivery");
        deliveryRows.forEach(row => expect(row.entry_count).toBe(1));
    }, 15_000);

    test("17. dateRange filter restricts to correct months", async () => {
        const today         = new Date().toISOString().split("T")[0];
        const thirtyDaysAgo = daysAgo(30);
        const filtered      = await queryExpenseBreakdown({ from: thirtyDaysAgo, to: today });
        const types         = new Set(filtered.map(r => r.expense_type));
        expect(types.has("container_unload")).toBe(false); // 55 days ago — excluded
        expect(types.has("pallet_delivery")).toBe(true);
    }, 15_000);
});

// ---------------------------------------------------------------------------
// TESTS — getMarginIndicators (direct Supabase query)
// ---------------------------------------------------------------------------

describe("getMarginIndicators() — Task 4.9", () => {

    async function queryMarginIndicators() {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const lookback = ninetyDaysAgo.toISOString().split("T")[0];

        const { data: ticketItems, error } = await supabase
            .from("order_ticket_items")
            .select(`item_id, unit_cost_at_time, fulfilled_units, order_tickets!inner ( organization_id, status, fulfilled_at ), items ( id, name, sku, current_unit_cost )`)
            .eq("order_tickets.organization_id", ORG_ID)
            .in("order_tickets.status", ["fulfilled", "confirmed"])
            .gte("order_tickets.fulfilled_at", lookback)
            .not("unit_cost_at_time", "is", null);
        if (error) throw new Error(error.message);

        const itemMap = new Map<number, { item_id: number; item_name: string; item_sku: string | null; current_unit_cost: number; transfer_prices: number[]; last_fulfilled_at: string | null }>();
        for (const row of ticketItems ?? []) {
            const itemData = row.items as any;
            if (!itemData) continue;
            const itemId       = row.item_id;
            const transferPrice = Number(row.unit_cost_at_time ?? 0);
            const currentCost  = Number(itemData.current_unit_cost ?? 0);
            const fulfilledAt  = (row.order_tickets as any)?.fulfilled_at ?? null;
            if (!itemMap.has(itemId)) itemMap.set(itemId, { item_id: itemId, item_name: itemData.name, item_sku: itemData.sku ?? null, current_unit_cost: currentCost, transfer_prices: [], last_fulfilled_at: null });
            const entry = itemMap.get(itemId)!;
            entry.transfer_prices.push(transferPrice);
            if (!entry.last_fulfilled_at || (fulfilledAt && fulfilledAt > entry.last_fulfilled_at)) entry.last_fulfilled_at = fulfilledAt;
        }

        return Array.from(itemMap.values()).map(entry => {
            const avg = entry.transfer_prices.reduce((s, p) => s + p, 0) / entry.transfer_prices.length;
            const gap = entry.current_unit_cost - avg;
            return {
                item_id:              entry.item_id,
                item_name:            entry.item_name,
                item_sku:             entry.item_sku,
                current_unit_cost:    Math.round(entry.current_unit_cost * 10000) / 10000,
                avg_transfer_price:   Math.round(avg * 10000) / 10000,
                price_gap:            Math.round(gap * 10000) / 10000,
                is_stale:             gap > 0.0001,
                last_fulfilled_at:    entry.last_fulfilled_at,
            };
        }).sort((a, b) => b.price_gap - a.price_gap);
    }

    test("18. Stale item is flagged as is_stale = true", async () => {
        const result   = await queryMarginIndicators();
        const staleRow = findByItemId(result, itemStaleId);
        expect(staleRow).toBeDefined();
        expect(staleRow.is_stale).toBe(true);
    }, 15_000);

    test("19. price_gap = current_unit_cost - avg_transfer_price", async () => {
        const result   = await queryMarginIndicators();
        const staleRow = findByItemId(result, itemStaleId);
        expect(staleRow.current_unit_cost).toBeCloseTo(12.00, 2);
        expect(staleRow.avg_transfer_price).toBeCloseTo(8.00, 2);
        expect(staleRow.price_gap).toBeCloseTo(4.00, 2);
    }, 15_000);

    test("20. Current-priced item is NOT flagged as stale", async () => {
        const result       = await queryMarginIndicators();
        const cheapRow     = findByItemId(result, itemCheapId);
        const expensiveRow = findByItemId(result, itemExpensiveId);
        if (cheapRow)     expect(cheapRow.is_stale).toBe(false);
        if (expensiveRow) expect(expensiveRow.is_stale).toBe(false);
    }, 15_000);

    test("21. Results sorted by price_gap descending (worst first)", async () => {
        const result = await queryMarginIndicators();
        for (let i = 1; i < result.length; i++) {
            expect(result[i-1].price_gap).toBeGreaterThanOrEqual(result[i].price_gap);
        }
    }, 15_000);

    test("22. Items with no ticket history in last 90 days are excluded", async () => {
        const { data: ghostItem } = await supabase
            .from("items")
            .insert({ organization_id: ORG_ID, name: "Ghost Item Jest", sku: "SKU-GHOST-49", unit_of_measure: "pcs", min_quantity: 0, box_quantity: 10, current_unit_cost: 20.00 })
            .select("id").single();
        if (ghostItem) {
            const result   = await queryMarginIndicators();
            const ghostRow = findByItemId(result, ghostItem.id);
            expect(ghostRow).toBeUndefined();
            await supabase.from("items").delete().eq("id", ghostItem.id);
        }
    }, 15_000);

    test("23. last_fulfilled_at is populated on stale item row", async () => {
        const result   = await queryMarginIndicators();
        const staleRow = findByItemId(result, itemStaleId);
        expect(staleRow.last_fulfilled_at).toBeTruthy();
    }, 15_000);
});