"use client";

import { useState } from 'react';
import { useItems } from '@/lib/hooks/queries/useItems';
import { useCategories } from '@/lib/hooks/queries/useCategories';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useAdminStore } from '@/lib/stores/adminStore';
import { Item } from '@/lib/supabase/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import SearchBar from '@/components/admin/shared/SearchBar';
import CategoryFilter from '@/components/admin/locations/CategoryFilter';
import { Grid, List } from 'lucide-react';

interface AddItemsToStorageSpaceProps {
    existingItemIds: Set<string>;
    selectedItems: Set<string>;
    itemQuantities: Record<string, number>;
    itemMinQuantityOverrides?: Record<string, number | null>;
    onItemToggle: (itemId: string) => void;
    onQuantityChange: (itemId: string, quantity: number) => void;
    onMinQuantityOverrideChange?: (itemId: string, override: number | null) => void;
    isLoading?: boolean;
}

export default function AddItemsToStorageSpace({
    existingItemIds,
    selectedItems,
    itemQuantities,
    itemMinQuantityOverrides = {},
    onItemToggle,
    onQuantityChange,
    onMinQuantityOverrideChange,
    isLoading,
}: AddItemsToStorageSpaceProps) {
    const { data: items, isLoading: itemsLoading } = useItems();
    const { data: categories } = useCategories();
    const { viewMode, setViewMode } = useAdminStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const debouncedSearch = useDebounce(searchQuery, 300);

    const getCategoryName = (item: Item) => {
        if (typeof item.category === 'object' && item.category !== null && 'name' in item.category) {
            return (item.category as any).name;
        }
        return item.category;
    };

    const getCategoryId = (item: Item) => {
        if (typeof item.category === 'object' && item.category !== null && 'id' in item.category) {
            return (item.category as any).id;
        }
        return null;
    };

    // Filter items - exclude already assigned items
    const filteredItems = items?.filter((item) => {
        // Skip items already in storage space
        if (existingItemIds.has(item.id)) return false;

        // Search filter
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch =
                item.name.toLowerCase().includes(searchLower) ||
                (item.sku && item.sku.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
        }

        // Category filter
        if (categoryFilter) {
            const itemCategoryId = getCategoryId(item);
            if (itemCategoryId !== categoryFilter) return false;
        }

        return true;
    }) || [];

    const getCategoryColor = (category: string) => {
        switch (category.toLowerCase()) {
            case 'desserts':
                return 'bg-purple-50 text-purple-600';
            case 'ingredients':
                return 'bg-blue-50 text-blue-600';
            case 'supplies':
                return 'bg-amber-50 text-amber-600';
            default:
                return 'bg-zinc-50 text-zinc-600';
        }
    };

    if (itemsLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-zinc-500">Loading items...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Search and Filters - Sticky Header */}
            <div className="sticky top-0 z-20 bg-white pb-4 border-b border-zinc-200 -mx-4 px-4 pt-0 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4 py-4 items-center justify-between  rounded-lg ">
                    <div className="flex-1 rounded-lg p-2 h-full">
                        <SearchBar
                            placeholder="Search items by name or SKU..."
                            onSearch={setSearchQuery}
                        />
                        {selectedItems.size > 0 && (
                            <span className="text-xs text-zinc-600 whitespace-nowrap">
                                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
                            </span>
                        )}
                    </div>
                    <div className='rounded-lg'>
                        <CategoryFilter
                            options={categories?.map((category) => ({ value: category.id, label: category.name })) || []}
                            value={categoryFilter}
                            onChange={setCategoryFilter}
                        />
                    </div>
                    {/* View Toggle */}
                    <div className="flex items-center justify-between sm:justify-end gap-2">

                        <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2 rounded",
                                    viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-zinc-600'
                                )}
                            >
                                <Grid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "p-2 rounded",
                                    viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-zinc-600'
                                )}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Display - Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                        <p className="text-zinc-500">
                            {existingItemIds.size > 0 && items && items.length === existingItemIds.size
                                ? 'All items are already assigned to this storage space'
                                : 'No items found'}
                        </p>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="space-y-2 py-4">
                        {filteredItems.map((item) => {
                            const isSelected = selectedItems.has(item.id);
                            const quantity = itemQuantities[item.id] || 0;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => onItemToggle(item.id)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 bg-white rounded-lg border-2 transition-colors cursor-pointer",
                                        isSelected ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 hover:border-zinc-300"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors pointer-events-none",
                                            isSelected
                                                ? "bg-indigo-600 border-indigo-600"
                                                : "border-zinc-300"
                                        )}
                                    >
                                        {isSelected && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Package className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                            <h3 className="font-semibold text-zinc-900 truncate">{item.name}</h3>
                                            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                                {getCategoryName(item)}
                                            </span>
                                        </div>
                                        {item.sku && (
                                            <p className="text-xs text-zinc-500">SKU: {item.sku}</p>
                                        )}
                                        <p className="text-xs text-zinc-600">
                                            Unit: {item.unit_of_measure} | Min: {item.min_quantity}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <div
                                            className="flex-shrink-0 space-y-2"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="w-32">
                                                <Label htmlFor={`qty-${item.id}`} className="text-xs text-zinc-600">
                                                    Initial Quantity
                                                </Label>
                                                <Input
                                                    id={`qty-${item.id}`}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={quantity}
                                                    onChange={(e) => onQuantityChange(item.id, parseFloat(e.target.value) || 0)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="mt-1"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            {onMinQuantityOverrideChange && (
                                                <div className="w-32">
                                                    <Label htmlFor={`min-override-${item.id}`} className="text-xs text-zinc-600">
                                                        Min Override (Optional)
                                                    </Label>
                                                    <Input
                                                        id={`min-override-${item.id}`}
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={itemMinQuantityOverrides[item.id] ?? ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            onMinQuantityOverrideChange(
                                                                item.id,
                                                                value === '' ? null : parseFloat(value) || null
                                                            );
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        placeholder={item.min_quantity ? `Default: ${item.min_quantity}` : 'No default'}
                                                        className="mt-1"
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                        {filteredItems.map((item) => {
                            const isSelected = selectedItems.has(item.id);
                            const quantity = itemQuantities[item.id] || 0;
                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "relative p-4 bg-white rounded-lg border-2 transition-colors cursor-pointer ",
                                        isSelected ? "border-indigo-500 bg-indigo-50" : "border-zinc-200 hover:border-zinc-300"
                                    )}
                                    onClick={() => onItemToggle(item.id)}
                                >
                                    <button
                                        type="button"
                                        className={cn(
                                            "absolute top-3 right-3 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
                                            isSelected
                                                ? "bg-indigo-600 border-indigo-600"
                                                : "border-zinc-300 hover:border-indigo-400"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onItemToggle(item.id);
                                        }}
                                    >
                                        {isSelected && <Check className="w-4 h-4 text-white" />}
                                    </button>
                                    <div className="pr-8">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Package className="w-5 h-5 text-indigo-600" />
                                            <h3 className="font-semibold text-zinc-900">{item.name}</h3>
                                        </div>
                                        {item.sku && (
                                            <p className="text-xs text-zinc-500 mb-2">SKU: {item.sku}</p>
                                        )}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                                {getCategoryName(item)}
                                            </span>
                                            <span className="text-xs text-zinc-600">
                                                {item.unit_of_measure}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <div className="mt-3 pt-3 border-t border-zinc-200 space-y-3">
                                                <div>
                                                    <Label htmlFor={`qty-${item.id}`} className="text-xs text-zinc-600 mb-1 block">
                                                        Initial Quantity
                                                    </Label>
                                                    <Input
                                                        id={`qty-${item.id}`}
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={quantity}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            onQuantityChange(item.id, parseFloat(e.target.value) || 0);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full"
                                                        disabled={isLoading}
                                                    />
                                                </div>
                                                {onMinQuantityOverrideChange && (
                                                    <div>
                                                        <Label htmlFor={`min-override-${item.id}`} className="text-xs text-zinc-600 mb-1 block">
                                                            Min Override (Optional)
                                                        </Label>
                                                        <Input
                                                            id={`min-override-${item.id}`}
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={itemMinQuantityOverrides[item.id] ?? ''}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                const value = e.target.value;
                                                                onMinQuantityOverrideChange(
                                                                    item.id,
                                                                    value === '' ? null : parseFloat(value) || null
                                                                );
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            placeholder={item.min_quantity ? `Default: ${item.min_quantity}` : 'No default'}
                                                            className="w-full"
                                                            disabled={isLoading}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>


        </div>
    );
}

