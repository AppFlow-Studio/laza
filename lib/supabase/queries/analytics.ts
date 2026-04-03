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
	to?: string;   // ISO date string
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
	const supabase = createServerSupabaseClient();

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
	const supabase = createServerSupabaseClient();

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