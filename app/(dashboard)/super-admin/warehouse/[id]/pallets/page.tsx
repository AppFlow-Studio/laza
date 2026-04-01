//super-admin/warehouse/
"use client";

import { useState, useCallback } from "react";
import { usePallets, usePalletStats, usePurchaseOrdersForFilter } from "@/lib/hooks/queries/usePallets";
import { PalletFilters } from "@/lib/supabase/queries/pallets";
import { PalletStatsRow } from "@/components/pallets/PalletStatsRow";
import { PalletFiltersBar } from "@/components/pallets/PalletFiltersBar";
import { PalletTable } from "@/components/pallets/PalletTable";
import { PalletTableSkeleton } from "@/components/pallets/PalletTableSkeleton";

export default function PalletsPage() {
	const [filters, setFilters] = useState<PalletFilters>({ status: undefined });

	const { data: pallets,  isLoading: palletsLoading } = usePallets(undefined, filters);
	const { data: stats,    isLoading: statsLoading }   = usePalletStats(undefined);
	const { data: purchaseOrders }                       = usePurchaseOrdersForFilter(null);

	const handleFilterChange = useCallback(
		(partial: Partial<PalletFilters>) => setFilters((prev) => ({ ...prev, ...partial })),
		[]
	);

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
				purchaseOrders={purchaseOrders ?? []}
			/>

			{palletsLoading ? (
				<PalletTableSkeleton />
			) : (
				<PalletTable pallets={pallets ?? []} isLoading={palletsLoading} />
			)}
		</div>
	);
}