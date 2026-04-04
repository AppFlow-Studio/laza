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
import type { DateRange } from "@/lib/supabase/queries/analytics";

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const analyticsKeys = {
	all:               ["analytics"] as const,
	burnRates:         (orgId: string, daysLookback: number) =>
		[...analyticsKeys.all, "burn-rates", orgId, daysLookback] as const,
	reorderAlerts:     (orgId: string, leadTime: number, buffer: number) =>
		[...analyticsKeys.all, "reorder-alerts", orgId, leadTime, buffer] as const,
	storeHistory:      (locationId: string, dateRange?: DateRange) =>
		[...analyticsKeys.all, "store-history", locationId, dateRange] as const,
	storeComparison:   (orgId: string, dateRange?: DateRange) =>
		[...analyticsKeys.all, "store-comparison", orgId, dateRange] as const,
	mostOrdered:       (orgId: string, dateRange?: DateRange) =>
		[...analyticsKeys.all, "most-ordered", orgId, dateRange] as const,
	warehouseDepletion:(orgId: string, dateRange?: DateRange) =>
		[...analyticsKeys.all, "warehouse-depletion", orgId, dateRange] as const,
};

// ─── useBurnRates ─────────────────────────────────────────────────────────────

export function useBurnRates(
	orgId: string | undefined,
	daysLookback = 90,
) {
	return useQuery({
		queryKey:  analyticsKeys.burnRates(orgId ?? "", daysLookback),
		queryFn:   () => getBurnRates(orgId!, daysLookback),
		enabled:   !!orgId,
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
		queryKey:  analyticsKeys.reorderAlerts(orgId ?? "", leadTimeDays, bufferDays),
		queryFn:   () => getReorderAlerts(orgId!, leadTimeDays, bufferDays),
		enabled:   !!orgId,
		staleTime: 5 * 60_000,
	});
}

// ─── useStoreOrderHistory ─────────────────────────────────────────────────────

export function useStoreOrderHistory(
	locationId: string | undefined,
	dateRange?: DateRange,
) {
	return useQuery({
		queryKey:  analyticsKeys.storeHistory(locationId ?? "", dateRange),
		queryFn:   () => getStoreOrderHistory(locationId!, dateRange),
		enabled:   !!locationId,
		staleTime: 5 * 60_000,
	});
}

// ─── useStoreComparison ───────────────────────────────────────────────────────

export function useStoreComparison(
	orgId: string | undefined,
	dateRange?: DateRange,
) {
	return useQuery({
		queryKey:  analyticsKeys.storeComparison(orgId ?? "", dateRange),
		queryFn:   () => getStoreComparison(orgId!, dateRange),
		enabled:   !!orgId,
		staleTime: 5 * 60_000,
	});
}

// ─── useMostOrderedItems ──────────────────────────────────────────────────────

export function useMostOrderedItems(
	orgId: string | undefined,
	dateRange?: DateRange,
) {
	return useQuery({
		queryKey:  analyticsKeys.mostOrdered(orgId ?? "", dateRange),
		queryFn:   () => getMostOrderedItems(orgId!, dateRange),
		enabled:   !!orgId,
		staleTime: 5 * 60_000,
	});
}

// ─── useWarehouseDepletion ────────────────────────────────────────────────────

export function useWarehouseDepletion(
	orgId: string | undefined,
	dateRange?: DateRange,
) {
	return useQuery({
		queryKey:  analyticsKeys.warehouseDepletion(orgId ?? "", dateRange),
		queryFn:   () => getWarehouseDepletionTrend(orgId!, dateRange),
		enabled:   !!orgId,
		staleTime: 5 * 60_000,
	});
}