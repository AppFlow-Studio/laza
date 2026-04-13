import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@clerk/nextjs";
import {
	getPalletsAction,
	getAllPalletsAction,
	getPalletStatsAction,
	getAllPalletStatsAction,
	getPalletByIdAction,
	getPalletOperationsLogAction,
	getPurchaseOrdersForPalletFilterAction,
	retirePalletAction,
} from "@/lib/supabase/actions/palletActions";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import type { PalletFilters } from "@/lib/supabase/queries/pallets";

// ── Query Keys ────────────────────────────────────────────────────────────────
export const palletKeys = {
	all:      ["pallets"] as const,
	lists:    ()                                             => [...palletKeys.all, "list"] as const,
	list:     (locationId: string, filters?: PalletFilters) => [...palletKeys.lists(), locationId, filters] as const,
	detail:   (id: string)         => [...palletKeys.all, "detail", id] as const,
	stats:    (locationId: string) => [...palletKeys.all, "stats", locationId] as const,
	log:      (palletId: string)   => [...palletKeys.all, "log", palletId] as const,
	poFilter: (orgId: string)      => [...palletKeys.all, "po-filter", orgId] as const,
};

// ── usePallets ────────────────────────────────────────────────────────────────
export function usePallets(
	warehouseLocationId: string | undefined,
	filters?: PalletFilters
) {
	return useQuery({
		queryKey: palletKeys.list(warehouseLocationId ?? "all", filters),
		queryFn:  warehouseLocationId
			? () => getPalletsAction(warehouseLocationId, filters)
			: () => getAllPalletsAction(filters),
		enabled:  !!warehouseLocationId,
		staleTime: 30_000,
	});
}

// ── usePallet ─────────────────────────────────────────────────────────────────
export function usePallet(palletId: string | undefined) {
	return useQuery({
		queryKey:  palletKeys.detail(palletId ?? ""),
		queryFn:   () => getPalletByIdAction(palletId!),
		enabled:   !!palletId,
		staleTime: 30_000,
	});
}

// ── usePalletStats ────────────────────────────────────────────────────────────
export function usePalletStats(warehouseLocationId: string | undefined) {
	return useQuery({
		queryKey: palletKeys.stats(warehouseLocationId ?? "all"),
		queryFn:  warehouseLocationId
			? () => getPalletStatsAction(warehouseLocationId)
			: () => getAllPalletStatsAction(),
		enabled:  true,
		staleTime: 60_000,
	});
}

// ── usePalletOperationsLog ────────────────────────────────────────────────────
export function usePalletOperationsLog(palletId: string | undefined) {
	return useQuery({
		queryKey:  palletKeys.log(palletId ?? ""),
		queryFn:   () => getPalletOperationsLogAction(palletId!),
		enabled:   !!palletId,
		staleTime: 30_000,
	});
}

// ── usePurchaseOrdersForFilter ────────────────────────────────────────────────
export function usePurchaseOrdersForFilter() {
	const { organization } = useOrganization();
	return useQuery({
		queryKey:  palletKeys.poFilter(organization?.id ?? ""),
		queryFn:   () => getPurchaseOrdersForPalletFilterAction(organization!.id),
		enabled:   !!organization?.id,
		staleTime: 300_000,
	});
}

// ── useRetirePallet ───────────────────────────────────────────────────────────
export function useRetirePallet() {
	const queryClient        = useQueryClient();
	const { data: userInfo } = useUserInfo();

	return useMutation({
		mutationFn: (palletId: string) =>
			retirePalletAction(palletId, userInfo?.id ?? ""),

		onSuccess: (_, palletId) => {
			queryClient.invalidateQueries({ queryKey: palletKeys.lists() });
			queryClient.invalidateQueries({ queryKey: palletKeys.detail(palletId) });
			queryClient.invalidateQueries({ queryKey: palletKeys.all });
		},
	});
}