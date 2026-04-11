// /super-admin/warehouse/pallets
"use client";

import { useState, useCallback } from "react";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { usePallets, usePalletStats, usePurchaseOrdersForFilter } from "@/lib/hooks/queries/usePallets";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { PalletFilters } from "@/lib/supabase/queries/pallets";
import { PalletStatsRow } from "@/components/pallets/PalletStatsRow";
import { PalletFiltersBar } from "@/components/pallets/PalletFiltersBar";
import { PalletTable } from "@/components/pallets/PalletTable";
import { PalletTableSkeleton } from "@/components/pallets/PalletTableSkeleton";

export default function PalletsPage() {
	// useWarehouseLocation takes NO args — gets org via useUserInfo() internally
	const { data: warehouseLocation, isLoading: locationLoading } = useWarehouseLocation();

	const [filters, setFilters] = useState<PalletFilters>({ status: undefined });

	const { data: pallets,      isLoading: palletsLoading } = usePallets(undefined, filters);
	const { data: stats,        isLoading: statsLoading } = usePalletStats(undefined);
	const { data: storageSpaces } = useLocationWithDetails(warehouseLocation?.id);
	const { data: purchaseOrders } = usePurchaseOrdersForFilter(null);


	const handleFilterChange = useCallback(
		(partial: Partial<PalletFilters>) => setFilters((prev) => ({ ...prev, ...partial })),
		[]
	);

	const isLoading = locationLoading || palletsLoading;

	return (
		<div className="flex flex-col gap-6 p-6">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">Pallets</h1>
					<p className="mt-1 text-sm text-gray-500">
						Warehouse pallet inventory and contents
					</p>
				</div>
				{!statsLoading && stats && (
					<span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                        {stats.total} active pallet{stats.total !== 1 ? "s" : ""}
                    </span>
				)}
			</div>

			<PalletStatsRow stats={stats} isLoading={statsLoading} />

			<PalletFiltersBar
				filters={filters}
				onFilterChange={handleFilterChange}
				storageSpaces={storageSpaces?.storage_spaces ?? []}
				purchaseOrders={purchaseOrders ?? []}
			/>

			{isLoading ? (
				<PalletTableSkeleton />
			) : (
				<PalletTable pallets={pallets ?? []} isLoading={palletsLoading} />
			)}
		</div>
	);
}