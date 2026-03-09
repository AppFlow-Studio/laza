// lib/hooks/queries/useWarehouse.ts
//
// React Query hooks for warehouse data — Task 2.11.
// Wraps the four functions in lib/supabase/queries/warehouse.ts.
// Follows the exact same pattern as useLocations.ts and useInventory.ts:
//   useQuery for reads, useMutation for writes, with cache invalidation.
//
// Stale times (from Developer Task Plan v3, Task 2.11):
//   useWarehouseLocation  — 5 min  (changes rarely)
//   useWarehouseInventory — 30s    (quantities change frequently)
//   useWarehouseCatalog   — 5 min  (catalog changes rarely)
//   useWarehouseStats     — 1 min  (dashboard summary cards)

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
    getWarehouseLocation,
    getWarehouseCatalog,
    getWarehouseInventory,
    getWarehouseStats,
} from "@/lib/supabase/queries/warehouse";

// ---------------------------------------------------------------------------
// Query key factory
// Mirrors the pattern in useLocations.ts / useInventory.ts.
// Centralising keys here means cache invalidation (e.g. after fulfilling
// an order ticket in Task 3.12) can target exactly the right entries.
// ---------------------------------------------------------------------------

export const warehouseKeys = {
    // All warehouse queries for this org
    all: (organizationId: string) =>
        ["warehouse", organizationId] as const,

    // The warehouse location record + its storage spaces
    location: (organizationId: string) =>
        [...warehouseKeys.all(organizationId), "location"] as const,

    // Full inventory with quantities (super admin only)
    inventory: (warehouseLocationId: string) =>
        ["warehouse", "inventory", warehouseLocationId] as const,

    // Item catalog without quantities (store admin safe)
    catalog: (organizationId: string) =>
        [...warehouseKeys.all(organizationId), "catalog"] as const,

    // Dashboard summary stats
    stats: (warehouseLocationId: string) =>
        ["warehouse", "stats", warehouseLocationId] as const,
};

// ---------------------------------------------------------------------------
// 1. useWarehouseLocation
//    Fetches the single warehouse location + its storage spaces.
//    Used by: Super Admin warehouse page (2.4), store admin order creation
//    (needs warehouse location ID to attach to order tickets — Task 3.2).
//    Stale time: 5 minutes.
// ---------------------------------------------------------------------------

export function useWarehouseLocation() {
    const { orgId } = useAuth();

    return useQuery({
        queryKey: warehouseKeys.location(orgId ?? ""),
        queryFn: () => getWarehouseLocation(orgId!),
        enabled: !!orgId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// ---------------------------------------------------------------------------
// 2. useWarehouseInventory
//    Fetches all items WITH current quantities for a warehouse location.
//    SUPER ADMIN ONLY — do not call from store admin components.
//    RLS enforces this at the DB level even if called accidentally.
//    Stale time: 30 seconds (quantities change when orders are fulfilled).
// ---------------------------------------------------------------------------

export function useWarehouseInventory(warehouseLocationId: string | undefined) {
    return useQuery({
        queryKey: warehouseKeys.inventory(warehouseLocationId ?? ""),
        queryFn: () => getWarehouseInventory(warehouseLocationId!),
        enabled: !!warehouseLocationId,
        staleTime: 30 * 1000, // 30 seconds
    });
}

// ---------------------------------------------------------------------------
// 3. useWarehouseCatalog
//    Fetches items WITHOUT quantity data.
//    Safe to call from store admin context — used on the new order creation
//    page (Task 3.2) to let store admins browse what is available to order.
//    Stale time: 5 minutes (catalog items change infrequently).
// ---------------------------------------------------------------------------

export function useWarehouseCatalog() {
    const { orgId } = useAuth();

    return useQuery({
        queryKey: warehouseKeys.catalog(orgId ?? ""),
        queryFn: () => getWarehouseCatalog(orgId!),
        enabled: !!orgId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// ---------------------------------------------------------------------------
// 4. useWarehouseStats
//    Fetches summary stats for the Super Admin dashboard home cards (Task 2.3):
//    total items, low stock count, out of stock count, total storage spaces.
//    Stale time: 1 minute.
// ---------------------------------------------------------------------------

export function useWarehouseStats(warehouseLocationId: string | undefined) {
    return useQuery({
        queryKey: warehouseKeys.stats(warehouseLocationId ?? ""),
        queryFn: () => getWarehouseStats(warehouseLocationId!),
        enabled: !!warehouseLocationId,
        staleTime: 60 * 1000, // 1 minute
    });
}