"use server";

import { createServerSupabaseClient } from "../server";

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
    // Supabase returns nested one-to-many as array even for single records
    category:
        | {
              id: number;
              name: string;
          }[]
        | null;
};

// Inventory item — includes quantity fields
// Super Admin only
export type WarehouseInventoryItem = {
    id: string;
    item_id: number;
    location_id: string;
    storage_space_id: string | null;
    current_quantity: number;
    min_quantity_override: number | null;
    last_updated: string;
    items: {
        id: number;
        name: string;
        sku: string | null;
        unit_of_measure: string;
        box_quantity: number | null;
        min_quantity: number;
        category: {
            id: number;
            name: string;
        } | null;
    };
    storage_spaces: WarehouseStorageSpace | null;
};

export type WarehouseStats = {
    total_items: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_storage_spaces: number;
};

// ============================================================
// getWarehouseLocation
// Returns the single warehouse location for an organization.
// Every other warehouse function depends on this ID.
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
        .single();

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
        .from("items")
        .select(
            `
            id,
            organization_id,
            name,
            sku,
            unit_of_measure,
            box_quantity,
            category (
                id,
                name
            )
        `,
        )
        .eq("organization_id", organizationId)
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
        .from("item_locations")
        .select(
            `
            *,
            items (
                id,
                name,
                sku,
                unit_of_measure,
                box_quantity,
                min_quantity,
                category (
                    id,
                    name
                )
            ),
            storage_spaces (*)
        `,
        )
        .eq("location_id", warehouseLocationId)
        .order("last_updated", { ascending: false });

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

    // Fetch all item_locations for the warehouse with item min quantities
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

    // Fetch storage spaces count
    const { data: storageSpaces, error: storageError } = await supabase
        .from("storage_spaces")
        .select("id")
        .eq("location_id", warehouseLocationId);

    if (storageError) throw storageError;

    // Calculate stats
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