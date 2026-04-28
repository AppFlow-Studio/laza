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
	const supabase = createServiceRoleClient();

	const { data, error } = await supabase.rpc("get_warehouse_burn_rates", {
		p_organization_id: organizationId,
		p_days_lookback: daysLookback,
	});

	if (error) throw error;
	return (data ?? []) as BurnRateRow[];
}

// ─── 4.2 — Reorder Alerts ────────────────────────────────────────────────────
// Merges two sources:
//   1. Burn-rate RPC: predictive alerts based on 90-day consumption history
//   2. Active alerts table: threshold-crossing alerts that triggered emails
// Items in source 1 take precedence (richer data). Items only in source 2
// appear with avg_weekly_units=0 and weeks_remaining=null.

export async function getReorderAlerts(
	organizationId: string,
	leadTimeDays = 45,
	bufferDays = 14,
): Promise<ReorderAlertRow[]> {
	const supabase = createServiceRoleClient();

	// ── 1. Burn-rate alerts (RPC) ────────────────────────────────────────────
	const { data: rpcData, error: rpcError } = await supabase.rpc("get_reorder_alerts", {
		p_organization_id: organizationId,
		p_lead_time_days: leadTimeDays,
		p_buffer_days: bufferDays,
	});

	if (rpcError) throw rpcError;
	const burnRateAlerts = (rpcData ?? []) as ReorderAlertRow[];
	const burnRateItemIds = new Set(burnRateAlerts.map((a) => a.item_id));

	// ── 2. Threshold-based alerts from the alerts table ──────────────────────
	const { data: activeAlerts, error: activeError } = await supabase
		.from("alerts")
		.select("id, item_id, location_id, items(id, name, sku)")
		.eq("organization_id", organizationId)
		.eq("alert_type", "low_stock")
		.is("resolved_at", null);

	if (activeError) throw activeError;

	// Only process items not already covered by the burn-rate RPC
	const newAlerts = (activeAlerts ?? []).filter(
		(a: any) => a.item_id != null && !burnRateItemIds.has(a.item_id),
	);

	if (newAlerts.length === 0) return burnRateAlerts;

	const newItemIds = [...new Set(newAlerts.map((a: any) => a.item_id as number))];
	const newLocationIds = [...new Set(newAlerts.map((a: any) => a.location_id as string).filter(Boolean))];

	// Current warehouse stock: sum total_pieces from warehouse_inventory_overview
	const { data: stockRows } = await supabase
		.from("warehouse_inventory_overview")
		.select("item_id, warehouse_location_id, total_pieces, pallet_status")
		.in("item_id", newItemIds)
		.in("warehouse_location_id", newLocationIds)
		.neq("pallet_status", "retired");

	const stockMap = new Map<number, number>();
	for (const row of stockRows ?? []) {
		if (row.item_id == null) continue;
		stockMap.set(row.item_id, (stockMap.get(row.item_id) ?? 0) + (row.total_pieces ?? 0));
	}

	// Thresholds
	const { data: thresholdRows } = await supabase
		.from("low_stock_thresholds")
		.select("item_id, low_threshold, critical_threshold")
		.eq("organization_id", organizationId)
		.eq("is_active", true)
		.in("item_id", newItemIds);

	const threshMap = new Map<number, { low: number; critical: number | null }>();
	for (const t of thresholdRows ?? []) {
		if (t.item_id == null) continue;
		// Location-specific rows overwrite org-wide; simple last-write wins here
		// since we already filtered to the relevant org
		threshMap.set(t.item_id, { low: t.low_threshold, critical: t.critical_threshold ?? null });
	}

	// Deduplicate by item_id (alerts table may have multiple rows per item)
	const seenItems = new Set<number>();
	const thresholdAlerts: ReorderAlertRow[] = [];

	for (const alert of newAlerts) {
		const itemId = alert.item_id as number;
		if (seenItems.has(itemId)) continue;
		seenItems.add(itemId);

		const stock = stockMap.get(itemId) ?? 0;
		const thresh = threshMap.get(itemId);
		const item = alert.items as any;

		let urgency: "critical" | "warning" | "watch" = "watch";
		if (stock <= 0) {
			urgency = "critical";
		} else if (thresh?.critical != null && stock <= thresh.critical) {
			urgency = "critical";
		} else if (thresh != null && stock < thresh.low) {
			urgency = "warning";
		}

		thresholdAlerts.push({
			item_id: itemId,
			item_name: item?.name ?? "Unknown",
			item_sku: item?.sku ?? null,
			avg_weekly_units: 0,
			current_warehouse_stock: stock,
			weeks_remaining: null,
			urgency,
		});
	}

	return [...burnRateAlerts, ...thresholdAlerts];
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