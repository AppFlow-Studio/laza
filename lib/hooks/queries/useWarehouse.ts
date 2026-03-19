// lib/hooks/queries/useWarehouse.ts

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getWarehouses,
    getWarehouseById,
    getWarehouseLocation,
    getWarehouseInventory,
    getWarehouseCatalog,
    getWarehouseStats,
    getPallets,
    getPalletById,
    getPalletInventory,
    getWarehouseOverview,
    getPalletSummary,
    getPalletOperationsLog,
    type PalletFilters,
    type WarehouseViewMode,
    getRentSnapshots,
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
// ── Query Keys ────────────────────────────────────────────────────────

export const warehouseKeys = {
    all: ["warehouse"] as const,
    pallets: (locationId: string, filters?: PalletFilters) =>
        [...warehouseKeys.all, "pallets", locationId, filters] as const,
    pallet: (palletId: string) =>
        [...warehouseKeys.all, "pallet", palletId] as const,
    palletInventory: (palletId: string) =>
        [...warehouseKeys.all, "palletInventory", palletId] as const,
    overview: (locationId: string, mode: WarehouseViewMode) =>
        [...warehouseKeys.all, "overview", locationId, mode] as const,
    summary: (locationId: string) =>
        [...warehouseKeys.all, "summary", locationId] as const,
    opsLog: (palletId: string) =>
        [...warehouseKeys.all, "opsLog", palletId] as const,
    rentSnapshots: (organizationId: string) =>
        [...warehouseKeys.all, "rentSnapshots", organizationId] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────

export function usePallets(
    warehouseLocationId: string,
    filters?: PalletFilters,
) {
    return useQuery({
        queryKey: warehouseKeys.pallets(warehouseLocationId, filters),
        queryFn: () => getPallets(warehouseLocationId, filters),
        enabled: !!warehouseLocationId,
        staleTime: 30_000,
    });
}

export function usePallet(palletId: string) {
    return useQuery({
        queryKey: warehouseKeys.pallet(palletId),
        queryFn: () => getPalletById(palletId),
        enabled: !!palletId,
        staleTime: 30_000,
    });
}

export function usePalletInventory(palletId: string) {
    return useQuery({
        queryKey: warehouseKeys.palletInventory(palletId),
        queryFn: () => getPalletInventory(palletId),
        enabled: !!palletId,
        staleTime: 30_000,
    });
}

export function useWarehouseOverview(
    warehouseLocationId: string,
    mode: WarehouseViewMode = "pallet",
) {
    return useQuery({
        queryKey: warehouseKeys.overview(warehouseLocationId, mode),
        queryFn: () => getWarehouseOverview(warehouseLocationId, mode),
        enabled: !!warehouseLocationId,
        staleTime: 30_000,
    });
}

export function usePalletSummary(warehouseLocationId: string) {
    return useQuery({
        queryKey: warehouseKeys.summary(warehouseLocationId),
        queryFn: () => getPalletSummary(warehouseLocationId),
        enabled: !!warehouseLocationId,
        staleTime: 60_000,
    });
}

export function usePalletOperationsLog(palletId: string, limit = 50) {
    return useQuery({
        queryKey: warehouseKeys.opsLog(palletId),
        queryFn: () => getPalletOperationsLog(palletId, limit),
        enabled: !!palletId,
        staleTime: 30_000,
    });
}

// ── Cache invalidation helper (used by 2.25 pallet reorganization UI) ─

export function useInvalidateWarehouse() {
    const queryClient = useQueryClient();
    return (warehouseLocationId?: string) => {
        queryClient.invalidateQueries({ queryKey: warehouseKeys.all });
    };
}

export function useRentSnapshots(organizationId: string, limit = 24) {
    return useQuery({
        queryKey: warehouseKeys.rentSnapshots(organizationId),
        queryFn: () => getRentSnapshots(organizationId, limit),
        enabled: !!organizationId,
        staleTime: 5 * 60_000, // 5 min — data only changes once a month
    });
}
