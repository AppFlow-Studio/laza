/**
 * lib/supabase/queries/analytics.ts
 *
 * Analytics query functions for Phase 4.
 * Follows the same pattern as lib/supabase/queries/orderTickets.ts:
 *   - Uses createServerSupabaseClient() for RLS-scoped reads
 *   - Uses createServiceRoleClient() where cross-org aggregation is needed
 */

"use server";

import { createServerSupabaseClient, createServiceRoleClient } from "../server";
// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRange {
    from?: string; // ISO date string
    to?: string; // ISO date string
}

export interface BurnRateRow {
    item_id: number;
    item_name: string;
    item_sku: string | null;
    avg_weekly_units: number;
    current_warehouse_stock: number;
    weeks_remaining: number | null;
}

export interface ReorderAlertRow extends BurnRateRow {
    urgency: "critical" | "warning" | "watch";
}

export interface StoreOrderHistoryRow {
    id: string;
    status: string;
    created_at: string;
    fulfilled_at: string | null;
    confirmed_at: string | null;
    item_count: number;
    total_boxes: number;
}

export interface StoreComparisonRow {
    location_id: string;
    location_name: string;
    ticket_count: number;
    total_boxes_ordered: number;
    total_units_fulfilled: number;
}

export interface MostOrderedItemRow {
    item_id: number;
    item_name: string;
    item_sku: string | null;
    total_boxes_ordered: number;
    total_units_fulfilled: number;
    ticket_count: number;
}

// ─── 4.1 — Burn Rates (calls RPC) ────────────────────────────────────────────

export async function getBurnRates(
    organizationId: string,
    daysLookback = 90,
): Promise<BurnRateRow[]> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc("get_warehouse_burn_rates", {
        p_organization_id: organizationId,
        p_days_lookback: daysLookback,
    });

    if (error) throw error;
    return (data ?? []) as BurnRateRow[];
}

// ─── 4.2 — Reorder Alerts (calls RPC) ────────────────────────────────────────

export async function getReorderAlerts(
    organizationId: string,
    leadTimeDays = 45,
    bufferDays = 14,
): Promise<ReorderAlertRow[]> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc("get_reorder_alerts", {
        p_organization_id: organizationId,
        p_lead_time_days: leadTimeDays,
        p_buffer_days: bufferDays,
    });

    if (error) throw error;
    return (data ?? []) as ReorderAlertRow[];
}

// ─── 4.3a — Store Order History ───────────────────────────────────────────────

/**
 * All order tickets from one store over a date range.
 * Used for the per-store analytics view.
 */
export async function getStoreOrderHistory(
    locationId: string,
    dateRange?: DateRange,
) {
    const supabase = createServerSupabaseClient();

    let query = supabase
        .from("order_tickets")
        .select(
            `
      id, status, created_at, fulfilled_at, confirmed_at, is_auto_approved,
      order_ticket_items (
        id, quantity_boxes, quantity_units, fulfilled_boxes, fulfilled_units,
        items ( id, name, sku )
      )
    `,
        )
        .eq("requesting_location_id", locationId)
        .in("status", ["fulfilled", "in_transit", "delivered", "confirmed"])
        .order("created_at", { ascending: false });

    if (dateRange?.from) query = query.gte("created_at", dateRange.from);
    if (dateRange?.to) query = query.lte("created_at", dateRange.to);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
}

// ─── 4.3b — Store Comparison ──────────────────────────────────────────────────

/**
 * Compare order volumes across all stores.
 * Aggregates confirmed ticket data per store location.
 */
export async function getStoreComparison(
    organizationId: string,
    dateRange?: DateRange,
) {
    const supabase = createServiceRoleClient();

    // Fetch confirmed tickets with items and requesting location
    let query = supabase
        .from("order_tickets")
        .select(
            `
      id, requesting_location_id, confirmed_at,
      requesting_location:locations!requesting_location_id ( id, name ),
      order_ticket_items (
        quantity_boxes, fulfilled_units
      )
    `,
        )
        .eq("organization_id", organizationId)
        .eq("status", "confirmed");

    if (dateRange?.from) query = query.gte("confirmed_at", dateRange.from);
    if (dateRange?.to) query = query.lte("confirmed_at", dateRange.to);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate per store in JS (Supabase doesn't support GROUP BY on joined data)
    const storeMap = new Map<
        string,
        {
            location_id: string;
            location_name: string;
            ticket_count: number;
            total_boxes_ordered: number;
            total_units_fulfilled: number;
        }
    >();

    for (const ticket of data ?? []) {
        const loc = ticket.requesting_location as any;
        const locId = loc?.id ?? ticket.requesting_location_id;
        const locName = loc?.name ?? "Unknown";

        if (!storeMap.has(locId)) {
            storeMap.set(locId, {
                location_id: locId,
                location_name: locName,
                ticket_count: 0,
                total_boxes_ordered: 0,
                total_units_fulfilled: 0,
            });
        }

        const entry = storeMap.get(locId)!;
        entry.ticket_count += 1;

        for (const item of ticket.order_ticket_items ?? []) {
            entry.total_boxes_ordered += item.quantity_boxes ?? 0;
            entry.total_units_fulfilled += Number(item.fulfilled_units ?? 0);
        }
    }

    return Array.from(storeMap.values()).sort(
        (a, b) => b.total_units_fulfilled - a.total_units_fulfilled,
    );
}

// ─── 4.3c — Most Ordered Items ────────────────────────────────────────────────

/**
 * Top items by order volume across all stores.
 * Only counts confirmed tickets.
 */
export async function getMostOrderedItems(
    organizationId: string,
    dateRange?: DateRange,
    limit = 20,
) {
    const supabase = createServiceRoleClient();

    let query = supabase
        .from("order_tickets")
        .select(
            `
      id, confirmed_at,
      order_ticket_items (
        item_id, quantity_boxes, fulfilled_units,
        items ( id, name, sku )
      )
    `,
        )
        .eq("organization_id", organizationId)
        .eq("status", "confirmed");

    if (dateRange?.from) query = query.gte("confirmed_at", dateRange.from);
    if (dateRange?.to) query = query.lte("confirmed_at", dateRange.to);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate per item
    const itemMap = new Map<
        number,
        {
            item_id: number;
            item_name: string;
            item_sku: string | null;
            total_boxes_ordered: number;
            total_units_fulfilled: number;
            ticket_ids: Set<string>;
        }
    >();

    for (const ticket of data ?? []) {
        for (const oti of ticket.order_ticket_items ?? []) {
            const itemId = oti.item_id;
            const itemInfo = oti.items as any;

            if (!itemMap.has(itemId)) {
                itemMap.set(itemId, {
                    item_id: itemId,
                    item_name: itemInfo?.name ?? `Item ${itemId}`,
                    item_sku: itemInfo?.sku ?? null,
                    total_boxes_ordered: 0,
                    total_units_fulfilled: 0,
                    ticket_ids: new Set(),
                });
            }

            const entry = itemMap.get(itemId)!;
            entry.total_boxes_ordered += oti.quantity_boxes ?? 0;
            entry.total_units_fulfilled += Number(oti.fulfilled_units ?? 0);
            entry.ticket_ids.add(ticket.id);
        }
    }

    return Array.from(itemMap.values())
        .map(({ ticket_ids, ...rest }) => ({
            ...rest,
            ticket_count: ticket_ids.size,
        }))
        .sort((a, b) => b.total_units_fulfilled - a.total_units_fulfilled)
        .slice(0, limit);
}

// ─── 4.3d — Warehouse Depletion Trend ─────────────────────────────────────────

/**
 * Warehouse stock changes over time, derived from inventory_logs at the
 * warehouse location. Returns daily snapshots of quantity changes.
 */
export async function getWarehouseDepletionTrend(
    organizationId: string,
    dateRange?: DateRange,
) {
    const supabase = createServiceRoleClient();

    // Resolve warehouse location
    const { data: warehouse, error: whErr } = await supabase
        .from("locations")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("location_type", "warehouse")
        .eq("is_active", true)
        .limit(1)
        .single();

    if (whErr || !warehouse) return [];

    let query = supabase
        .from("inventory_logs")
        .select(
            `
      id, item_id, action_type, quantity_change, new_quantity, created_at,
      items ( id, name, sku )
    `,
        )
        .eq("location_id", warehouse.id)
        .order("created_at", { ascending: true });

    if (dateRange?.from) query = query.gte("created_at", dateRange.from);
    if (dateRange?.to) query = query.lte("created_at", dateRange.to);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// APPEND TO: lib/supabase/queries/analytics.ts
//
// Task 4.9 — Cost analytics query functions
// Depends on: item_cost_history (1.20), warehouse_expenses (1.18),
//             order_ticket_items.unit_cost_at_time + line_total (1.22)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Return Types ─────────────────────────────────────────────────────────────

export interface ItemCostTrendRow {
    item_id: number;
    item_name: string;
    item_sku: string | null;
    effective_date: string; // "2025-11-01"
    unit_cost_after: number; // Fully landed cost at time of PO receipt
    unit_price_before: number; // Raw supplier price before fee allocation
    purchase_order_id: string;
}

export interface StoreBillingRow {
    location_id: string;
    location_name: string;
    total_line_value: number; // SUM(line_total) across fulfilled tickets
    total_units_fulfilled: number;
    total_boxes_fulfilled: number;
    ticket_count: number;
    avg_line_value_per_ticket: number;
}

export interface ExpenseBreakdownRow {
    expense_type: string; // "pallet_delivery" | "container_unload" | "delivery" | "pallet_rent" | "other"
    month: string; // "2025-11" — YYYY-MM
    total_amount: number;
    entry_count: number;
}

export interface MarginIndicatorRow {
    item_id: number;
    item_name: string;
    item_sku: string | null;
    current_unit_cost: number; // items.current_unit_cost — latest landed cost
    avg_transfer_price: number; // AVG(unit_cost_at_time) across recent fulfilled tickets
    latest_transfer_price: number; // Most recent unit_cost_at_time snapshot on a ticket
    price_gap: number; // current_unit_cost − latest_transfer_price (positive = stale)
    is_stale: boolean; // true when store is being billed less than current cost
    last_fulfilled_at: string | null;
}

// ─── 1. getItemCostTrends ─────────────────────────────────────────────────────
// Queries item_cost_history for unit_cost_after over time per item.
// Used for the line chart showing if supplier prices are trending up.

export async function getItemCostTrends(
    orgId: string,
    itemIds?: number[],
    dateRange?: DateRange,
): Promise<ItemCostTrendRow[]> {
    const supabase = createServerSupabaseClient();

    let query = supabase
        .from("item_cost_history")
        .select(
            `
      item_id,
      purchase_order_id,
      unit_price_before,
      unit_cost_after,
      effective_date,
      items (
        id,
        name,
        sku
      )
      `,
        )
        .eq("organization_id", orgId)
        .order("effective_date", { ascending: true });

    if (itemIds && itemIds.length > 0) {
        query = query.in("item_id", itemIds);
    }
    if (dateRange?.from) {
        query = query.gte("effective_date", dateRange.from);
    }
    if (dateRange?.to) {
        query = query.lte("effective_date", dateRange.to);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((row) => ({
        item_id: row.item_id,
        item_name: (row.items as any)?.name ?? "Unknown Item",
        item_sku: (row.items as any)?.sku ?? null,
        effective_date: row.effective_date,
        unit_cost_after: Number(row.unit_cost_after),
        unit_price_before: Number(row.unit_price_before),
        purchase_order_id: row.purchase_order_id,
    }));
}

// ─── 2. getStoreBillingSummary ────────────────────────────────────────────────
// Aggregates order_ticket_items.line_total per store for fulfilled tickets.
// Shows which stores consume the most by dollar value.
// Note: line_total is only populated at fulfillment time (task 3.7 update).

export async function getStoreBillingSummary(
    orgId: string,
    dateRange?: DateRange,
): Promise<StoreBillingRow[]> {
    const supabase = createServerSupabaseClient();

    // Step 1: Get all fulfilled/confirmed tickets in the date range
    let ticketsQuery = supabase
        .from("order_tickets")
        .select("id, requesting_location_id, fulfilled_at")
        .eq("organization_id", orgId)
        .in("status", ["fulfilled", "confirmed"])
        .not("fulfilled_at", "is", null);

    if (dateRange?.from) {
        ticketsQuery = ticketsQuery.gte(
            "fulfilled_at",
            `${dateRange.from}T00:00:00`,
        );
    }
    if (dateRange?.to) {
        ticketsQuery = ticketsQuery.lte(
            "fulfilled_at",
            `${dateRange.to}T23:59:59`,
        );
    }

    const { data: tickets, error: ticketsError } = await ticketsQuery;
    if (ticketsError) throw ticketsError;
    if (!tickets || tickets.length === 0) return [];

    const ticketIds = tickets.map((t) => t.id);

    // Step 2: Fetch line items for those tickets (only rows with a line_total set)
    const { data: lineItems, error: lineError } = await supabase
        .from("order_ticket_items")
        .select("ticket_id, line_total, fulfilled_units, fulfilled_boxes")
        .in("ticket_id", ticketIds)
        .not("line_total", "is", null);

    if (lineError) throw lineError;

    // Step 3: Fetch location names
    const locationIds = [
        ...new Set(tickets.map((t) => t.requesting_location_id)),
    ];
    const { data: locations, error: locError } = await supabase
        .from("locations")
        .select("id, name")
        .in("id", locationIds);

    if (locError) throw locError;

    // Build lookup maps
    const locationNameMap = new Map(
        (locations ?? []).map((l) => [l.id, l.name]),
    );
    const ticketLocationMap = new Map(
        tickets.map((t) => [t.id, t.requesting_location_id]),
    );

    // Aggregate per location
    const agg = new Map<
        string,
        {
            total_line_value: number;
            total_units: number;
            total_boxes: number;
            ticket_ids: Set<string>;
        }
    >();

    for (const item of lineItems ?? []) {
        const locationId = ticketLocationMap.get(item.ticket_id);
        if (!locationId) continue;

        const existing = agg.get(locationId) ?? {
            total_line_value: 0,
            total_units: 0,
            total_boxes: 0,
            ticket_ids: new Set<string>(),
        };

        existing.total_line_value += Number(item.line_total ?? 0);
        existing.total_units += Number(item.fulfilled_units ?? 0);
        existing.total_boxes += Number(item.fulfilled_boxes ?? 0);
        existing.ticket_ids.add(item.ticket_id);
        agg.set(locationId, existing);
    }

    return Array.from(agg.entries())
        .map(([locationId, vals]) => ({
            location_id: locationId,
            location_name: locationNameMap.get(locationId) ?? "Unknown Store",
            total_line_value: vals.total_line_value,
            total_units_fulfilled: vals.total_units,
            total_boxes_fulfilled: vals.total_boxes,
            ticket_count: vals.ticket_ids.size,
            avg_line_value_per_ticket:
                vals.ticket_ids.size > 0
                    ? vals.total_line_value / vals.ticket_ids.size
                    : 0,
        }))
        .sort((a, b) => b.total_line_value - a.total_line_value);
}

// ─── 3. getWarehouseExpenseBreakdown ─────────────────────────────────────────
// Groups warehouse_expenses by expense_type and calendar month.
// Powers a pie/bar chart: rent vs delivery vs unload vs other.

export async function getWarehouseExpenseBreakdown(
    orgId: string,
    dateRange?: DateRange,
): Promise<ExpenseBreakdownRow[]> {
    const supabase = createServerSupabaseClient();

    let query = supabase
        .from("warehouse_expenses")
        .select("expense_type, amount, expense_date")
        .eq("organization_id", orgId)
        .order("expense_date", { ascending: true });

    if (dateRange?.from) {
        query = query.gte("expense_date", dateRange.from);
    }
    if (dateRange?.to) {
        query = query.lte("expense_date", dateRange.to);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group client-side by expense_type + YYYY-MM month bucket
    const agg = new Map<string, { total: number; count: number }>();

    for (const row of data ?? []) {
        const month = (row.expense_date as string).slice(0, 7); // "2025-11"
        const key = `${row.expense_type}::${month}`;
        const existing = agg.get(key) ?? { total: 0, count: 0 };
        existing.total += Number(row.amount);
        existing.count += 1;
        agg.set(key, existing);
    }

    return Array.from(agg.entries())
        .map(([key, vals]) => {
            const [expense_type, month] = key.split("::");
            return {
                expense_type,
                month,
                total_amount: vals.total,
                entry_count: vals.count,
            };
        })
        .sort(
            (a, b) =>
                a.month.localeCompare(b.month) ||
                a.expense_type.localeCompare(b.expense_type),
        );
}

// ─── 4. getMarginIndicators ───────────────────────────────────────────────────
// Compares items.current_unit_cost to unit_cost_at_time on recent tickets.
// Flags items where the transfer price billed to stores is below the current
// landed cost — meaning the org is losing margin on those items.

export async function getMarginIndicators(
    orgId: string,
): Promise<MarginIndicatorRow[]> {
    const supabase = createServerSupabaseClient();

    // Step 1: All items that have a current_unit_cost
    const { data: items, error: itemsError } = await supabase
        .from("items")
        .select("id, name, sku, current_unit_cost")
        .eq("organization_id", orgId)
        .not("current_unit_cost", "is", null);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return [];

    const itemIds = items.map((i) => i.id);

    // Step 2: Most recent fulfilled ticket items with cost snapshots
    // Inner join on order_tickets to scope to this org and get fulfilled_at
    const { data: ticketItems, error: tiError } = await supabase
        .from("order_ticket_items")
        .select(
            `
      item_id,
      unit_cost_at_time,
      order_tickets!inner (
        organization_id,
        status,
        fulfilled_at
      )
      `,
        )
        .eq("order_tickets.organization_id", orgId)
        .in("order_tickets.status", ["fulfilled", "confirmed"])
        .not("unit_cost_at_time", "is", null)
        .in("item_id", itemIds)
        // Most recent first so the first row per item = latest transfer price
        .order("order_tickets.fulfilled_at", { ascending: false });

    if (tiError) throw tiError;

    // Aggregate per item: running avg, latest cost (first seen = most recent), last fulfilled date
    const itemAgg = new Map<
        number,
        { costs: number[]; latest_cost: number; last_fulfilled_at: string }
    >();

    for (const ti of ticketItems ?? []) {
        const ticket = (ti as any).order_tickets;
        const cost = Number(ti.unit_cost_at_time);
        const fulfilledAt: string = ticket?.fulfilled_at ?? "";
        const existing = itemAgg.get(ti.item_id);

        if (!existing) {
            // First row per item = most recent (query is DESC)
            itemAgg.set(ti.item_id, {
                costs: [cost],
                latest_cost: cost,
                last_fulfilled_at: fulfilledAt,
            });
        } else {
            existing.costs.push(cost);
            // Keep latest_cost as the first row (most recent); don't overwrite
        }
    }

    return items
        .filter((item) => itemAgg.has(item.id))
        .map((item) => {
            const agg = itemAgg.get(item.id)!;
            const currentCost = Number(item.current_unit_cost);
            const avgTransfer =
                agg.costs.reduce((a, b) => a + b, 0) / agg.costs.length;
            const latestTransfer = agg.latest_cost;
            const gap = currentCost - latestTransfer;

            return {
                item_id: item.id,
                item_name: item.name,
                item_sku: item.sku ?? null,
                current_unit_cost: currentCost,
                avg_transfer_price: Number(avgTransfer.toFixed(4)),
                latest_transfer_price: latestTransfer,
                price_gap: Number(gap.toFixed(4)),
                // Tolerance of $0.01 avoids floating-point false positives
                is_stale: gap > 0.01,
                last_fulfilled_at: agg.last_fulfilled_at || null,
            };
        })
        .sort((a, b) => b.price_gap - a.price_gap); // Worst offenders first
}