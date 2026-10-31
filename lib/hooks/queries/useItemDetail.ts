import { useQuery } from "@tanstack/react-query";
import { useOrganization } from "@clerk/nextjs";
import {
	getItemOverview,
	getItemPalletStock,
	getItemBoxTotals,
	getItemShipmentHistory,
	getItemCostHistory,
} from "@/lib/supabase/queries/itemDetail";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const itemDetailKeys = {
	all: (itemId: number) => ["item-detail", itemId] as const,
	overview: (itemId: number, warehouseLocationId: string) =>
		["item-detail", itemId, "overview", warehouseLocationId] as const,
	palletStock: (itemId: number) =>
		["item-detail", itemId, "pallet-stock"] as const,
	boxTotals: (itemId: number) =>
		["item-detail", itemId, "box-totals"] as const,
	shipmentHistory: (itemId: number, orgId: string) =>
		["item-detail", itemId, "shipment-history", orgId] as const,
	costHistory: (itemId: number) =>
		["item-detail", itemId, "cost-history"] as const,
};

// ─── Hook: Item Overview ──────────────────────────────────────────────────────

export function useItemOverview(
	itemId: number | null,
	warehouseLocationId: string | null
) {
	return useQuery({
		queryKey: itemDetailKeys.overview(itemId!, warehouseLocationId!),
		queryFn: () => getItemOverview(itemId!, warehouseLocationId!),
		enabled: !!itemId && !!warehouseLocationId,
		staleTime: 30_000, // 30s — warehouse stock changes frequently
	});
}

// ─── Hook: Pallet Stock Breakdown ────────────────────────────────────────────

export function useItemPalletStock(itemId: number | null) {
	return useQuery({
		queryKey: itemDetailKeys.palletStock(itemId!),
		queryFn: () => getItemPalletStock(itemId!),
		enabled: !!itemId,
		staleTime: 30_000,
	});
}

// ─── Hook: Item Box Totals (Totals View) ─────────────────────────────────────

export function useItemBoxTotals(itemId: number | null) {
	return useQuery({
		queryKey: itemDetailKeys.boxTotals(itemId!),
		queryFn: () => getItemBoxTotals(itemId!),
		enabled: !!itemId,
		staleTime: 60_000, // 1 min — totals are aggregated, change less often
	});
}

// ─── Hook: Shipment History ───────────────────────────────────────────────────

export function useItemShipmentHistory(itemId: number | null) {
	const { organization } = useOrganization();
	const orgId = organization?.id ?? "";

	return useQuery({
		queryKey: itemDetailKeys.shipmentHistory(itemId!, orgId),
		queryFn: () => getItemShipmentHistory(itemId!, orgId),
		enabled: !!itemId && !!orgId,
		staleTime: 5 * 60_000, // 5 min — shipment history rarely changes
	});
}

// ─── Hook: Cost History ───────────────────────────────────────────────────────

export function useItemCostHistory(itemId: number | null) {
	return useQuery({
		queryKey: itemDetailKeys.costHistory(itemId!),
		queryFn: () => getItemCostHistory(itemId!),
		enabled: !!itemId,
		staleTime: 5 * 60_000, // 5 min — cost history changes only on new POs
	});
}