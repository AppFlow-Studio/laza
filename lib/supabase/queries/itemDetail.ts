'use server';

import { createServiceRoleClient } from '../server';

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
	config_notes: string;
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
	has_mixed_configs: boolean;
	status: "active" | "empty" | "retired";
}

export interface ItemOverview {
	item_id: number;
	item_name: string;
	short_label: string | null;
	sku: string | null;
	category_name: string | null;
	current_pieces_per_box: number;
	has_mixed_configs: boolean;
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
	const supabase = createServiceRoleClient();

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

	console.log("item",item, itemError)


	if (itemError || !item) return null;

	// Fetch warehouse pallet inventory totals (scoped to this warehouse)
	const { data: palletRows, error: palletError } = await supabase
		.from("pallet_inventory")
		.select("box_count, pieces_per_box_override, warehouse_pallets!inner(id, status, warehouse_location_id), purchase_order_items(pieces_per_box, has_mixed_configs, po_item_box_configs(pieces_per_box, box_count, total_pieces))")
		.eq("item_id", itemId)
		.eq("warehouse_pallets.warehouse_location_id", warehouseLocationId)
		.in("warehouse_pallets.status", ["active", "empty"])
		.gt("box_count", 0);

	const defaultPpb = item.box_quantity ?? 0;
	const warehouseBoxes =
		palletRows?.reduce((sum, r) => sum + (r.box_count ?? 0), 0) ?? 0;
	const warehousePieces =
		palletRows?.reduce((sum: number, r: any) => {
			const configs = r.purchase_order_items?.po_item_box_configs as
				| { pieces_per_box: number; box_count: number; total_pieces: number | null }[]
				| undefined;
			if (configs && configs.length > 0) {
				return sum + configs.reduce((s, c) => s + (c.total_pieces ?? c.box_count * c.pieces_per_box), 0);
			}
			const ppb = r.pieces_per_box_override ?? defaultPpb;
			return sum + (r.box_count ?? 0) * ppb;
		}, 0) ?? 0;
	const activePalletCount =
		palletRows?.filter((r: any) => (r.warehouse_pallets as any)?.status === "active").length ?? 0;
	const hasMixedConfigs =
		palletRows?.some((r: any) => r.purchase_order_items?.has_mixed_configs === true) ?? false;

	console.log("palletRows", palletRows, palletError)



	return {
		item_id: item.id,
		item_name: item.name,
		short_label: item.short_label ?? null,
		sku: item.sku ?? null,
		category_name: (item.category as { name: string } | null)?.name ?? null,
		current_pieces_per_box: item.box_quantity ?? 0,
		has_mixed_configs: hasMixedConfigs,
		warehouse_boxes: warehouseBoxes,
		warehouse_pieces: warehousePieces,
		box_quantity:item.box_quantity,
		unit_of_measure:item.unit_of_measure,
		min_quantity:item.min_quantity,
		created_at:item.created_at,
		barcode_text:item.barcode_text,
		cost_per_unit:item.cost_per_unit,
		current_unit_cost:item.current_unit_cost,
		unit_cost: item.current_unit_cost ?? null,
		cbm: null, // not stored per-item; available per PO line in purchase_order_items
		active_pallet_count: activePalletCount,
	};
}

// ─── Query: Pallet-level stock breakdown ──────────────────────────────────────

export async function getItemPalletStock(itemId: number): Promise<PalletStock[]> {
	const supabase = createServiceRoleClient();

	const { data, error } = await supabase
		.from("pallet_inventory")
		.select(
			`
      id,
      box_count,
      pieces_per_box_override,
      warehouse_pallets!inner(id, pallet_label, status, storage_space_id),
      items!inner(box_quantity),
      purchase_order_items(pieces_per_box, has_mixed_configs, po_item_box_configs(pieces_per_box, box_count, total_pieces))
    `
		)
		.eq("item_id", itemId)
		.neq("warehouse_pallets.status", "retired")
		.gt("box_count", 0);

	console.log("palletStock", data, error)

	if (error || !data) return [];

	// Fetch storage space names separately
	const storageSpaceIds = [
		...new Set(
			data
				.map((r: any) => (r.warehouse_pallets as any)?.storage_space_id)
				.filter(Boolean)
		),
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

	return (data as any[]).map((r) => {
		const pallet = r.warehouse_pallets as any;
		const poi = r.purchase_order_items as any;
		const configs = poi?.po_item_box_configs as
			| { pieces_per_box: number; box_count: number; total_pieces: number | null }[]
			| undefined;
		const ppb = r.pieces_per_box_override ?? poi?.pieces_per_box ?? (r.items as any)?.box_quantity ?? 0;
		const total_pieces =
			configs && configs.length > 0
				? configs.reduce((s, c) => s + (c.total_pieces ?? c.box_count * c.pieces_per_box), 0)
				: r.box_count * ppb;
		return {
			pallet_id: pallet.id,
			pallet_label: pallet.pallet_label,
			storage_space_id: pallet.storage_space_id ?? null,
			storage_space_name: pallet.storage_space_id
				? (storageNames[pallet.storage_space_id] ?? null)
				: null,
			box_count: r.box_count,
			effective_pieces_per_box: ppb,
			total_pieces,
			has_mixed_configs: poi?.has_mixed_configs ?? false,
			status: pallet.status as PalletStock["status"],
		};
	});
}

// ─── Query: Item Box Totals (D6 view) ─────────────────────────────────────────

export async function getItemBoxTotals(itemId: number): Promise<ItemBoxTotals | null> {
	const supabase = createServiceRoleClient();

	const { data, error } = await supabase
		.from("item_box_totals")
		.select("*")
		.eq("item_id", itemId)
		.single();
	console.log("item_box_totals ",data, error)

	if (error || !data) return null;
	return data as ItemBoxTotals;
}

// ─── Query: Shipment Breakdown (D7 view) ─────────────────────────────────────

export async function getItemShipmentBreakdown(
	itemId: number
): Promise<ItemShipmentRecord[]> {
	const supabase = createServiceRoleClient();

	const { data, error } = await supabase
		.from("item_shipment_breakdown")
		.select("*")
		.eq("item_id", itemId)
		.order("po_date", { ascending: false });
	console.log("item_shipment_breakdown ",data, error)


	if (error || !data) return [];
	return data as ItemShipmentRecord[];
}

// ─── RPC: Shipment History with nested box_configs (D8) ───────────────────────

export async function getItemShipmentHistory(
	itemId: number,
	organizationId: string
): Promise<ItemShipmentRecord[]> {
	const supabase = createServiceRoleClient();

	const { data, error } = await supabase.rpc("get_item_shipment_history", {
		p_item_id: itemId,
		p_organization_id: organizationId,
	});
	console.log("shipment history",data, error)

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
	const supabase = createServiceRoleClient();

	const { data, error } = await supabase
		.from("item_cost_history")
		.select(`
      id,
      item_id,
      unit_price_before,
      unit_cost_after,
      effective_date,
      created_at,
      purchase_orders ( po_number, order_date )
    `)
		.eq("item_id", itemId)
		.order("effective_date", { ascending: true });
	console.log("item_cost_history ",data, error)

	if (error || !data) return [];

	return data.map((r: any) => ({
		id:                r.id,
		item_id:           r.item_id,
		po_number:         r.purchase_orders?.po_number ?? null,
		po_date:           r.purchase_orders?.order_date ?? null,
		effective_date:    r.effective_date,
		unit_price_before: r.unit_price_before ?? null,
		unit_cost_after:   r.unit_cost_after,
		changed_by:        null, // not stored in current schema
		notes:             null, // not stored in current schema
		created_at:        r.created_at,
	}));
}