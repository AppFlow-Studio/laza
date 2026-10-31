"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocations } from "@/lib/hooks/queries/useLocations";
import LocationCard from "@/components/admin/locations/LocationCard";
import LocationForm from "@/components/admin/locations/LocationForm";
import MobileSheet from "@/components/admin/shared/MobileSheet";
import SearchBar from "@/components/admin/shared/SearchBar";
import {
    LoadingSkeleton,
    CardSkeleton,
} from "@/components/admin/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Plus, Grid, List } from "lucide-react";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useDebounce } from "@/lib/hooks/useDebounce";
import toast from "react-hot-toast";
import { useDeleteLocation } from "@/lib/hooks/queries/useLocations";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";

export default function LocationsPage() {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    const { data: locations, isLoading } = useLocations(organizationId);
    const [editingLocation, setEditingLocation] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 300);
    const { viewMode, setViewMode } = useAdminStore();
    const deleteMutation = useDeleteLocation();

    const filteredLocations =
        locations?.filter((location) => {
            if (!debouncedSearch) return true;
            const searchLower = debouncedSearch.toLowerCase();
            const name = location.name.toLowerCase();
            const address =
                typeof location.address === "string"
                    ? JSON.parse(location.address)
                    : location.address;
            const addressStr =
                `${address.street} ${address.city} ${address.state}`.toLowerCase();
            return (
                name.includes(searchLower) || addressStr.includes(searchLower)
            );
        }) || [];

    const handleDelete = async (locationId: string) => {
        if (!confirm("Delete this location? If it has orders or purchases, it will be archived instead.")) return;
        try {
            const result = await deleteMutation.mutateAsync(locationId);
            toast.success(
                result === "archived"
                    ? "Location archived (had referenced records)"
                    : "Location deleted",
            );
        } catch (error: any) {
            toast.error(error.message || "Failed to delete location");
        }
    };


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">
                        Locations
                    </h1>
                    <p className="text-sm text-zinc-600 mt-1">
                        Manage your cafe locations
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-zinc-600"}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-zinc-600"}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <Link href="/super-admin/locations/new">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Location
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search */}
            <div className="max-w-md">
                <SearchBar
                    placeholder="Search locations..."
                    onSearch={setSearchQuery}
                />
            </div>

            {/* Locations Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            ) : filteredLocations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                    <p className="text-zinc-500">No locations found</p>
                </div>
            ) : (
                // <div className={viewMode === 'grid'
                //     ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                //     : "space-y-4"
                // }>

                <LocationCard
                    locations={filteredLocations}
                    onEdit={(location) => setEditingLocation(location)}
                    // onDelete={() => handleDelete(location.id)}
                    viewMode={viewMode}
                />
                // </div>
            )}

            {/* Edit Form */}
            <MobileSheet
                isOpen={!!editingLocation}
                onClose={() => setEditingLocation(null)}
                title="Edit Location"
            >
                <LocationForm
                    location={editingLocation}
                    organizationId={organizationId}
                    onSuccess={() => setEditingLocation(null)}
                />
            </MobileSheet>
        </div>
    );
}
