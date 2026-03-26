// =============================================================================
// TASK 3.14 — Fulfillment Unit Tests (Jest)
// Laza Dessert Cafe · Warehouse & Supply Chain
// Schema Revision v2 (Mar 12 2026)
// =============================================================================
// These tests call your Supabase STAGING database directly.
// They use the SERVICE ROLE KEY so RLS is bypassed for seeding/teardown.
//
// Run:
//   npx jest fulfill_order_ticket --verbose
//
// Key v2 facts that affect these tests:
//  - pallet_inventory is the source of truth. The DEFERRED sync trigger
//    recalculates item_locations.current_quantity at COMMIT.
//  - fulfill_order_ticket signature:
//      fulfill_order_ticket(p_ticket_id, p_admin_user_id, p_delivery_type)
//      p_delivery_type: 'company' | 'self'
//  - 'company' delivery: RPC transitions ticket → fulfilled / in_transit
//  - 'self' delivery:    RPC transitions ticket → fulfilled / delivered
//  - Boxes are deducted from pallet_inventory FIFO by received_at.
//  - Each deduction creates rows in order_ticket_fulfillment_lines.
//  - inventory_logs entries created per item, action_type = 'used'.
//  - pallet_operations_log entries created per deduction.
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Client — MUST use service role key to bypass RLS for test seeding/teardown.
// Using the anon key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) respects RLS and
// will fail with "violates row-level security policy" even when the column exists.
// ---------------------------------------------------------------------------
const supabase: SupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------------------------------------------------------------------------
// Shared IDs — stable across all tests in this suite
// ---------------------------------------------------------------------------
const ORG_ID         = "test-org-jest-314";
const ADMIN_ID       = "test-admin-jest-314";
const STORE_ADMIN_ID = "test-store-admin-jest-314";

let warehouseLocationId: string;
let storeLocationId: string;
let itemPistachio: number; // 10 boxes × 50 ppb = 500 pcs
let itemNutella: number;   //  2 boxes × 24 ppb =  48 pcs  (limited — used for rollback test)
let itemKunafa: number;    //  6 boxes × 40 ppb = 240 pcs  (min_quantity=200 → alert fires)
let palletId: string;      // single test pallet holding all three items

// ---------------------------------------------------------------------------
// SETUP
// ---------------------------------------------------------------------------

beforeAll(async () => {
  // ── Organization ──────────────────────────────────────────────────────────
  const { error: orgErr } = await supabase
      .from("organizations")
      .upsert({ id: ORG_ID, name: "Jest Test Org 3.14" });
  if (orgErr) throw new Error(`SETUP: org upsert failed — ${orgErr.message}`);

  // ── Users ─────────────────────────────────────────────────────────────────
  const { error: usersErr } = await supabase.from("users").upsert([
    { id: ADMIN_ID,       email: "jest-admin@test.laza",  role: "super_admin", is_active: true },
    { id: STORE_ADMIN_ID, email: "jest-store@test.laza",  role: "admin",       is_active: true },
  ]);
  if (usersErr) throw new Error(`SETUP: users upsert failed — ${usersErr.message}`);

  // ── Warehouse location ────────────────────────────────────────────────────
  const { data: wh, error: whErr } = await supabase
      .from("locations")
      .insert({
        organization_id: ORG_ID,
        name:            "Jest Warehouse 314",
        address:         { street: "1 Jest St", city: "NYC" },
        location_type:   "warehouse",
      })
      .select("id")
      .single();
  if (whErr || !wh) {
    throw new Error(
        `SETUP FAILED — warehouse location insert: ${whErr?.message}\n` +
        `Verify: SELECT column_name FROM information_schema.columns\n` +
        `WHERE table_name = 'locations' AND column_name = 'location_type';`
    );
  }
  warehouseLocationId = wh.id;

  // ── Store location ────────────────────────────────────────────────────────
  const { data: store, error: storeErr } = await supabase
      .from("locations")
      .insert({
        organization_id: ORG_ID,
        name:            "Jest Store 314",
        address:         { street: "2 Jest St", city: "NYC" },
        location_type:   "store",
      })
      .select("id")
      .single();
  if (storeErr || !store) throw new Error(`SETUP: store location failed — ${storeErr?.message}`);
  storeLocationId = store.id;

  // ── Items ─────────────────────────────────────────────────────────────────
  // box_quantity is the fallback pieces_per_box used by the sync trigger when
  // no PO line or pallet override is present.
  const { data: pc, error: pcErr } = await supabase
      .from("items")
      .insert({
        organization_id: ORG_ID, name: "Pistachio Cream Jest", sku: "SKU-PC-JEST",
        unit_of_measure: "pcs",  min_quantity: 10,  box_quantity: 50,
      })
      .select("id").single();
  if (pcErr || !pc) throw new Error(`SETUP: pistachio insert — ${pcErr?.message}`);
  itemPistachio = pc.id;

  const { data: nt, error: ntErr } = await supabase
      .from("items")
      .insert({
        organization_id: ORG_ID, name: "Nutella Jest",         sku: "SKU-NT-JEST",
        unit_of_measure: "pcs",  min_quantity: 5,   box_quantity: 24,
      })
      .select("id").single();
  if (ntErr || !nt) throw new Error(`SETUP: nutella insert — ${ntErr?.message}`);
  itemNutella = nt.id;

  const { data: kd, error: kdErr } = await supabase
      .from("items")
      .insert({
        organization_id: ORG_ID, name: "Kunafa Dough Jest",    sku: "SKU-KD-JEST",
        unit_of_measure: "pcs",  min_quantity: 200, box_quantity: 40, // high threshold
      })
      .select("id").single();
  if (kdErr || !kd) throw new Error(`SETUP: kunafa insert — ${kdErr?.message}`);
  itemKunafa = kd.id;

  // ── Warehouse pallet (v2 schema) ─────────────────────────────────────────
  // purchase_order_id is nullable — these are locally-sourced test items.
  const { data: pallet, error: palletErr } = await supabase
      .from("warehouse_pallets")
      .insert({
        organization_id:       ORG_ID,
        warehouse_location_id: warehouseLocationId,
        pallet_label:          "JEST-P001",
        status:                "active",
        received_at:           new Date().toISOString(),
      })
      .select("id")
      .single();
  if (palletErr || !pallet) throw new Error(`SETUP: warehouse_pallets insert — ${palletErr?.message}`);
  palletId = pallet.id;

  // ── Pallet inventory (v2 schema) ─────────────────────────────────────────
  // purchase_order_item_id is nullable (no PO for test items).
  // pieces_per_box_override is set so the sync trigger can resolve ppb using
  // the level-1 override without needing a linked PO line.
  //   Resolution order: pieces_per_box_override → PO pieces_per_box → items.box_quantity
  const { error: piErr } = await supabase.from("pallet_inventory").insert([
    { pallet_id: palletId, item_id: itemPistachio, box_count: 10, initial_box_count: 10, pieces_per_box_override: 50 },
    { pallet_id: palletId, item_id: itemNutella,   box_count: 2,  initial_box_count: 2,  pieces_per_box_override: 24 },
    { pallet_id: palletId, item_id: itemKunafa,    box_count: 6,  initial_box_count: 6,  pieces_per_box_override: 40 },
  ]);
  if (piErr) throw new Error(`SETUP: pallet_inventory insert — ${piErr.message}`);

  // ── item_locations baseline ───────────────────────────────────────────────
  // The deferred sync trigger will maintain these going forward, but we seed
  // them explicitly so they exist before the first RPC call and so resetStock()
  // can restore them between tests with a simple UPDATE.
  const { error: ilErr } = await supabase.from("item_locations").upsert([
    { organization_id: ORG_ID, item_id: itemPistachio, location_id: warehouseLocationId, current_quantity: 500 },
    { organization_id: ORG_ID, item_id: itemNutella,   location_id: warehouseLocationId, current_quantity: 48  },
    { organization_id: ORG_ID, item_id: itemKunafa,    location_id: warehouseLocationId, current_quantity: 240 },
  ]);
  if (ilErr) throw new Error(`SETUP: item_locations insert — ${ilErr.message}`);

}, 30_000);

// ---------------------------------------------------------------------------
// TEARDOWN
// ---------------------------------------------------------------------------

afterAll(async () => {
  // Collect all test tickets to cascade-delete their children
  const { data: tickets } = await supabase
      .from("order_tickets")
      .select("id")
      .eq("organization_id", ORG_ID);

  if (tickets?.length) {
    const ticketIds = tickets.map((t) => t.id);

    // order_ticket_fulfillment_lines keys on order_ticket_item_id, not ticket_id
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

  await supabase.from("pallet_operations_log").delete().eq("organization_id", ORG_ID);
  await supabase.from("pallet_inventory").delete().eq("pallet_id", palletId);
  await supabase.from("warehouse_pallets").delete().eq("organization_id", ORG_ID);
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

/** Create a submitted order ticket with line items. Returns the ticket ID. */
async function createTicket(
    items: Array<{ itemId: number; boxes: number; units: number }>
): Promise<string> {
  const { data: ticket, error } = await supabase
      .from("order_tickets")
      .insert({
        organization_id:        ORG_ID,
        requesting_location_id: storeLocationId,
        warehouse_location_id:  warehouseLocationId,
        status:                 "submitted",
        requested_by:           STORE_ADMIN_ID,
      })
      .select("id")
      .single();
  if (error || !ticket) throw new Error(`createTicket failed: ${error?.message}`);

  const { error: itemsErr } = await supabase.from("order_ticket_items").insert(
      items.map((i) => ({
        ticket_id:      ticket.id,
        item_id:        i.itemId,
        quantity_boxes: i.boxes,
        quantity_units: i.units,
      }))
  );
  if (itemsErr) throw new Error(`createTicket — items insert failed: ${itemsErr.message}`);

  return ticket.id;
}

/**
 * Delete a ticket and all its child rows (fulfillment lines, delivery,
 * ticket items, logs). Safe to call even if the ticket was never fulfilled.
 */
async function deleteTicket(ticketId: string) {
  const { data: ticketItems } = await supabase
      .from("order_ticket_items")
      .select("id")
      .eq("ticket_id", ticketId);

  if (ticketItems?.length) {
    await supabase
        .from("order_ticket_fulfillment_lines")
        .delete()
        .in("order_ticket_item_id", ticketItems.map((r) => r.id));
  }

  await supabase.from("ticket_deliveries").delete().eq("ticket_id", ticketId);
  await supabase.from("order_ticket_items").delete().eq("ticket_id", ticketId);
  await supabase.from("order_ticket_logs").delete().eq("ticket_id", ticketId);
  await supabase.from("order_tickets").delete().eq("id", ticketId);
}

/**
 * Reset pallet_inventory and item_locations back to starting values.
 * Call after any test that successfully deducts stock.
 * The deferred sync trigger keeps item_locations in sync automatically,
 * but we also update item_locations directly to guarantee consistency
 * within the same Jest process.
 */
async function resetStock() {
  await supabase.from("pallet_inventory")
      .update({ box_count: 10 }).eq("pallet_id", palletId).eq("item_id", itemPistachio);
  await supabase.from("pallet_inventory")
      .update({ box_count: 2  }).eq("pallet_id", palletId).eq("item_id", itemNutella);
  await supabase.from("pallet_inventory")
      .update({ box_count: 6  }).eq("pallet_id", palletId).eq("item_id", itemKunafa);

  await supabase.from("item_locations")
      .update({ current_quantity: 500 }).eq("item_id", itemPistachio).eq("location_id", warehouseLocationId);
  await supabase.from("item_locations")
      .update({ current_quantity: 48  }).eq("item_id", itemNutella).eq("location_id", warehouseLocationId);
  await supabase.from("item_locations")
      .update({ current_quantity: 240 }).eq("item_id", itemKunafa).eq("location_id", warehouseLocationId);
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe("fulfill_order_ticket RPC — Task 3.14", () => {

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1 — Sufficient stock → success, quantities deducted
  // ─────────────────────────────────────────────────────────────────────────
  test("1. Sufficient stock: ticket fulfilled, warehouse stock deducted", async () => {
    const ticketId = await createTicket([
      { itemId: itemPistachio, boxes: 3, units: 150 }, // 500 - 150 = 350
      { itemId: itemNutella,   boxes: 1, units: 24  }, //  48 -  24 =  24
    ]);

    const { error } = await supabase.rpc("fulfill_order_ticket", {
      p_ticket_id:     ticketId,
      p_admin_user_id: ADMIN_ID,
      p_allow_partial: false,
      p_delivery_type: "company",
    });
    expect(error).toBeNull();

    // v2: 'company' delivery transitions to 'fulfilled' then 'in_transit' in the same RPC
    const { data: ticket } = await supabase
        .from("order_tickets")
        .select("status")
        .eq("id", ticketId)
        .single();
    expect(["fulfilled", "in_transit"]).toContain(ticket?.status);

    // item_locations is synced by the deferred trigger — fires at COMMIT, before RPC returns
    const { data: invPc } = await supabase
        .from("item_locations")
        .select("current_quantity")
        .eq("item_id", itemPistachio)
        .eq("location_id", warehouseLocationId)
        .single();
    expect(Number(invPc?.current_quantity)).toBe(350);

    const { data: invNt } = await supabase
        .from("item_locations")
        .select("current_quantity")
        .eq("item_id", itemNutella)
        .eq("location_id", warehouseLocationId)
        .single();
    expect(Number(invNt?.current_quantity)).toBe(24);

    // pallet_inventory box_count must also reflect the deduction
    const { data: palletRow } = await supabase
        .from("pallet_inventory")
        .select("box_count")
        .eq("pallet_id", palletId)
        .eq("item_id", itemPistachio)
        .single();
    expect(palletRow?.box_count).toBe(7); // 10 - 3 boxes

    // A ticket_deliveries row must exist (company delivery creates one)
    const { data: deliveries } = await supabase
        .from("ticket_deliveries")
        .select("id, delivery_type")
        .eq("ticket_id", ticketId);
    expect(deliveries?.length).toBeGreaterThanOrEqual(1);
    expect(deliveries?.[0].delivery_type).toBe("company");

    await deleteTicket(ticketId);
    await resetStock();
  }, 15_000);


  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2 — One item insufficient → full rollback, zero deducted anywhere
  // ─────────────────────────────────────────────────────────────────────────
  test("2. Insufficient stock: full rollback, no deduction on any item", async () => {
    // Nutella: 2 boxes (48 pcs) in stock. Ordering 3 boxes (72 pcs) → must fail.
    // Pistachio must also be untouched (transaction rolled back atomically).
    const ticketId = await createTicket([
      { itemId: itemPistachio, boxes: 1, units: 50 },
      { itemId: itemNutella,   boxes: 3, units: 72 }, // ← exceeds stock
    ]);

    const { data: result, error } = await supabase.rpc("fulfill_order_ticket", {
      p_ticket_id:     ticketId,
      p_admin_user_id: ADMIN_ID,
      p_allow_partial: false,
      p_delivery_type: "company",
    });

    const isError = error !== null || (result && result.error !== undefined);
    expect(isError).toBe(true);

    // Pistachio: must be untouched
    const { data: invPc } = await supabase
        .from("item_locations")
        .select("current_quantity")
        .eq("item_id", itemPistachio)
        .eq("location_id", warehouseLocationId)
        .single();
    expect(Number(invPc?.current_quantity)).toBe(500);

    // Pallet box_count also untouched
    const { data: palletRow } = await supabase
        .from("pallet_inventory")
        .select("box_count")
        .eq("pallet_id", palletId)
        .eq("item_id", itemPistachio)
        .single();
    expect(palletRow?.box_count).toBe(10);

    // Ticket must not be in a post-fulfillment status
    const { data: ticket } = await supabase
        .from("order_tickets")
        .select("status")
        .eq("id", ticketId)
        .single();
    expect(["fulfilled", "in_transit", "delivered", "confirmed"]).not.toContain(ticket?.status);

    await deleteTicket(ticketId);
  }, 15_000);


  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3 — Fulfill already-fulfilled ticket → error
  // ─────────────────────────────────────────────────────────────────────────
  test("3. Already-fulfilled ticket: second call returns error", async () => {
    const ticketId = await createTicket([
      { itemId: itemPistachio, boxes: 1, units: 50 },
    ]);

    // First call — should succeed
    await supabase.rpc("fulfill_order_ticket", {
      p_ticket_id:     ticketId,
      p_admin_user_id: ADMIN_ID,
      p_allow_partial: false,
      p_delivery_type: "company",
    });

    // Second call — must be blocked (ticket is no longer submitted/processing)
    const { data: secondResult, error: secondError } = await supabase.rpc(
        "fulfill_order_ticket",
        { p_ticket_id: ticketId, p_admin_user_id: ADMIN_ID, p_allow_partial: false, p_delivery_type: "company" }
    );

    const isBlocked =
        secondError !== null ||
        (secondResult && secondResult.error !== undefined);
    expect(isBlocked).toBe(true);

    await deleteTicket(ticketId);
    await resetStock();
  }, 15_000);


  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4 — Fulfill cancelled ticket → error
  // ─────────────────────────────────────────────────────────────────────────
  test("4. Cancelled ticket: fulfillment is blocked", async () => {
    const { data: ticket, error: ticketErr } = await supabase
        .from("order_tickets")
        .insert({
          organization_id:        ORG_ID,
          requesting_location_id: storeLocationId,
          warehouse_location_id:  warehouseLocationId,
          status:                 "cancelled",
          requested_by:           STORE_ADMIN_ID,
        })
        .select("id")
        .single();
    if (ticketErr || !ticket) throw new Error(`Test 4 setup failed: ${ticketErr?.message}`);

    await supabase.from("order_ticket_items").insert({
      ticket_id: ticket.id, item_id: itemPistachio, quantity_boxes: 1, quantity_units: 50,
    });

    const { data: result, error } = await supabase.rpc("fulfill_order_ticket", {
      p_ticket_id:     ticket.id,
      p_admin_user_id: ADMIN_ID,
      p_allow_partial: false,
      p_delivery_type: "company",
    });

    const isBlocked =
        error !== null ||
        (result && result.error !== undefined);
    expect(isBlocked).toBe(true);

    await deleteTicket(ticket.id);
  }, 15_000);


  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5 — Concurrent lock guard
  // True concurrency requires two DB connections. Here we test the status guard
  // that SELECT FOR UPDATE enforces: once a ticket has moved past submitted,
  // a second fulfill call is rejected before touching any pallet stock.
  // ─────────────────────────────────────────────────────────────────────────
  test("5. Concurrent lock guard: status check prevents double-deduction", async () => {
    const ticketId = await createTicket([
      { itemId: itemPistachio, boxes: 2, units: 100 },
    ]);

    // Simulate "session 1 already fulfilled it" by manually flipping status
    await supabase
        .from("order_tickets")
        .update({ status: "fulfilled" })
        .eq("id", ticketId);

    // "Session 2" tries to fulfill — must be blocked by the status guard
    const { data: result, error } = await supabase.rpc("fulfill_order_ticket", {
      p_ticket_id:     ticketId,
      p_admin_user_id: ADMIN_ID,
      p_allow_partial: false,
      p_delivery_type: "company",
    });

    const isBlocked =
        error !== null ||
        (result && result.error !== undefined);
    expect(isBlocked).toBe(true);

    // item_locations must still be 500 — nothing was deducted
    const { data: invPc } = await supabase
        .from("item_locations")
        .select("current_quantity")
        .eq("item_id", itemPistachio)
        .eq("location_id", warehouseLocationId)
        .single();
    expect(Number(invPc?.current_quantity)).toBe(500);

    await deleteTicket(ticketId);
  }, 15_000);


  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6 — Two tickets deplete same item: first wins, second fails
  // ─────────────────────────────────────────────────────────────────────────
  test("6. Sequential stock exhaustion: second ticket fails after first depletes stock", async () => {
    // Ticket 1: 9 boxes × 50 ppb = 450 pcs  →  leaves 50 pcs / 1 box
    const ticket1 = await createTicket([
      { itemId: itemPistachio, boxes: 9, units: 450 },
    ]);
    // Ticket 2: 3 boxes × 50 ppb = 150 pcs  →  only 50 pcs left — must fail
    const ticket2 = await createTicket([
      { itemId: itemPistachio, boxes: 3, units: 150 },
    ]);

    const { error: err1 } = await supabase.rpc("fulfill_order_ticket", {
      p_ticket_id:     ticket1,
      p_admin_user_id: ADMIN_ID,
      p_allow_partial: false,
      p_delivery_type: "company",
    });
    expect(err1).toBeNull();

    const { data: result2, error: err2 } = await supabase.rpc("fulfill_order_ticket", {
      p_ticket_id:     ticket2,
      p_admin_user_id: ADMIN_ID,
      p_allow_partial: false,
      p_delivery_type: "company",
    });
    const ticket2Blocked =
        err2 !== null ||
        (result2 && result2.error !== undefined);
    expect(ticket2Blocked).toBe(true);

    // Warehouse item_locations after ticket 1 only: 500 - 450 = 50
    const { data: inv } = await supabase
        .from("item_locations")
        .select("current_quantity")
        .eq("item_id", itemPistachio)
        .eq("location_id", warehouseLocationId)
        .single();
    expect(Number(inv?.current_quantity)).toBe(50);

    await deleteTicket(ticket1);
    await deleteTicket(ticket2);
    await resetStock();
  }, 20_000);


  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7 — Fulfillment below threshold triggers low-stock alert
  // ─────────────────────────────────────────────────────────────────────────
  test("7. Low-stock alert fired after fulfillment drops stock below threshold", async () => {
    // Kunafa: 6 boxes × 40 ppb = 240 pcs. min_quantity = 200.
    // Ordering 5 boxes = 200 pcs → leaves 40 pcs (below threshold of 200).
    // Flow: pallet_inventory deducted → DEFERRED trigger syncs item_locations
    //       → check_low_stock trigger fires → alert created.
    const ticketId = await createTicket([
      { itemId: itemKunafa, boxes: 5, units: 200 },
    ]);

    // Resolve any pre-existing unresolved alert for clean assertion
    await supabase
        .from("alerts")
        .update({ resolved_at: new Date().toISOString() })
        .eq("item_id", itemKunafa)
        .eq("location_id", warehouseLocationId)
        .is("resolved_at", null);

    const { error } = await supabase.rpc("fulfill_order_ticket", {
      p_ticket_id:     ticketId,
      p_admin_user_id: ADMIN_ID,
      p_allow_partial: false,
      p_delivery_type: "company",
    });
    expect(error).toBeNull();

    const { data: alerts } = await supabase
        .from("alerts")
        .select("id, alert_type")
        .eq("item_id", itemKunafa)
        .eq("location_id", warehouseLocationId)
        .eq("alert_type", "low_stock")
        .is("resolved_at", null);

    expect(alerts?.length).toBeGreaterThanOrEqual(1);

    await deleteTicket(ticketId);
    await resetStock();
  }, 15_000);


  // ─────────────────────────────────────────────────────────────────────────
  // TEST 8 — inventory_logs created per item with action_type = 'used'
  // ─────────────────────────────────────────────────────────────────────────
  test("8. Inventory logs: one 'used' log per item at warehouse", async () => {
    const ticketId = await createTicket([
      { itemId: itemPistachio, boxes: 1, units: 50 },
      { itemId: itemNutella,   boxes: 1, units: 24 },
    ]);

    const { error } = await supabase.rpc("fulfill_order_ticket", {
      p_ticket_id:     ticketId,
      p_admin_user_id: ADMIN_ID,
      p_allow_partial: false,
      p_delivery_type: "company",
    });
    expect(error).toBeNull();

    // The RPC must insert one inventory_log per item with action_type = 'used'
    // and the ticket ID referenced in notes (per spec in Section 6.2, Step 2d)
    const { data: logs } = await supabase
        .from("inventory_logs")
        .select("item_id, action_type, notes")
        .eq("location_id", warehouseLocationId)
        .eq("action_type", "used")
        .like("notes", `%${ticketId}%`);

    const loggedItems = new Set(logs?.map((l) => l.item_id));
    expect(loggedItems.has(itemPistachio)).toBe(true);
    expect(loggedItems.has(itemNutella)).toBe(true);

    await deleteTicket(ticketId);
    await resetStock();
  }, 15_000);

});