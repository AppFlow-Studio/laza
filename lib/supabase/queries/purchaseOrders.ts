"use server";

// lib/supabase/queries/purchaseOrders.ts
//
// Supabase query and mutation functions for purchase orders and item cost history.
// Task 2.20 — data layer for the PO system.
//
// All functions use createServerSupabaseClient() (server-side, Clerk token).
// Follows the same pattern as warehouse.ts / inventory.ts.

import { createServerSupabaseClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PurchaseOrderRow {
    id: string;
    organization_id: string;
    po_number: string;
    supplier_name: string | null;
    status: string;
    order_date: string | null;
    expected_arrival: string | null;
    actual_arrival: string | null;
    subtotal_before: number;
    office_fee: number;
    shipping_fee: number;
    total_cbm: number | null;
    total_pallets: number | null;
    notes: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    // Joined — present when fetching detail
    purchase_order_items?: PurchaseOrderItemRow[];
}

export interface PurchaseOrderItemRow {
    id: string;
    purchase_order_id: string;
    item_id: number;
    quantity_ordered: number;
    unit_price_before: number;
    total_price_before: number;
    pieces_per_carton: number | null;
    cartons: number | null;
    cbm: number | null;
    cbm_share: number | null;
    allocated_office_fee: number | null;
    allocated_shipping_fee: number | null;
    total_cost_after: number;
    unit_cost_after: number;
    quantity_received: number | null;
    // Joined
    items?: { id: number; name: string; sku: string | null };
}

export interface POFilters {
    status?: string;
}

// ---------------------------------------------------------------------------
// 1. getAllPurchaseOrders
//    Returns all POs for the org, with line items joined (for item count
//    and grand total calculation in the list view).
//    Filtered by status when provided.
// ---------------------------------------------------------------------------

export async function getAllPurchaseOrders(
    organizationId: string,
    filters?: POFilters
): Promise<PurchaseOrderRow[]> {
    const supabase = await createServerSupabaseClient();

    let query = supabase
        .from("purchase_orders")
        .select(
            `
            *,
            purchase_order_items (
                id,
                item_id,
                quantity_ordered,
                unit_price_before,
                total_price_before,
                total_cost_after,
                unit_cost_after,
                cbm
            )
            `
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

    if (filters?.status) {
        query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as PurchaseOrderRow[];
}

// ---------------------------------------------------------------------------
// 2. getPurchaseOrderById
//    Returns a single PO with all line items AND item name/SKU joined.
//    Used by the detail page and the receive modal.
// ---------------------------------------------------------------------------

export async function getPurchaseOrderById(
    id: string
): Promise<PurchaseOrderRow | null> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from("purchase_orders")
        .select(
            `
            *,
            purchase_order_items (
                *,
                items ( id, name, sku )
            )
            `
        )
        .eq("id", id)
        .single();

    if (error) {
        if (error.code === "PGRST116") return null; // not found
        throw new Error(error.message);
    }
    return data as PurchaseOrderRow;
}

// ---------------------------------------------------------------------------
// 3. createPurchaseOrder
//    Inserts the PO header and all line items in sequence.
//    After inserting items, calls the recalculate_po_costs() RPC (Task 1.24)
//    to confirm the CBM allocation math is stored correctly server-side.
//
//    Returns the created PO row (with id for redirect).
// ---------------------------------------------------------------------------

export async function createPurchaseOrder(
    po: Omit<PurchaseOrderRow, "id" | "created_at" | "updated_at" | "actual_arrival" | "total_pallets" | "purchase_order_items">,
    items: Omit<PurchaseOrderItemRow, "id" | "purchase_order_id" | "items">[]
): Promise<PurchaseOrderRow> {
    const supabase = await createServerSupabaseClient();

    // Insert PO header
    const { data: createdPO, error: poError } = await supabase
        .from("purchase_orders")
        .insert(po)
        .select()
        .single();

    if (poError) throw new Error(poError.message);

    // Insert all line items
    const lineItems = items.map((item) => ({
        ...item,
        purchase_order_id: createdPO.id,
    }));

    const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(lineItems);

    if (itemsError) throw new Error(itemsError.message);

    // Confirm calculations server-side via RPC (Task 1.24)
    // This is a no-op if the client-side math was correct, but ensures
    // data integrity if there were any floating-point drift
    const { error: rpcError } = await supabase.rpc("recalculate_po_costs", {
        p_purchase_order_id: createdPO.id,
    });

    // RPC errors are non-fatal — log but don't block the UI
    if (rpcError) {
        console.error("recalculate_po_costs RPC error:", rpcError.message);
    }

    return createdPO as PurchaseOrderRow;
}

// ---------------------------------------------------------------------------
// 4. updatePurchaseOrder
//    Updates the PO header only (status, dates, fees, notes).
//    Called for status advancement: draft → submitted → in_transit → arrived.
//    Does NOT touch line items.
// ---------------------------------------------------------------------------

export async function updatePurchaseOrder(
    id: string,
    updates: Partial<
        Pick<
            PurchaseOrderRow,
            | "status"
            | "supplier_name"
            | "order_date"
            | "expected_arrival"
            | "actual_arrival"
            | "office_fee"
            | "shipping_fee"
            | "subtotal_before"
            | "total_cbm"
            | "total_pallets"
            | "notes"
        >
    >
): Promise<PurchaseOrderRow> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data as PurchaseOrderRow;
}

// ---------------------------------------------------------------------------
// 5. receivePurchaseOrder
//    Calls the receive_purchase_order() RPC (Task 1.25).
//
//    The RPC runs in a single DB transaction:
//      1. UPDATE warehouse item_locations.current_quantity += quantity_received
//      2. INSERT inventory_logs (action_type = 'received', notes = PO number)
//      3. INSERT item_cost_history (unit_cost_after snapshot)
//      4. UPDATE items.current_unit_cost = unit_cost_after
//      5. UPDATE purchase_orders SET status = 'received', actual_arrival = NOW()
//      6. check_low_stock() trigger fires automatically on item_locations update
//
//    If any step fails → full rollback. The UI shows an error and the
//    warehouse stock stays unchanged.
// ---------------------------------------------------------------------------

export async function receivePurchaseOrder(
    purchaseOrderId: string,
    userId: string,
    receivedItems: { item_id: number; quantity_received: number }[]
): Promise<{ success: boolean }> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc("receive_purchase_order", {
        p_purchase_order_id: purchaseOrderId,
        p_user_id: userId,
        p_received_items: JSON.stringify(receivedItems),
    });

    if (error) throw new Error(error.message);
    return { success: true };
}

// ---------------------------------------------------------------------------
// 6. getItemCostHistory
//    Returns the full cost history for one item from item_cost_history table.
//    Used by the analytics cost trend chart (Task 4.9 / 4.10).
//    Results are ordered oldest-first for charting.
// ---------------------------------------------------------------------------

export interface ItemCostHistoryRow {
    id: string;
    item_id: number;
    purchase_order_id: string;
    unit_price_before: number;
    unit_cost_after: number;
    effective_date: string;
    // Joined
    purchase_orders?: { po_number: string };
}

export async function getItemCostHistory(
    itemId: number
): Promise<ItemCostHistoryRow[]> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from("item_cost_history")
        .select(
            `
            *,
            purchase_orders ( po_number )
            `
        )
        .eq("item_id", itemId)
        .order("effective_date", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as ItemCostHistoryRow[];
}