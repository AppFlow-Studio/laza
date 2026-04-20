"use client";

import { useState } from 'react';
import { useItems, useSearchItems } from '@/lib/hooks/queries/useItems';
import ItemGrid from '@/components/admin/items/ItemGrid';
import SearchBar from '@/components/admin/shared/SearchBar';
import FilterDropdown from '@/components/admin/shared/FilterDropdown';
import { CardSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { Grid, List } from 'lucide-react';
import { useAdminStore } from '@/lib/stores/adminStore';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useCategories } from '@/lib/hooks/queries/useCategories';

export default function ItemsPage() {
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const { viewMode, setViewMode } = useAdminStore();

    const { data: allItems, isLoading: allItemsLoading } = useItems();
    const { data: categories, isLoading: categoriesLoading } = useCategories();
    const { data: searchResults, isLoading: searchLoading } = useSearchItems(debouncedSearch);

    const isLoading = allItemsLoading || categoriesLoading || searchLoading;

    let items = allItems || [];
    if (categoryFilter && items.length > 0) {
        items = items.filter((item: any) => {
            const itemCategoryId = item.category_id
                || (typeof item.category === 'object' && item.category !== null ? item.category.id : null);
            return itemCategoryId?.toString() === categoryFilter;
        });
    }
    if (debouncedSearch) {
        items = searchResults || [];
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">Items</h1>
                    <p className="text-sm text-zinc-600 mt-1">View your inventory items</p>
                </div>
                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-zinc-600'}`}
                    >
                        <Grid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-zinc-600'}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <SearchBar
                        placeholder="Search items..."
                        onSearch={setSearchQuery}
                    />
                </div>
                <FilterDropdown
                    label="Category"
                    options={categories?.map((category) => ({ value: category.id, label: category.name })) || []}
                    value={categoryFilter}
                    onChange={(value) => setCategoryFilter(value)}
                />
            </div>

            {/* Items Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                    <p className="text-zinc-500">No items found</p>
                </div>
            ) : (
                <ItemGrid
                    items={items}
                    viewMode={viewMode}
                />
            )}
        </div>
    );
}
