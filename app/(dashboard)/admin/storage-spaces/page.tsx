"use client";

import Link from "next/link";
import { Package, Warehouse } from "lucide-react";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { Skeleton } from "@/components/ui/skeleton";
import { StorageSpace } from "@/lib/supabase/types";

export default function StorageSpacesPage() {
    const { selectedLocationId } = useAdminStore();
    const { data: location, isLoading } = useLocationWithDetails(selectedLocationId);

    const spaces: StorageSpace[] = location?.storage_spaces ?? [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900">Storage Spaces</h1>
                {location && (
                    <p className="text-sm text-zinc-500 mt-1">{location.name}</p>
                )}
            </div>

            {/* Content */}
            {!selectedLocationId ? (
                <div className="text-center py-16 bg-white rounded-xl border border-zinc-200">
                    <Warehouse className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500">Select a location from the sidebar to view its storage spaces.</p>
                </div>
            ) : isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            ) : spaces.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-zinc-200">
                    <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500">No storage spaces have been set up for this location yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {spaces.map((space) => (
                        <Link
                            key={space.id}
                            href={`/admin/storage-spaces/${space.id}`}
                            className="bg-white rounded-xl border border-zinc-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                    <Package className="w-5 h-5 text-indigo-600" />
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 capitalize">
                                    {space.temperature_type}
                                </span>
                            </div>
                            <h3 className="font-semibold text-zinc-900 group-hover:text-indigo-700 transition-colors">
                                {space.name}
                            </h3>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
