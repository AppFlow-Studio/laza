"use client";

import { useState, useMemo } from 'react';
import { useCategories } from '@/lib/hooks/queries/useCategories';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import SearchBar from '@/components/admin/shared/SearchBar';
import CategoryList from '@/components/admin/categories/CategoryList';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function CategoriesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const { data: categories, isLoading } = useCategories();

    const filteredCategories = useMemo(() => {
        if (!categories) return [];
        if (!debouncedSearch) return categories;
        const queryLower = debouncedSearch.toLowerCase();
        return categories.filter((category: any) => {
            const name = category.name?.toLowerCase() || '';
            const description = category.description?.toLowerCase() || '';
            return name.includes(queryLower) || description.includes(queryLower);
        });
    }, [categories, debouncedSearch]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900">Categories</h1>
                <p className="text-sm text-zinc-600 mt-1">View your inventory categories</p>
            </div>

            <div className="flex-1">
                <SearchBar
                    placeholder="Search categories..."
                    onSearch={setSearchQuery}
                />
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    <LoadingSkeleton className="h-20 w-full" />
                    <LoadingSkeleton className="h-20 w-full" />
                    <LoadingSkeleton className="h-20 w-full" />
                </div>
            ) : (
                <CategoryList
                    categories={filteredCategories}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}
