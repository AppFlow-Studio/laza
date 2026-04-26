"use client";

import { useState, useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Package,
    History,
    AlertTriangle,
    Grid,
    List,
    Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import {
    useStorageSpace,
    useInventoryByStorageSpace,
    useInventoryLogsByStorageSpace,
} from "@/lib/hooks/queries/useStorageSpace";
import { useBulkAssignItems } from "@/lib/hooks/queries/useStorageSetup";
import { useCategories } from "@/lib/hooks/queries/useCategories";
import { useDebounce } from "@/lib/hooks/useDebounce";
import SearchBar from "@/components/admin/shared/SearchBar";
import FilterDropdown from "@/components/admin/shared/FilterDropdown";
import InventoryLogsList from "@/components/admin/locations/InventoryLogsList";
import MobileSheet from "@/components/admin/shared/MobileSheet";
import AddItemsToStorageSpace from "@/components/admin/locations/AddItemsToStorageSpace";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import toast from "react-hot-toast";

export default function SuperAdminStorageSpaceDetailPage() {
    const params = useParams();
    const pathname = usePathname();

    // Extract IDs from nested route: /super-admin/stores/[storeId]/storage-spaces/[storageSpaceId]
    const [storeId, storageSpaceId] = useMemo(() => {
        const segments = pathname.split("/");
        const storesIndex = segments.indexOf("stores");
        const storageIndex = segments.indexOf("storage-spaces");
        return [
            storesIndex >= 0 ? segments[storesIndex + 1] : "",
            storageIndex >= 0 ? segments[storageIndex + 1] : "",
        ];
    }, [pathname]);

    const { data: storageSpace, isLoading: storageSpaceLoading } =
        useStorageSpace(storageSpaceId);
    const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } =
        useInventoryByStorageSpace(storageSpaceId);
    const { data: logs, isLoading: logsLoading, refetch: refetchLogs } =
        useInventoryLogsByStorageSpace(storageSpaceId, 50);
    const { data: categories } = useCategories();
    const bulkAssignMutation = useBulkAssignItems();

    const [activeTab, setActiveTab] = useState("items");
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [showAddItems, setShowAddItems] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
    const [itemMinQuantityOverrides, setItemMinQuantityOverrides] = useState<Record<string, number | null>>({});
    const debouncedSearch = useDebounce(searchQuery, 300);

    const existingItemIds = new Set(inventory?.map((inv: any) => inv.item_id) || []);

    const handleItemToggle = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
            const newQty = { ...itemQuantities };
            const newOverrides = { ...itemMinQuantityOverrides };
            delete newQty[itemId];
            delete newOverrides[itemId];
            setItemQuantities(newQty);
            setItemMinQuantityOverrides(newOverrides);
        } else {
            newSelected.add(itemId);
            setItemQuantities({ ...itemQuantities, [itemId]: 0 });
            setItemMinQuantityOverrides({ ...itemMinQuantityOverrides, [itemId]: null });
        }
        setSelectedItems(newSelected);
    };

    const handleAddItems = async () => {
        if (!storageSpace || selectedItems.size === 0) return;
        try {
            await bulkAssignMutation.mutateAsync({
                locationId: storageSpace.location.id,
                storageSpaceId,
                items: Array.from(selectedItems).map((itemId) => ({
                    itemId,
                    quantity: itemQuantities[itemId] || 0,
                    minQuantityOverride: itemMinQuantityOverrides[itemId] ?? null,
                })),
            });
            toast.success(`Added ${selectedItems.size} item(s) to storage space`);
            setSelectedItems(new Set());
            setItemQuantities({});
            setItemMinQuantityOverrides({});
            setShowAddItems(false);
            refetchInventory();
            refetchLogs();
        } catch (error: any) {
            toast.error(error.message || "Failed to add items");
        }
    };

    // Filter inventory items
    const filteredInventory =
        inventory?.filter((inv: any) => {
            const item = inv.items;
            if (!item) return false;

            if (debouncedSearch) {
                const searchLower = debouncedSearch.toLowerCase();
                const matchesSearch =
                    item.name?.toLowerCase().includes(searchLower) ||
                    (item.sku && item.sku.toLowerCase().includes(searchLower));
                if (!matchesSearch) return false;
            }

            if (categoryFilter) {
                const itemCategoryId =
                    typeof item.category === "object" &&
                    item.category !== null &&
                    "id" in item.category
                        ? (item.category as any).id
                        : null;
                if (itemCategoryId !== categoryFilter) return false;
            }

            return true;
        }) || [];

    const getCategoryName = (item: any) => {
        if (
            typeof item.category === "object" &&
            item.category !== null &&
            "name" in item.category
        ) {
            return (item.category as any).name;
        }
        return item.category;
    };

    const getCategoryColor = (category: string) => {
        switch (category?.toLowerCase()) {
            case "desserts":
                return "bg-purple-50 text-purple-600";
            case "ingredients":
                return "bg-blue-50 text-blue-600";
            case "supplies":
                return "bg-amber-50 text-amber-600";
            default:
                return "bg-zinc-50 text-zinc-600";
        }
    };

    if (storageSpaceLoading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton className="h-12 w-64" />
                <LoadingSkeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!storageSpace) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-500">Storage space not found</p>
                <Link href={`/super-admin/stores/${storeId}`}>
                    <Button className="mt-4">Back to Store</Button>
                </Link>
            </div>
        );
    }

    const location = storageSpace.location;
    const address =
        typeof location.address === "string"
            ? JSON.parse(location.address)
            : location.address;

    const lowStockCount = filteredInventory.filter((inv: any) => {
        const item = inv.items;
        return (
            item &&
            inv.current_quantity <=
            (inv.min_quantity_override || item.min_quantity || 0)
        );
    }).length;

    return (
        <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <nav className="mb-6" aria-label="Breadcrumb">
                <ol className="flex items-center text-sm text-zinc-600 space-x-2">
                    <li>
                        <Link
                            href="/super-admin/stores"
                            className="flex items-center hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            All Stores
                        </Link>
                    </li>
                    <li>
                        <span className="mx-2 text-zinc-400">/</span>
                    </li>
                    <li>
                        <Link
                            href={`/super-admin/stores/${storeId}`}
                            className="hover:underline"
                        >
                            {location.name}
                        </Link>
                    </li>
                    <li>
                        <span className="mx-2 text-zinc-400">/</span>
                    </li>
                    <li className="truncate font-semibold text-zinc-900">
                        {storageSpace.name}
                    </li>
                </ol>
            </nav>

            {/* Storage Space Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <Package className="w-6 h-6 text-indigo-600" />
                            <h1 className="text-2xl font-semibold text-zinc-900">
                                {storageSpace.name}
                            </h1>
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-600 capitalize">
                                {storageSpace.temperature_type}
                            </span>
                        </div>
                        <p className="text-zinc-600">
                            {location.name} • {address.street}, {address.city},{" "}
                            {address.state}
                        </p>
                    </div>
                </div>

                {/* Quick stats */}
                <div className="flex gap-6 mt-4 pt-4 border-t border-zinc-100">
                    <div>
                        <p className="text-2xl font-semibold text-zinc-900">
                            {inventory?.length ?? 0}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Total Items
                        </p>
                    </div>
                    {lowStockCount > 0 && (
                        <div>
                            <p className="text-2xl font-semibold text-red-600">
                                {lowStockCount}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Low Stock
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Items and Logs Tabs */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger
                                value="items"
                                className="flex items-center gap-2"
                            >
                                <Package className="w-4 h-4" />
                                Items
                            </TabsTrigger>
                            <TabsTrigger
                                value="logs"
                                className="flex items-center gap-2"
                            >
                                <History className="w-4 h-4" />
                                Inventory Logs
                            </TabsTrigger>
                        </TabsList>
                        {activeTab === "items" && (
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode("grid")}
                                        className={cn(
                                            "p-2 rounded",
                                            viewMode === "grid"
                                                ? "bg-indigo-600 text-white"
                                                : "text-zinc-600"
                                        )}
                                    >
                                        <Grid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode("list")}
                                        className={cn(
                                            "p-2 rounded",
                                            viewMode === "list"
                                                ? "bg-indigo-600 text-white"
                                                : "text-zinc-600"
                                        )}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setShowAddItems(true)}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Items
                                </Button>
                            </div>
                        )}
                    </div>

                    <TabsContent value="items" className="mt-0">
                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex-1">
                                <SearchBar
                                    placeholder="Search items..."
                                    onSearch={setSearchQuery}
                                />
                            </div>
                            <FilterDropdown
                                label="Category"
                                options={
                                    categories?.map((category) => ({
                                        value: category.id,
                                        label: category.name,
                                    })) || []
                                }
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                            />
                        </div>

                        {/* Items List/Grid */}
                        {inventoryLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-zinc-500">
                                    Loading items...
                                </p>
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                                <p className="text-zinc-500">
                                    No items in this storage space
                                </p>
                            </div>
                        ) : viewMode === "list" ? (
                            <div className="space-y-2">
                                {filteredInventory.map((inv: any) => {
                                    const item = inv.items;
                                    const isLowStock =
                                        item &&
                                        inv.current_quantity <=
                                        (inv.min_quantity_override ||
                                            item.min_quantity ||
                                            0);
                                    return (
                                        <div
                                            key={inv.id}
                                            className={cn(
                                                "flex items-center justify-between p-4 bg-zinc-50 rounded-lg border",
                                                isLowStock &&
                                                "border-red-200 bg-red-50"
                                            )}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-zinc-900">
                                                        {item?.name ||
                                                            "Unknown"}
                                                    </h3>
                                                    {isLowStock && (
                                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                                    )}
                                                    {item?.category && (
                                                        <span
                                                            className={cn(
                                                                "px-2 py-0.5 rounded-full text-xs font-medium",
                                                                getCategoryColor(
                                                                    getCategoryName(
                                                                        item
                                                                    )
                                                                )
                                                            )}
                                                        >
                                                            {getCategoryName(
                                                                item
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                {item?.sku && (
                                                    <p className="text-xs text-zinc-500 mb-1">
                                                        SKU: {item.sku}
                                                    </p>
                                                )}
                                                <p className="text-sm text-zinc-600">
                                                    Quantity:{" "}
                                                    <span className="font-semibold">
                                                        {inv.current_quantity}
                                                    </span>{" "}
                                                    {item?.unit_of_measure ||
                                                        ""}
                                                    {(() => {
                                                        const minQty =
                                                            inv.min_quantity_override ??
                                                            item?.min_quantity ??
                                                            0;
                                                        return minQty > 0 ? (
                                                            <span className="text-zinc-400">
                                                                {" "}
                                                                • Min: {minQty}
                                                            </span>
                                                        ) : null;
                                                    })()}
                                                </p>
                                            </div>
                                            <div
                                                className={cn(
                                                    "text-sm font-bold px-3 py-1.5 rounded-lg",
                                                    inv.current_quantity === 0
                                                        ? "bg-red-100 text-red-700"
                                                        : isLowStock
                                                            ? "bg-amber-100 text-amber-700"
                                                            : "bg-green-100 text-green-700"
                                                )}
                                            >
                                                {inv.current_quantity}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredInventory.map((inv: any) => {
                                    const item = inv.items;
                                    const isLowStock =
                                        item &&
                                        inv.current_quantity <=
                                        (inv.min_quantity_override ||
                                            item.min_quantity ||
                                            0);
                                    return (
                                        <div
                                            key={inv.id}
                                            className={cn(
                                                "p-4 bg-zinc-50 rounded-lg border",
                                                isLowStock &&
                                                "border-red-200 bg-red-50"
                                            )}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Package className="w-5 h-5 text-indigo-600" />
                                                        <h3 className="font-semibold text-zinc-900">
                                                            {item?.name ||
                                                                "Unknown"}
                                                        </h3>
                                                        {isLowStock && (
                                                            <AlertTriangle className="w-4 h-4 text-red-600" />
                                                        )}
                                                    </div>
                                                    {item?.category && (
                                                        <span
                                                            className={cn(
                                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                                getCategoryColor(
                                                                    getCategoryName(
                                                                        item
                                                                    )
                                                                )
                                                            )}
                                                        >
                                                            {getCategoryName(
                                                                item
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    className={cn(
                                                        "text-sm font-bold px-3 py-1.5 rounded-lg",
                                                        inv.current_quantity ===
                                                        0
                                                            ? "bg-red-100 text-red-700"
                                                            : isLowStock
                                                                ? "bg-amber-100 text-amber-700"
                                                                : "bg-green-100 text-green-700"
                                                    )}
                                                >
                                                    {inv.current_quantity}
                                                </div>
                                            </div>
                                            {item?.sku && (
                                                <p className="text-xs text-zinc-500 mb-2">
                                                    SKU: {item.sku}
                                                </p>
                                            )}
                                            <p className="text-sm text-zinc-600">
                                                Quantity:{" "}
                                                <span className="font-semibold">
                                                    {inv.current_quantity}
                                                </span>{" "}
                                                {item?.unit_of_measure || ""}
                                                {(() => {
                                                    const minQty =
                                                        inv.min_quantity_override ??
                                                        item?.min_quantity ??
                                                        0;
                                                    return minQty > 0 ? (
                                                        <span className="text-zinc-400">
                                                            {" "}
                                                            • Min: {minQty}
                                                        </span>
                                                    ) : null;
                                                })()}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="logs" className="mt-0">
                        <InventoryLogsList
                            logs={logs || []}
                            isLoading={logsLoading}
                            onRefresh={refetchLogs}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Add Items Sheet */}
            <MobileSheet
                isOpen={showAddItems}
                onClose={() => {
                    setShowAddItems(false);
                    setSelectedItems(new Set());
                    setItemQuantities({});
                }}
                title="Add Items to Storage Space"
                snapPoints={[0, 0.7, 0.95, 1]}
                footer={
                    selectedItems.size > 0 ? (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAddItems(false);
                                    setSelectedItems(new Set());
                                    setItemQuantities({});
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddItems}
                                className="flex-1"
                                disabled={bulkAssignMutation.isPending}
                            >
                                {bulkAssignMutation.isPending
                                    ? "Adding..."
                                    : `Add ${selectedItems.size} Item${selectedItems.size !== 1 ? "s" : ""}`}
                            </Button>
                        </div>
                    ) : undefined
                }
            >
                {storageSpace && (
                    <AddItemsToStorageSpace
                        locationId={storageSpace.location.id}
                        existingItemIds={existingItemIds}
                        selectedItems={selectedItems}
                        itemQuantities={itemQuantities}
                        itemMinQuantityOverrides={itemMinQuantityOverrides}
                        onItemToggle={handleItemToggle}
                        onQuantityChange={(itemId, qty) =>
                            setItemQuantities({ ...itemQuantities, [itemId]: qty })
                        }
                        onMinQuantityOverrideChange={(itemId, override) =>
                            setItemMinQuantityOverrides({ ...itemMinQuantityOverrides, [itemId]: override })
                        }
                        isLoading={bulkAssignMutation.isPending}
                    />
                )}
            </MobileSheet>
        </div>
    );
}