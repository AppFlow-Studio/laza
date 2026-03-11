// lib/hooks/queries/useWarehouse.ts

import { useQuery } from "@tanstack/react-query";
import {
    getWarehouses,
    getWarehouseById,
    getWarehouseLocation,
    getWarehouseInventory,
    getWarehouseCatalog,
    getWarehouseStats,
} from "@/lib/supabase/queries/warehouse";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";

// ─── Multi-warehouse hooks ────────────────────────────────────────────────────

/** Returns ALL warehouse locations for the current org */
export function useWarehouses() {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.members?.organization_id;

    return useQuery({
        queryKey: ["warehouses", orgId],
        queryFn: () => getWarehouses(orgId!),
        enabled: !!orgId,
        staleTime: 5 * 60 * 1000,
    });
}

/** Returns a single warehouse by its location ID */
export function useWarehouseById(warehouseId: string) {
    return useQuery({
        queryKey: ["warehouse", warehouseId],
        queryFn: () => getWarehouseById(warehouseId),
        enabled: !!warehouseId,
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Legacy single-warehouse hook (backwards compat) ─────────────────────────

/** Returns the first/primary warehouse for the org.
 *  Prefer useWarehouses() for new multi-warehouse-aware code. */
export function useWarehouseLocation() {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.members?.organization_id;

    return useQuery({
        queryKey: ["warehouse-location", orgId],
        queryFn: () => getWarehouseLocation(orgId!),
        enabled: !!orgId,
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Inventory hooks ──────────────────────────────────────────────────────────

/** Full warehouse inventory including quantities — Super Admin only */
export function useWarehouseInventory(warehouseLocationId: string) {
    return useQuery({
        queryKey: ["warehouse-inventory", warehouseLocationId],
        queryFn: () => getWarehouseInventory(warehouseLocationId),
        enabled: !!warehouseLocationId,
        staleTime: 30 * 1000,
    });
}

/** Warehouse catalog without quantities — safe for Store Admins */
export function useWarehouseCatalog() {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.members?.organization_id;

    return useQuery({
        queryKey: ["warehouse-catalog", orgId],
        queryFn: () => getWarehouseCatalog(orgId!),
        enabled: !!orgId,
        staleTime: 5 * 60 * 1000,
    });
}

/** Warehouse stats for dashboard cards */
export function useWarehouseStats(warehouseLocationId: string) {
    return useQuery({
        queryKey: ["warehouse-stats", warehouseLocationId],
        queryFn: () => getWarehouseStats(warehouseLocationId),
        enabled: !!warehouseLocationId,
        staleTime: 60 * 1000,
    });
}