"use server";

import { createServerSupabaseClient, createServiceRoleClient } from "../server";

// ============================================================
// Types
// ============================================================

export type WarehouseLocation = {
    id: string;
    organization_id: string;
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
    };
    location_type: "warehouse";
    is_active: boolean;
    created_at: string;
    updated_at: string;
    storage_spaces?: WarehouseStorageSpace[];
};

export type WarehouseStorageSpace = {
    id: string;
    location_id: string;
    name: string;
    temperature_type: "frozen" | "refrigerated" | "dry";
    created_at: string;
    updated_at: string;
};

// Catalog item — NO quantity fields
// This is what store admins see when creating an order ticket
export type WarehouseCatalogItem = {
    id: number;
    organization_id: string;
    name: string;
    sku: string | null;
    unit_of_measure: "pcs" | "kg" | "liters" | "lbs" | "oz";
    box_quantity: number | null;
    is_warehouse_item: boolean;
    warehouse_transfer_price: number | null;
    category:
        | {
              id: number;
              name: string;
          }[]
        | null;
};

// Inventory item — row from warehouse_inventory_overview (pallet-level view)
// Super Admin only
export type WarehouseInventoryItem = {
    pallet_inventory_id: string;
    pallet_id: string;
    item_id: number;
    purchase_order_item_id: string | null;
    box_count: number;
    initial_box_count: number | null;
    pieces_per_box_override: number | null;
    inventory_created_at: string | null;
    inventory_updated_at: string | null;
    organization_id: string;
    pallet_label: string;
    pallet_status: string;
    storage_space_id: string | null;
    warehouse_location_id: string;
    purchase_order_id: string | null;
    received_at: string | null;
    item_name: string;
    item_display_label: string;
    sku: string | null;
    item_default_ppb: number | null;
    po_pieces_per_box: number | null;
    has_mixed_configs: boolean | null;
    effective_ppb: number | null;
    total_pieces: number | null;
    config_source: string | null;
};

export type WarehouseStats = {
    total_items: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_storage_spaces: number;
};

// ============================================================
// getWarehouses
// Returns ALL warehouse locations for an organization.
// Used for multi-warehouse list view.
// ============================================================

export async function getWarehouses(organizationId: string) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from("locations")
        .select(
            `
            *,
            storage_spaces (*)
        `,
        )
        .eq("organization_id", organizationId)
        .eq("location_type", "warehouse")
        .order("created_at", { ascending: true });


    if (error) throw error;
    return (data ?? []) as WarehouseLocation[];
}

// ============================================================
// getWarehouseById
// Returns a single warehouse location by its ID.
// Used for the warehouse detail page.
// ============================================================

export async function getWarehouseById(warehouseId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from("locations")
        .select(
            `
            *,
            storage_spaces (*)
        `,
        )
        .eq("id", warehouseId)
        .eq("location_type", "warehouse")
        .single();

    if (error) throw error;
    return data as WarehouseLocation;
}

// ============================================================
// getWarehouseLocation
// Returns the FIRST/primary warehouse for an organization.
// Kept for backwards compatibility — prefer getWarehouses()
// for new multi-warehouse-aware code.
// ============================================================

export async function getWarehouseLocation(organizationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from("locations")
        .select(
            `
            *,
            storage_spaces (*)
        `,
        )
        .eq("organization_id", organizationId)
        .eq("location_type", "warehouse")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

    // PGRST116 = no rows found — return null gracefully
    if (error?.code === "PGRST116") return null;
    if (error) throw error;
    return data as WarehouseLocation;
}

// ============================================================
// getWarehouseCatalog
// Returns items WITHOUT quantity data.
// Called by store admins when creating order tickets.
// Deliberately excludes any join to item_locations so
// current_quantity is never exposed to store admins.
// ============================================================

export async function getWarehouseCatalog(organizationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from("items_with_prices")
        .select(
            `
            id,
            organization_id,
            name,
            sku,
            unit_of_measure,
            box_quantity,
            is_warehouse_item,
            warehouse_transfer_price,
            category (
                id,
                name
            )
        `,
        )
        .eq("organization_id", organizationId)
        .eq("is_warehouse_item", true)
        .order("name", { ascending: true });

    if (error) throw error;
    return data as unknown as WarehouseCatalogItem[];
}

// ============================================================
// getWarehouseInventory
// Returns full inventory WITH current quantities.
// Super Admin only — never call this from store admin context.
// ============================================================

export async function getWarehouseInventory(warehouseLocationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from("warehouse_inventory_overview")
        .select("*")
        .eq("warehouse_location_id", warehouseLocationId)
        .neq("pallet_status", "retired")
        .order("item_name", { ascending: true });

    if (error) throw error;
    return data as WarehouseInventoryItem[];
}

// ============================================================
// getWarehouseStats
// Summary stats for the Super Admin dashboard home cards:
// total items, low stock count, out of stock count,
// and total storage spaces.
// ============================================================

export async function getWarehouseStats(
    warehouseLocationId: string,
): Promise<WarehouseStats> {
    const supabase = await createServerSupabaseClient();

    const { data: inventory, error: inventoryError } = await supabase
        .from("item_locations")
        .select(
            `
            current_quantity,
            min_quantity_override,
            items (
                min_quantity
            )
        `,
        )
        .eq("location_id", warehouseLocationId);

    if (inventoryError) throw inventoryError;

    const { data: storageSpaces, error: storageError } = await supabase
        .from("storage_spaces")
        .select("id")
        .eq("location_id", warehouseLocationId);

    if (storageError) throw storageError;

    const total_items = inventory?.length || 0;
    const total_storage_spaces = storageSpaces?.length || 0;

    let low_stock_count = 0;
    let out_of_stock_count = 0;

    inventory?.forEach((item: any) => {
        const effectiveMin =
            item.min_quantity_override ?? item.items?.min_quantity ?? 0;

        if (item.current_quantity === 0) {
            out_of_stock_count++;
        } else if (item.current_quantity < effectiveMin) {
            low_stock_count++;
        }
    });

    return {
        total_items,
        low_stock_count,
        out_of_stock_count,
        total_storage_spaces,
    };
}

// ── Pallets ───────────────────────────────────────────────────────────

export type PalletFilters = {
    status?: "active" | "empty" | "retired";
    storageSpaceId?: string;
};

export async function getPallets(
    warehouseLocationId: string,
    filters?: PalletFilters,
) {
    const supabase = await createServerSupabaseClient();

    let query = supabase
        .from("warehouse_pallets")
        .select(
            `
        *,
        storage_spaces ( id, name, temperature_type ),
        warehouse:locations(name),
      `,
        )
        .eq("warehouse_location_id", warehouseLocationId)
        .order("received_at", { ascending: true });

    if (filters?.status) {
        query = query.eq("status", filters.status);
    }
    if (filters?.storageSpaceId) {
        query = query.eq("storage_space_id", filters.storageSpaceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function getPalletById(palletId: string) {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from("warehouse_pallets")
        .select(
            `
        *,
        storage_spaces ( id, name, temperature_type ),
        warehouse:locations(name),
        pallet_inventory (
          *,
          items ( id, name, short_label, sku, unit_of_measure )
        )
      `,
        )
        .eq("id", palletId)
        .single();

    if (error) throw error;
    return data;
}

// ── Pallet Inventory ──────────────────────────────────────────────────

export async function getPalletInventory(palletId: string) {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from("pallet_inventory")
        .select(
            `
        *,
        items ( id, name, short_label, sku, unit_of_measure, box_quantity ),
        purchase_order_items ( id, pieces_per_box )
      `,
        )
        .eq("pallet_id", palletId)
        .gt("box_count", 0);

    if (error) throw error;
    return data;
}

// ── Warehouse Overview (uses the view from 1.46) ──────────────────────

export type WarehouseViewMode = "pallet" | "box" | "master";

export async function getWarehouseOverview(
    warehouseLocationId: string,
    mode: WarehouseViewMode = "pallet",
) {
    const supabase = await createServerSupabaseClient();

    const baseQuery = supabase
        .from("item_locations")
        .select("*")
        .eq("warehouse_location_id", warehouseLocationId);

    if (mode === "pallet") {
        const { data, error } = await baseQuery
            .order("pallet_label")
            .order("item_display_label");
        if (error) throw error;
        return data;
    }

    if (mode === "box") {
        // Box view: total boxes per item — aggregate client-side
        // (Supabase JS doesn't support GROUP BY natively)
        const { data, error } = await baseQuery;
        if (error) throw error;

        const grouped = data.reduce(
            (acc, row) => {
                const key = String(row.item_id);
                if (!acc[key]) {
                    acc[key] = {
                        item_id: row.item_id,
                        display_label: row.display_label,
                        sku: row.sku,
                        unit_of_measure: row.unit_of_measure,
                        total_boxes: 0,
                    };
                }
                acc[key].total_boxes += row.box_count;
                return acc;
            },
            {} as Record<string, any>,
        );

        return Object.values(grouped);
    }

    if (mode === "master") {
        // Master view: total pieces per item
        const { data, error } = await baseQuery;
        if (error) throw error;

        const grouped = data.reduce(
            (acc, row) => {
                const key = String(row.item_id);
                if (!acc[key]) {
                    acc[key] = {
                        item_id: row.item_id,
                        display_label: row.display_label,
                        sku: row.sku,
                        unit_of_measure: row.unit_of_measure,
                        total_pieces: 0,
                    };
                }
                acc[key].total_pieces += row.total_pieces ?? 0;
                return acc;
            },
            {} as Record<string, any>,
        );

        return Object.values(grouped);
    }
}

// ── Pallet Summary (quick stats for dashboard cards) ─────────────────

export async function getPalletSummary(warehouseLocationId: string) {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from("warehouse_pallets")
        .select("status")
        .eq("warehouse_location_id", warehouseLocationId);

    if (error) throw error;

    return {
        active: data.filter((p) => p.status === "active").length,
        empty: data.filter((p) => p.status === "empty").length,
        retired: data.filter((p) => p.status === "retired").length,
        total: data.length,
    };
}

// ── Pallet Operations Log ─────────────────────────────────────────────

export async function getPalletOperationsLog(palletId: string, limit = 50) {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from("pallet_operations_log")
        .select(
            `
        *,
        users ( id, first_name, last_name, email )
      `,
        )
        .eq("pallet_id", palletId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

// ── Rent Snapshots ────────────────────────────────────────────────────

export async function getRentSnapshots(
    organizationId: string,
    limit = 24, // 2 years of monthly snapshots by default
) {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from("warehouse_rent_snapshots")
        .select("*")
        .eq("organization_id", organizationId)
        .order("snapshot_date", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}
