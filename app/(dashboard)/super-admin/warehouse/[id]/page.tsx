"use client";

import { useWarehouseById } from "@/lib/hooks/queries/useWarehouse";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import {
    Package,
    Thermometer,
    Snowflake,
    Wind,
    LayoutGrid,
    List,
    ArrowLeft,
    MapPin,
    Warehouse,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useState, use } from "react";
import { StorageSpace } from "@/lib/supabase/types";

// ─── Temp config ──────────────────────────────────────────────────────────────

const TEMP_CONFIG: Record<
    string,
    { label: string; icon: React.ElementType; className: string }
> = {
    frozen: { label: "Frozen", icon: Snowflake, className: "bg-blue-100 text-blue-700" },
    refrigerated: { label: "Refrigerated", icon: Thermometer, className: "bg-cyan-100 text-cyan-700" },
    dry: { label: "Dry", icon: Wind, className: "bg-amber-100 text-amber-700" },
};

function TempBadge({ type }: { type: string }) {
    const config = TEMP_CONFIG[type] ?? { label: type, icon: Package, className: "bg-zinc-100 text-zinc-600" };
    const Icon = config.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${config.className}`}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
}

// ─── Card view ────────────────────────────────────────────────────────────────

function StorageSpaceCard({ space, warehouseId }: { space: StorageSpace; warehouseId: string }) {
    return (
        <Link
            href={`/super-admin/warehouse/${warehouseId}/storage-spaces/${space.id}`}
            className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:shadow-md hover:border-zinc-300 transition-all group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <Package className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <TempBadge type={space.temperature_type} />
            </div>
            <p className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">
                {space.name}
            </p>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                Click to manage inventory
                <ChevronRight className="w-3 h-3" />
            </p>
        </Link>
    );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function StorageSpaceRow({ space, warehouseId }: { space: StorageSpace; warehouseId: string }) {
    return (
        <tr className="hover:bg-zinc-50 transition-colors group">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-zinc-400" />
                    </div>
                    <span className="font-medium text-zinc-900">{space.name}</span>
                </div>
            </td>
            <td className="px-4 py-3">
                <TempBadge type={space.temperature_type} />
            </td>
            <td className="px-4 py-3 text-right">
                <Link
                    href={`/super-admin/warehouse/${warehouseId}/storage-spaces/${space.id}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                    Manage inventory <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </td>
        </tr>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const { id } = use(params);

    const { data: warehouse, isLoading: warehouseLoading } = useWarehouseById(id);
    const { data: warehouseDetails, isLoading: detailsLoading } = useLocationWithDetails(
        id,
        { enabled: !!id }
    );

    const isLoading = warehouseLoading || detailsLoading;
    const storageSpaces: StorageSpace[] = warehouseDetails?.storage_spaces ?? [];

    if (isLoading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton className="h-10 w-48" />
                <LoadingSkeleton className="h-32 w-full rounded-xl" />
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
                <Warehouse className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 font-medium">Warehouse not found</p>
                <Link
                    href="/super-admin/warehouse"
                    className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Warehouses
                </Link>
            </div>
        );
    }

    const address =
        typeof warehouse.address === "string"
            ? JSON.parse(warehouse.address)
            : (warehouse.address as Record<string, string>);

    return (
        <div className="space-y-6">
            {/* Back link */}
            <Link
                href="/super-admin/warehouse"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                All Warehouses
            </Link>

            {/* Warehouse header card */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <Warehouse className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-zinc-900">
                                {warehouse.name}
                            </h1>
                            {address && (
                                <p className="text-zinc-500 text-sm mt-1 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    {address.street}, {address.city}, {address.state} {address.zip}
                                </p>
                            )}
                        </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        Warehouse
                    </span>
                </div>

                {/* Summary stats */}
                <div className="flex gap-6 mt-5 pt-5 border-t border-zinc-100">
                    <div>
                        <p className="text-2xl font-semibold text-zinc-900">{storageSpaces.length}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Storage Spaces</p>
                    </div>
                    {Object.keys(TEMP_CONFIG).map((type) => {
                        const count = storageSpaces.filter((s) => s.temperature_type === type).length;
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

            {/* Storage spaces section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-zinc-900">Storage Spaces</h2>
                    <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50"}`}
                            title="Grid view"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-2 transition-colors ${viewMode === "table" ? "bg-indigo-600 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50"}`}
                            title="Table view"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {storageSpaces.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 py-16 text-center">
                        <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-500 font-medium">No storage spaces configured</p>
                        <p className="text-zinc-400 text-sm mt-1">
                            Add storage spaces to start tracking warehouse inventory.
                        </p>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {storageSpaces.map((space) => (
                            <StorageSpaceCard key={space.id} space={space} warehouseId={id} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                                    Storage Space
                                </th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                                    Type
                                </th>
                                <th className="px-4 py-3"></th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                            {storageSpaces.map((space) => (
                                <StorageSpaceRow key={space.id} space={space} warehouseId={id} />
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}