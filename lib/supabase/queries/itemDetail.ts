'use server';

import { createServerSupabaseClient } from '../server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ItemBoxConfig {
	pieces_per_box: number;
	box_count: number;
	total_pieces: number;
	notes: string | null;
}

export interface ItemShipmentRecord {
	item_id: number;
	item_name: string;
	sku: string | null;
	po_number: string;
	po_date: string;
	actual_arrival: string | null;
	supplier_name: string | null;
	config_pieces_per_box: number;
	config_box_count: number;
	config_total_pieces: number;
	po_line_total_boxes: number;
	has_mixed_configs: boolean;
	box_configs?: ItemBoxConfig[];
}

export interface ItemBoxTotals {
	item_id: number;
	item_name: string;
	sku: string | null;
	total_boxes_received: number;
	total_pieces_received: number;
	weighted_avg_per_box: number;
	current_default_per_box: number;
	shipment_count: number;
	current_warehouse_boxes: number;
}

export interface PalletStock {
	pallet_id: string;
	pallet_label: string;
	storage_space_id: string | null;
	storage_space_name: string | null;
	box_count: number;
	effective_pieces_per_box: number;
	total_pieces: number;
	status: "active" | "empty" | "retired";
}

export interface ItemOverview {
	item_id: number;
	item_name: string;
	short_label: string | null;
	sku: string | null;
	category_name: string | null;
	current_pieces_per_box: number;
	warehouse_boxes: number;
	warehouse_pieces: number;
	unit_cost: number | null;
	active_pallet_count: number;
	cbm: number | null;
	box_quantity:number;
	unit_of_measure:'string';
	min_quantity:number;
	created_at:string;
	barcode_text:string;
	cost_per_unit:number;
	current_unit_cost:number;
}

// ── NEW: Cost History ─────────────────────────────────────────────────────────

export interface ItemCostHistoryRecord {
	id: string;
	item_id: number;
	po_number: string | null;
	po_date: string | null;
	effective_date: string;
	unit_price_before: number | null;
	unit_cost_after: number;
	changed_by: string | null;
	notes: string | null;
	created_at: string;
}

// ─── Query: Item Overview ─────────────────────────────────────────────────────

export async function getItemOverview(
	itemId: number,
	warehouseLocationId: string
): Promise<ItemOverview | null> {
	const supabase = createServerSupabaseClient();

	// Fetch item details
	const { data: item, error: itemError } = await supabase
		.from("items")
		.select(
			`
      id,
      name,
      short_label,
      sku,
      box_quantity,
      unit_of_measure,
      min_quantity,
      created_at,
      barcode_text,
      cost_per_unit,
      current_unit_cost,
      category:category_id (name)
    `
		)
		.eq("id", itemId)
		.single();


	if (itemError || !item) return null;

	// Fetch warehouse pallet inventory totals
	const { data: palletRows } = await supabase
		.from("warehouse_inventory_overview")
		.select("box_count, effective_ppb, total_pieces, status")
		.eq("item_id", itemId)
		.in("status", ["active", "empty"]);

	const warehouseBoxes =
		palletRows?.reduce((sum, r) => sum + (r.box_count ?? 0), 0) ?? 0;
	const warehousePieces =
		palletRows?.reduce((sum, r) => sum + (r.total_pieces ?? 0), 0) ?? 0;
	const activePalletCount =
		palletRows?.filter((r) => r.status === "active").length ?? 0;

	return {
		item_id: item.id,
		item_name: item.name,
		short_label: item.short_label ?? null,
		sku: item.sku ?? null,
		category_name: (item.category as { name: string } | null)?.name ?? null,
		current_pieces_per_box: item.box_quantity ?? 0,
		warehouse_boxes: warehouseBoxes,
		warehouse_pieces: warehousePieces,
		box_quantity:item.box_quantity,
		unit_of_measure:item.unit_of_measure,
		min_quantity:item.min_quantity,
		created_at:item.created_at,
		barcode_text:item.barcode_text,
		cost_per_unit:item.cost_per_unit,
		current_unit_cost:item.current_unit_cost,
		active_pallet_count: activePalletCount,
	};
}

// ─── Query: Pallet-level stock breakdown ──────────────────────────────────────

export async function getItemPalletStock(itemId: number): Promise<PalletStock[]> {
	const supabase = createServerSupabaseClient();

	const { data, error } = await supabase
		.from("warehouse_inventory_overview")
		.select(
			`
      pallet_id,
      pallet_label,
      storage_space_id,
      box_count,
      effective_ppb,
      total_pieces,
      pallet_status
    `
		)
		.eq("item_id", itemId)
		.neq("pallet_status", "retired")
		.order("pallet_label");

	if (error || !data) return [];

	// Fetch storage space names separately
	const storageSpaceIds = [
		...new Set(data.map((r) => r.storage_space_id).filter(Boolean)),
	] as string[];

	let storageNames: Record<string, string> = {};
	if (storageSpaceIds.length > 0) {
		const { data: spaces } = await supabase
			.from("storage_spaces")
			.select("id, name")
			.in("id", storageSpaceIds);
		storageNames = Object.fromEntries(
			(spaces ?? []).map((s) => [s.id, s.name])
		);
	}

	return data.map((r) => ({
		pallet_id: r.pallet_id,
		pallet_label: r.pallet_label,
		storage_space_id: r.storage_space_id ?? null,
		storage_space_name: r.storage_space_id
			? (storageNames[r.storage_space_id] ?? null)
			: null,
		box_count: r.box_count,
		effective_pieces_per_box: r.effective_ppb,
		total_pieces: r.total_pieces,
		pallet_status: r.pallet_status as PalletStock["status"],
	}));
}

// ─── Query: Item Box Totals (D6 view) ─────────────────────────────────────────

export async function getItemBoxTotals(itemId: number): Promise<ItemBoxTotals | null> {
	const supabase = createServerSupabaseClient();

	const { data, error } = await supabase
		.from("item_box_totals")
		.select("*")
		.eq("item_id", itemId)
		.single();

	if (error || !data) return null;
	return data as ItemBoxTotals;
}

// ─── Query: Shipment Breakdown (D7 view) ─────────────────────────────────────

export async function getItemShipmentBreakdown(
	itemId: number
): Promise<ItemShipmentRecord[]> {
	const supabase = createServerSupabaseClient();

	const { data, error } = await supabase
		.from("item_shipment_breakdown")
		.select("*")
		.eq("item_id", itemId)
		.order("po_date", { ascending: false });

	if (error || !data) return [];
	return data as ItemShipmentRecord[];
}

// ─── RPC: Shipment History with nested box_configs (D8) ───────────────────────

export async function getItemShipmentHistory(
	itemId: number,
	organizationId: string
): Promise<ItemShipmentRecord[]> {
	const supabase = createServerSupabaseClient();

	const { data, error } = await supabase.rpc("get_item_shipment_history", {
		p_item_id: itemId,
		p_organization_id: organizationId,
	});
	console.log(data, error)

	if (error || !data) {
		// Graceful fallback to D7 view if RPC not yet deployed
		return getItemShipmentBreakdown(itemId);
	}

	return data as ItemShipmentRecord[];
}

// ─── Query: Cost History ──────────────────────────────────────────────────────

export async function getItemCostHistory(
	itemId: number
): Promise<ItemCostHistoryRecord[]> {
	const supabase = createServerSupabaseClient();

	const { data, error } = await supabase
		.from("item_cost_history")
		.select("*")
		.eq("item_id", itemId)
		.order("effective_date", { ascending: true });

	if (error || !data) return [];
	return data as ItemCostHistoryRecord[];
}