"use client";

import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import { Package, Thermometer, Snowflake, Wind } from "lucide-react";
import Link from "next/link";
import { StorageSpace } from "@/lib/supabase/types";

const TEMP_CONFIG: Record<
	string,
	{ label: string; icon: React.ElementType; className: string }
> = {
	frozen: {
		label: "Frozen",
		icon: Snowflake,
		className: "bg-blue-100 text-blue-700",
	},
	refrigerated: {
		label: "Refrigerated",
		icon: Thermometer,
		className: "bg-cyan-100 text-cyan-700",
	},
	dry: {
		label: "Dry",
		icon: Wind,
		className: "bg-amber-100 text-amber-700",
	},
};

function TempBadge({ type }: { type: string }) {
	const config = TEMP_CONFIG[type] ?? {
		label: type,
		icon: Package,
		className: "bg-zinc-100 text-zinc-600",
	};
	const Icon = config.icon;
	return (
		<span
			className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${config.className}`}
		>
            <Icon className="w-3 h-3" />
			{config.label}
        </span>
	);
}

export default function WarehouseInventoryPage() {

	const { data: warehouse, isLoading: warehouseLoading } =
		useWarehouseLocation();

	const { data: warehouseDetails, isLoading: detailsLoading } =
		useLocationWithDetails(warehouse?.id ?? "");

	const isLoading = warehouseLoading || detailsLoading;
	const storageSpaces: StorageSpace[] =
		warehouseDetails?.storage_spaces ?? [];

	console.log(warehouse)
	if (isLoading) {
		return (
			<div className="space-y-4">
				<LoadingSkeleton className="h-10 w-48" />
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<LoadingSkeleton key={i} className="h-32 w-full rounded-xl" />
					))}
				</div>
			</div>
		);
	}

	if (!warehouse) {
		return (
			<div className="text-center py-16">
				<Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
				<p className="text-zinc-500 font-medium">No warehouse configured</p>
				<p className="text-zinc-400 text-sm mt-1">
					A warehouse location hasn&apos;t been set up yet.
				</p>
			</div>
		);
	}

	const address =
		typeof warehouse.address === "string"
			? JSON.parse(warehouse.address)
			: warehouse.address;

	return (
		<div className="space-y-6">
			{/* Warehouse header */}
			<div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-zinc-900">
							{warehouse.name}
						</h1>
						{address && (
							<p className="text-zinc-500 text-sm mt-1">
								{address.street}, {address.city}, {address.state}{" "}
								{address.zip}
							</p>
						)}
					</div>
					<span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        Warehouse
                    </span>
				</div>

				{/* Summary counts */}
				<div className="flex gap-6 mt-4 pt-4 border-t border-zinc-100">
					<div>
						<p className="text-2xl font-semibold text-zinc-900">
							{storageSpaces.length}
						</p>
						<p className="text-xs text-zinc-500 mt-0.5">Storage Spaces</p>
					</div>
					{Object.keys(TEMP_CONFIG).map((type) => {
						const count = storageSpaces.filter(
							(s) => s.temperature_type === type
						).length;
						if (count === 0) return null;
						return (
							<div key={type}>
								<p className="text-2xl font-semibold text-zinc-900">{count}</p>
								<p className="text-xs text-zinc-500 mt-0.5 capitalize">{type}</p>
							</div>
						);
					})}
				</div>
			</div>

			{/* Storage spaces grid */}
			{storageSpaces.length > 0 ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{storageSpaces.map((space) => (
						<Link
							key={space.id}
							href={`/super-admin/warehouse/storage-spaces/${space.id}`}
							className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:shadow-md hover:border-zinc-300 transition-all group"
						>
							<div className="flex items-start justify-between mb-4">
								<div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
									<Package className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
								</div>
								<TempBadge type={space.temperature_type} />
							</div>
							<p className="font-semibold text-zinc-900">{space.name}</p>
							<p className="text-xs text-zinc-400 mt-1">
								Click to manage inventory
							</p>
						</Link>
					))}
				</div>
			) : (
				<div className="bg-white rounded-xl shadow-sm border border-zinc-200 py-16 text-center">
					<Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
					<p className="text-zinc-500 font-medium">
						No storage spaces configured
					</p>
					<p className="text-zinc-400 text-sm mt-1">
						Add storage spaces to start tracking warehouse inventory.
					</p>
				</div>
			)}
		</div>
	);
}