/**
 * lib/hooks/queries/useAnalytics.ts
 *
 * React Query hooks for Phase 4 analytics.
 * Follows the pattern in lib/hooks/queries/useOrderTickets.ts:
 *   - Reads  → server actions
 *   - Query key factory at the top
 *   - All analytics hooks use 5 min stale time (data doesn't change fast)
 */

import { useQuery } from "@tanstack/react-query";
import {
    getBurnRates,
    getReorderAlerts,
    getStoreOrderHistory,
    getStoreComparison,
    getMostOrderedItems,
    getWarehouseDepletionTrend,
} from "@/lib/supabase/actions/analyticsActions";
import {
    getItemCostTrends,
    getStoreBillingSummary,
    getWarehouseExpenseBreakdown,
    getMarginIndicators,
    type ItemCostTrendRow,
    type StoreBillingRow,
    type ExpenseBreakdownRow,
    type MarginIndicatorRow,
} from "@/lib/supabase/queries/analytics";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import type { DateRange } from "@/lib/supabase/queries/analytics";

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const analyticsKeys = {
    all: ["analytics"] as const,
    burnRates: (orgId: string, daysLookback: number) =>
        [...analyticsKeys.all, "burn-rates", orgId, daysLookback] as const,
    reorderAlerts: (orgId: string, leadTime: number, buffer: number) =>
        [
            ...analyticsKeys.all,
            "reorder-alerts",
            orgId,
            leadTime,
            buffer,
        ] as const,
    storeHistory: (locationId: string, dateRange?: DateRange) =>
        [...analyticsKeys.all, "store-history", locationId, dateRange] as const,
    storeComparison: (orgId: string, dateRange?: DateRange) =>
        [...analyticsKeys.all, "store-comparison", orgId, dateRange] as const,
    mostOrdered: (orgId: string, dateRange?: DateRange) =>
        [...analyticsKeys.all, "most-ordered", orgId, dateRange] as const,
    warehouseDepletion: (orgId: string, dateRange?: DateRange) =>
        [
            ...analyticsKeys.all,
            "warehouse-depletion",
            orgId,
            dateRange,
        ] as const,
};

// ─── useBurnRates ─────────────────────────────────────────────────────────────

export function useBurnRates(orgId: string | undefined, daysLookback = 90) {
    return useQuery({
        queryKey: analyticsKeys.burnRates(orgId ?? "", daysLookback),
        queryFn: () => getBurnRates(orgId!, daysLookback),
        enabled: !!orgId,
        staleTime: 5 * 60_000,
    });
}

// ─── useReorderAlerts ─────────────────────────────────────────────────────────

export function useReorderAlerts(
    orgId: string | undefined,
    leadTimeDays = 45,
    bufferDays = 14,
) {
    return useQuery({
        queryKey: analyticsKeys.reorderAlerts(
            orgId ?? "",
            leadTimeDays,
            bufferDays,
        ),
        queryFn: () => getReorderAlerts(orgId!, leadTimeDays, bufferDays),
        enabled: !!orgId,
        staleTime: 5 * 60_000,
    });
}

// ─── useStoreOrderHistory ─────────────────────────────────────────────────────

export function useStoreOrderHistory(
    locationId: string | undefined,
    dateRange?: DateRange,
) {
    return useQuery({
        queryKey: analyticsKeys.storeHistory(locationId ?? "", dateRange),
        queryFn: () => getStoreOrderHistory(locationId!, dateRange),
        enabled: !!locationId,
        staleTime: 5 * 60_000,
    });
}

// ─── useStoreComparison ───────────────────────────────────────────────────────

export function useStoreComparison(
    orgId: string | undefined,
    dateRange?: DateRange,
) {
    return useQuery({
        queryKey: analyticsKeys.storeComparison(orgId ?? "", dateRange),
        queryFn: () => getStoreComparison(orgId!, dateRange),
        enabled: !!orgId,
        staleTime: 5 * 60_000,
    });
}

// ─── useMostOrderedItems ──────────────────────────────────────────────────────

export function useMostOrderedItems(
    orgId: string | undefined,
    dateRange?: DateRange,
) {
    return useQuery({
        queryKey: analyticsKeys.mostOrdered(orgId ?? "", dateRange),
        queryFn: () => getMostOrderedItems(orgId!, dateRange),
        enabled: !!orgId,
        staleTime: 5 * 60_000,
    });
}

// ─── useWarehouseDepletion ────────────────────────────────────────────────────

export function useWarehouseDepletion(
    orgId: string | undefined,
    dateRange?: DateRange,
) {
    return useQuery({
        queryKey: analyticsKeys.warehouseDepletion(orgId ?? "", dateRange),
        queryFn: () => getWarehouseDepletionTrend(orgId!, dateRange),
        enabled: !!orgId,
        staleTime: 5 * 60_000,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// APPEND TO: lib/hooks/queries/useAnalytics.ts
//
// Task 4.9 — Cost analytics hooks
// All hooks: 5 minute stale time, consistent with existing analytics hooks.
// ───────────────────────────────────────────────

// Add these keys to the existing analyticsKeys factory:
//
// analyticsKeys.costTrends = (orgId, itemIds, dateRange) =>
//   [...analyticsKeys.all, "costTrends", orgId, itemIds, dateRange] as const
// analyticsKeys.storeBilling = (orgId, dateRange) =>
//   [...analyticsKeys.all, "storeBilling", orgId, dateRange] as const
// analyticsKeys.expenseBreakdown = (orgId, dateRange) =>
//   [...analyticsKeys.all, "expenseBreakdown", orgId, dateRange] as const
// analyticsKeys.marginIndicators = (orgId) =>
//   [...analyticsKeys.all, "marginIndicators", orgId] as const

const FIVE_MINUTES = 5 * 60 * 1000;

// ─── useItemCostTrends ────────────────────────────────────────────────────────
// Returns a time-series of landed cost per item from item_cost_history.
// Used for a line chart showing cost trends over time per item.
//
// Pass itemIds to scope to specific items (e.g. the user's selected items).
// Pass no itemIds to return trends for ALL items in the org.

export function useItemCostTrends(itemIds?: number[], dateRange?: DateRange) {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.members?.organization_id ?? "";

    return useQuery<ItemCostTrendRow[]>({
        queryKey: ["analytics", "costTrends", orgId, itemIds ?? [], dateRange],
        queryFn: () => getItemCostTrends(orgId, itemIds, dateRange),
        enabled: !!orgId,
        staleTime: FIVE_MINUTES,
    });
}

// ─── useStoreBilling ──────────────────────────────────────────────────────────
// Returns per-store billing totals aggregated from fulfilled ticket line_totals.
// Used for a bar chart or table showing which stores spend the most.
//
// Note: rows with null line_total are excluded — these are tickets fulfilled
// before task 1.22 (cost snapshot) was deployed.

export function useStoreBilling(dateRange?: DateRange) {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.members?.organization_id ?? "";

    return useQuery<StoreBillingRow[]>({
        queryKey: ["analytics", "storeBilling", orgId, dateRange],
        queryFn: () => getStoreBillingSummary(orgId, dateRange),
        enabled: !!orgId,
        staleTime: FIVE_MINUTES,
    });
}

// ─── useExpenseBreakdown ──────────────────────────────────────────────────────
// Returns warehouse expenses grouped by type and month.
// Used for a pie chart (total by type) or stacked bar chart (month-over-month).

export function useExpenseBreakdown(dateRange?: DateRange) {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.members?.organization_id ?? "";

    return useQuery<ExpenseBreakdownRow[]>({
        queryKey: ["analytics", "expenseBreakdown", orgId, dateRange],
        queryFn: () => getWarehouseExpenseBreakdown(orgId, dateRange),
        enabled: !!orgId,
        staleTime: FIVE_MINUTES,
    });
}

// ─── useMarginIndicators ──────────────────────────────────────────────────────
// Flags items where the transfer price on recent tickets is below the current
// landed cost. Sorted worst offenders first (largest price_gap at top).
//
// No dateRange — always compares current cost vs all historical snapshots
// so you catch stale pricing regardless of when it started drifting.

export function useMarginIndicators() {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.members?.organization_id ?? "";

    return useQuery<MarginIndicatorRow[]>({
        queryKey: ["analytics", "marginIndicators", orgId],
        queryFn: () => getMarginIndicators(orgId),
        enabled: !!orgId,
        staleTime: FIVE_MINUTES,
    });
}