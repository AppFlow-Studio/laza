"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { ArrowLeft, GripVertical, Filter, Package } from 'lucide-react';
import { useStorageSpace, useStorageSpaceItems } from '@/lib/hooks/queries/useEmployee';
import { useEmployeeLocation } from '@/lib/hooks/queries/useEmployee';
import SearchBar from '@/components/admin/shared/SearchBar';
import FilterDropdown from '@/components/admin/shared/FilterDropdown';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import QuantityUpdateSheet from '@/components/employee/inventory/QuantityUpdateSheet';

export default function StorageSpaceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const storageSpaceId = params.id as string;
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isUpdateSheetOpen, setIsUpdateSheetOpen] = useState(false);

    const { data: location } = useEmployeeLocation();
    const { data: storageSpace, isLoading: spaceLoading } = useStorageSpace(storageSpaceId);
    const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useStorageSpaceItems(storageSpaceId);

    // Extract unique categories from items in storage space
    const availableCategories = useMemo(() => {
        if (!items) return [];
        const categoryMap = new Map();
        items.forEach((item: any) => {
            const category = item.items?.category;
            if (category) {
                const categoryId = typeof category === 'object' && category !== null && 'id' in category
                    ? category.id
                    : category;
                const categoryName = typeof category === 'object' && category !== null && 'name' in category
                    ? category.name
                    : category;
                if (categoryId && !categoryMap.has(categoryId)) {
                    categoryMap.set(categoryId, { id: categoryId, name: categoryName });
                }
            }
        });
        return Array.from(categoryMap.values());
    }, [items]);

    const filteredItems = useMemo(() => {
        if (!items) return [];

        let filtered = items;

        // Search filter
        if (searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            filtered = filtered.filter((item: any) => {
                const itemName = item.items?.name?.toLowerCase() || '';
                const itemSku = item.items?.sku?.toLowerCase() || '';
                return itemName.includes(queryLower) || itemSku.includes(queryLower);
            });
        }

        // Category filter
        if (categoryFilter) {
            filtered = filtered.filter((item: any) => {
                const category = item.items?.category;
                if (!category) return false;
                const itemCategoryId = typeof category === 'object' && category !== null && 'id' in category
                    ? category.id
                    : category;
                return itemCategoryId === categoryFilter;
            });
        }

        return filtered;
    }, [items, searchQuery, categoryFilter]);

    const handleItemClick = (item: any) => {
        setSelectedItem(item);
        setIsUpdateSheetOpen(true);
    };

    const handleUpdateSuccess = () => {
        setIsUpdateSheetOpen(false);
        setSelectedItem(null);
        refetchItems();
    };

    if (itemsLoading || spaceLoading) {
        return (
            <div className="p-4 space-y-4">
                <LoadingSkeleton className="h-16 w-full" />
                <LoadingSkeleton className="h-12 w-full" />
                <LoadingSkeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-900" />
                    </button>
                    <h1 className="text-lg font-semibold text-zinc-900 flex-1">
                        {storageSpace?.name || 'Inventory'}
                    </h1>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white border-b border-zinc-200 px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <SearchBar
                            placeholder="Search"
                            onSearch={setSearchQuery}
                        />
                    </div>
                    {availableCategories.length > 0 && (
                        <FilterDropdown
                            label="Category"
                            options={availableCategories.map((cat: any) => ({
                                value: cat.id,
                                label: cat.name
                            }))}
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                        />
                    )}
                </div>
                {storageSpace && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-zinc-600">
                        <span>📍</span>
                        <span>{storageSpace.name}</span>
                    </div>
                )}
            </div>

            {/* Items List */}
            <div className="px-4 py-4">
                {/* List Header */}
                <div className="flex items-center justify-between mb-3 px-2">
                    <span className="text-sm font-medium text-zinc-600">Variant</span>
                    <span className="text-sm font-medium text-zinc-600">Available</span>
                </div>

                {filteredItems.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-500">
                            {searchQuery ? 'No items found' : 'No items in this storage space'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredItems.map((item: any, index: number) => {
                            const itemData = item.items;
                            const currentQuantity = item.current_quantity || 0;
                            const minQuantityOverride = item.min_quantity_override;
                            const itemMinQuantity = itemData?.min_quantity || 0;
                            const effectiveMinQuantity = minQuantityOverride !== null && minQuantityOverride !== undefined
                                ? minQuantityOverride
                                : itemMinQuantity;
                            const isLowStock = currentQuantity <= effectiveMinQuantity;

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => handleItemClick(item)}
                                    className={cn(
                                        "bg-white rounded-lg p-4 border border-zinc-200",
                                        "cursor-pointer transition-all hover:shadow-md active:scale-[0.98]",
                                        isLowStock && "border-red-200 bg-red-50"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {/* Item Image Placeholder */}
                                            <div className="w-12 h-12 bg-zinc-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                                                <Package className="w-6 h-6 text-zinc-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-zinc-900 truncate">
                                                    {itemData?.name || 'Unknown Item'}
                                                </h3>
                                                {itemData?.sku && (
                                                    <p className="text-xs text-zinc-500 mt-0.5">
                                                        SKU: {itemData.sku}
                                                    </p>
                                                )}
                                                {/* Min Quantity Indicator */}
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-xs text-zinc-500">Min:</span>
                                                    <span className={cn(
                                                        "text-xs font-medium",
                                                        effectiveMinQuantity > 0
                                                            ? "text-zinc-700"
                                                            : "text-zinc-400"
                                                    )}>
                                                        {effectiveMinQuantity > 0
                                                            ? `${effectiveMinQuantity.toFixed(0)}${itemData?.unit_of_measure ? ` ${itemData.unit_of_measure}` : ''}`
                                                            : '0'
                                                        }
                                                    </span>

                                                </div>
                                            </div>
                                        </div>
                                        <div className="ml-4 flex flex-col items-end gap-1">
                                            <div className={cn(
                                                "px-4 py-2 rounded-full border-2 text-center min-w-[60px]",
                                                currentQuantity === 0
                                                    ? "bg-white border-zinc-300 text-zinc-700"
                                                    : isLowStock
                                                        ? "bg-red-50 border-red-300 text-red-700"
                                                        : "bg-blue-50 border-blue-300 text-blue-700"
                                            )}>
                                                <span className="text-sm font-semibold">
                                                    {currentQuantity.toFixed(0)}
                                                </span>
                                            </div>
                                            {/* Stock Status Indicator */}
                                            {effectiveMinQuantity >= 0 && (
                                                <div className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full",
                                                    isLowStock
                                                    && "bg-red-100 text-red-700"

                                                )}>
                                                    {isLowStock && 'Low'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Quantity Update Sheet */}
            {selectedItem && (
                <QuantityUpdateSheet
                    id={selectedItem.id}
                    item={selectedItem.items}
                    currentQuantity={selectedItem.current_quantity || 0}
                    locationId={location?.id || ''}
                    storageSpaceId={storageSpaceId}
                    storageSpaceName={storageSpace?.name || ''}
                    isOpen={isUpdateSheetOpen}
                    onClose={() => {
                        setIsUpdateSheetOpen(false);
                        setSelectedItem(null);
                    }}
                    onSuccess={handleUpdateSuccess}
                />
            )}
        </div>
    );
}

