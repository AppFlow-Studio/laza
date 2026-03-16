import type { Database } from '@/lib/supabase/types';
import { createClient } from '@supabase/supabase-js';

// Lazy client — created inside each function to avoid SSR module-load crash
function getClient() {
	return createClient<Database>(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
	);
}

type WarehousePallet = Database["public"]["Tables"]["warehouse_pallets"]["Row"];
type PalletInventory = Database["public"]["Tables"]["pallet_inventory"]["Row"];
type PalletOperationsLog =
	Database["public"]["Tables"]["pallet_operations_log"]["Row"];

export type PalletStatus = "active" | "empty" | "retired";

export type PalletWithDetails = WarehousePallet & {
	storage_spaces: { name: string; temperature_type: string } | null;
	purchase_orders: { po_number: string; supplier_name: string | null } | null;
	item_count: number;
	total_boxes: number;
	pallet_inventory: (PalletInventory & {
		items: { name: string; short_label: string | null; sku: string | null } | null;
		purchase_order_items: { pieces_per_box: number } | null;
	})[];
};

export type PalletStats = {
	total: number;
	active: number;
	empty: number;
	retired: number;
};

export type PalletFilters = {
	storageSpaceId?: string;
	status?: PalletStatus | "all";
	purchaseOrderId?: string;
	search?: string;
};

// ── getPallets ──────────────────────────────────────────────────────────────
export async function getPallets(
	warehouseLocationId: string,
	filters?: PalletFilters
): Promise<PalletWithDetails[]> {
	const supabase = getClient();

	let query = supabase
		.from("warehouse_pallets")
		.select(
			`
      *,
      storage_spaces ( name, temperature_type ),
      purchase_orders ( po_number, supplier_name ),
      pallet_inventory (
        *,
        items ( name, short_label, sku ),
        purchase_order_items ( pieces_per_box )
      )
    `
		)
		.eq("warehouse_location_id", warehouseLocationId);

	// Status filter — default excludes retired
	if (filters?.status && filters.status !== "all") {
		query = query.eq("status", filters.status);
	} else if (!filters?.status) {
		query = query.neq("status", "retired");
	}

	if (filters?.storageSpaceId) {
		query = query.eq("storage_space_id", filters.storageSpaceId);
	}

	if (filters?.purchaseOrderId) {
		query = query.eq("purchase_order_id", filters.purchaseOrderId);
	}

	const { data, error } = await query.order("received_at", {
		ascending: false,
	});

	if (error) throw error;

	// Compute derived fields and apply search filter
	let pallets = (data ?? []).map((pallet) => {
		const inventory = pallet.pallet_inventory ?? [];
		const item_count = inventory.length;
		const total_boxes = inventory.reduce(
			(sum: number, row: PalletInventory) => sum + (row.box_count ?? 0),
			0
		);
		return { ...pallet, item_count, total_boxes };
	});

	// Search: filter by pallet_label or item name
	if (filters?.search) {
		const term = filters.search.toLowerCase();
		pallets = pallets.filter((p) => {
			const labelMatch = p.pallet_label.toLowerCase().includes(term);
			const itemMatch = (p.pallet_inventory ?? []).some(
				(inv: PalletWithDetails["pallet_inventory"][number]) =>
					inv.items?.name.toLowerCase().includes(term) ||
					inv.items?.short_label?.toLowerCase().includes(term) ||
					inv.items?.sku?.toLowerCase().includes(term)
			);
			return labelMatch || itemMatch;
		});
	}

	return pallets as PalletWithDetails[];
}

// ── getPalletById ────────────────────────────────────────────────────────────
export async function getPalletById(
	palletId: string
): Promise<PalletWithDetails | null> {
	const supabase = getClient();

	const { data, error } = await supabase
		.from("warehouse_pallets")
		.select(
			`
      *,
      storage_spaces ( name, temperature_type ),
      purchase_orders ( po_number, supplier_name ),
      pallet_inventory (
        *,
        items ( name, short_label, sku, unit_of_measure, current_unit_cost ),
        purchase_order_items ( pieces_per_box, unit_cost_after )
      )
    `
		)
		.eq("id", palletId)
		.single();

	if (error) throw error;
	if (!data) return null;

	const inventory = data.pallet_inventory ?? [];
	const item_count = inventory.length;
	const total_boxes = inventory.reduce(
		(sum: number, row: PalletInventory) => sum + (row.box_count ?? 0),
		0
	);

	return { ...data, item_count, total_boxes } as PalletWithDetails;
}

// ── getPalletStats ───────────────────────────────────────────────────────────
export async function getPalletStats(
	warehouseLocationId: string
): Promise<PalletStats> {
	const supabase = getClient();

	const { data, error } = await supabase
		.from("warehouse_pallets")
		.select("status")
		.eq("warehouse_location_id", warehouseLocationId);

	if (error) throw error;

	const rows = data ?? [];
	return {
		total: rows.filter((r) => r.status !== "retired").length,
		active: rows.filter((r) => r.status === "active").length,
		empty: rows.filter((r) => r.status === "empty").length,
		retired: rows.filter((r) => r.status === "retired").length,
	};
}

// ── getPalletOperationsLog ───────────────────────────────────────────────────
export async function getPalletOperationsLog(
	palletId: string
): Promise<
	(PalletOperationsLog & {
		users: { first_name: string | null; last_name: string | null } | null;
		items: { name: string; short_label: string | null } | null;
		related_pallet: { pallet_label: string } | null;
	})[]
> {
	const supabase = getClient();

	const { data, error } = await supabase
		.from("pallet_operations_log")
		.select(
			`
      *,
      users ( first_name, last_name ),
      items ( name, short_label ),
      related_pallet:warehouse_pallets!pallet_operations_log_related_pallet_id_fkey ( pallet_label )
    `
		)
		.eq("pallet_id", palletId)
		.order("created_at", { ascending: false });

	if (error) throw error;
	return (data ?? []) as ReturnType<typeof getPalletOperationsLog> extends Promise<infer T> ? T : never;
}

// ── updatePalletStorageSpace ─────────────────────────────────────────────────
export async function updatePalletStorageSpace(
	palletId: string,
	storageSpaceId: string,
	userId: string
): Promise<void> {
	const supabase = getClient();

	const { error } = await supabase
		.from("warehouse_pallets")
		.update({ storage_space_id: storageSpaceId, updated_at: new Date().toISOString() })
		.eq("id", palletId);

	if (error) throw error;

	// Log the operation
	await supabase.from("pallet_operations_log").insert({
		organization_id: "", // will be set via RLS context
		pallet_id: palletId,
		operation_type: "moved",
		performed_by: userId,
		notes: "Storage space reassigned via Pallet Management UI",
	});
}

// ── retirePallet ─────────────────────────────────────────────────────────────
export async function retirePallet(
	palletId: string,
	userId: string
): Promise<void> {
	const supabase = getClient();

	// Only allow retiring empty pallets
	const { data: pallet } = await supabase
		.from("warehouse_pallets")
		.select("status, organization_id")
		.eq("id", palletId)
		.single();

	if (pallet?.status !== "empty") {
		throw new Error("Only empty pallets can be retired.");
	}

	const { error } = await supabase
		.from("warehouse_pallets")
		.update({
			status: "retired",
			retired_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq("id", palletId);

	if (error) throw error;

	await supabase.from("pallet_operations_log").insert({
		organization_id: pallet.organization_id,
		pallet_id: palletId,
		operation_type: "retired",
		performed_by: userId,
		notes: "Pallet retired via Pallet Management UI",
	});
}

// ── getPurchaseOrdersForFilter ───────────────────────────────────────────────
export async function getPurchaseOrdersForFilter(organizationId: string) {
	const supabase = getClient();

	const { data, error } = await supabase
		.from("purchase_orders")
		.select("id, po_number, supplier_name")
		.eq("organization_id", organizationId)
		.in("status", ["received", "arrived"])
		.order("created_at", { ascending: false });

	if (error) throw error;
	return data ?? [];
}