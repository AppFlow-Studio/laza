"use client";

import { useState, useMemo } from 'react';
import { useCategories, useUpdateCategory, useDeleteCategory } from '@/lib/hooks/queries/useCategories';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import SearchBar from '@/components/admin/shared/SearchBar';
import CategoryList from '@/components/admin/categories/CategoryList';
import CategoryForm from '@/components/admin/categories/CategoryForm';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';
import { useDebounce } from '@/lib/hooks/useDebounce';

export default function CategoriesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);
    const [editingCategory, setEditingCategory] = useState<any | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<any | null>(null);

    const { data: categories, isLoading } = useCategories();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();

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

    const handleUpdate = async (data: { name: string; description?: string | undefined }) => {
        if (!editingCategory) return;
        try {
            await updateMutation.mutateAsync({
                id: editingCategory.id,
                updates: {
                    name: data.name,
                    description: data.description || undefined,
                },
            });
            toast.success('Category updated successfully');
            setEditingCategory(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update category');
        }
    };

    const handleDelete = async () => {
        if (!deletingCategory) return;
        try {
            await deleteMutation.mutateAsync(deletingCategory.id);
            toast.success('Category deleted successfully');
            setDeletingCategory(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete category');
        }
    };

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
                    onEdit={(category) => setEditingCategory(category)}
                    onDelete={(category) => setDeletingCategory(category)}
                />
            )}

            {/* Edit Category Modal */}
            {editingCategory && (
                <MobileSheet
                    isOpen={!!editingCategory}
                    onClose={() => setEditingCategory(null)}
                    title="Edit Category"
                    snapPoints={[0, 0.5, 0.7, 1]}
                >
                    <CategoryForm
                        initialData={{
                            name: editingCategory.name,
                            description: editingCategory.description,
                        }}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingCategory(null)}
                        isLoading={updateMutation.isPending}
                    />
                </MobileSheet>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{deletingCategory?.name}</strong>?
                            {deletingCategory?.item_count && deletingCategory.item_count > 0 && (
                                <span className="block mt-2 text-amber-600">
                                    Warning: This category is used by {deletingCategory.item_count} item{deletingCategory.item_count !== 1 ? 's' : ''}.
                                    Items will need to be reassigned to another category.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
