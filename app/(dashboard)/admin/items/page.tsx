"use client";

import { useState } from 'react';
import { useItems } from '@/lib/hooks/queries/useItems';
import ItemGrid from '@/components/admin/items/ItemGrid';
import SearchBar from '@/components/admin/shared/SearchBar';
import FilterDropdown from '@/components/admin/shared/FilterDropdown';
import { LoadingSkeleton, CardSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Plus, Grid, List } from 'lucide-react';
import BulkActionsToolbar from '@/components/admin/items/BulkActionsToolbar';
import BulkUpdateModal from '@/components/admin/items/BulkUpdateModal';
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
import { useAdminStore } from '@/lib/stores/adminStore';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import { useDeleteItem, useBulkUpdateItems, useBulkDeleteItems } from '@/lib/hooks/queries/useItems';
import toast from 'react-hot-toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useSearchItems } from '@/lib/hooks/queries/useItems';
import { useCategories } from '@/lib/hooks/queries/useCategories';
import ItemForm from '@/components/admin/items/ItemForm';

export default function ItemsPage() {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [bulkUpdateField, setBulkUpdateField] = useState<'min_quantity' | 'category' | 'unit' | 'all'>('all');
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 300);
    const { viewMode, setViewMode } = useAdminStore();

    const { data: allItems, isLoading: allItemsLoading } = useItems();
    const { data: categories, isLoading: categoriesLoading } = useCategories();
    const { data: searchResults, isLoading: searchLoading } = useSearchItems(debouncedSearch);

    const deleteMutation = useDeleteItem();
    const bulkUpdateMutation = useBulkUpdateItems();
    const bulkDeleteMutation = useBulkDeleteItems();

    const isLoading = allItemsLoading || categoriesLoading || searchLoading;

    let items = allItems || [];
    // Filter by category if selected
    if (categoryFilter && items.length > 0) {
        items = items.filter((item: any) => {
            // Handle category as object (from join) or category_id
            const itemCategoryId = item.category_id
                || (typeof item.category === 'object' && item.category !== null ? item.category.id : null);
            return itemCategoryId?.toString() === categoryFilter;
        });
    }
    if (debouncedSearch) {
        items = searchResults || [];
    }

    const handleFormSuccess = () => {
        setShowAddForm(false);
        setEditingItem(null);
    };

    const handleFormCancel = () => {
        setShowAddForm(false);
        setEditingItem(null);
    };

    const handleDelete = async (item: any) => {
        try {
            await deleteMutation.mutateAsync(item.id);
            toast.success('Item deleted successfully');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete item');
        }
    };

    const handleItemToggle = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleSelectAll = (select: boolean) => {
        if (select) {
            const allItemIds = new Set(items.map((item: any) => item.id));
            setSelectedItems(allItemIds);
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleBulkDelete = async () => {
        try {
            await bulkDeleteMutation.mutateAsync(Array.from(selectedItems));
            toast.success(`Successfully deleted ${selectedItems.size} item${selectedItems.size !== 1 ? 's' : ''}`);
            setSelectedItems(new Set());
            setShowBulkDeleteDialog(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete items');
        }
    };

    const handleBulkUpdateSuccess = () => {
        setShowBulkUpdateModal(false);
        setSelectedItems(new Set());
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">Items</h1>
                    <p className="text-sm text-zinc-600 mt-1">Manage your inventory items</p>
                </div>
                <div className="flex items-center gap-2">
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
                    <Button onClick={() => setShowAddForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                    </Button>
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

            {/* Bulk Actions Toolbar - Always visible to show selection hint */}
            <BulkActionsToolbar
                selectedCount={selectedItems.size}
                onUpdateMinQuantity={() => {
                    setBulkUpdateField('min_quantity');
                    setShowBulkUpdateModal(true);
                }}
                onUpdateCategory={() => {
                    setBulkUpdateField('category');
                    setShowBulkUpdateModal(true);
                }}
                onUpdateUnit={() => {
                    setBulkUpdateField('unit');
                    setShowBulkUpdateModal(true);
                }}
                onBulkUpdate={() => {
                    setBulkUpdateField('all');
                    setShowBulkUpdateModal(true);
                }}
                onDelete={() => setShowBulkDeleteDialog(true)}
                onClearSelection={() => setSelectedItems(new Set())}
                isLoading={bulkUpdateMutation.isPending || bulkDeleteMutation.isPending}
            />

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
                    selectedItems={selectedItems}
                    onItemToggle={handleItemToggle}
                    onSelectAll={handleSelectAll}
                    onEdit={(item) => {
                        setEditingItem(item);
                        setShowAddForm(true);
                    }}
                    onDelete={handleDelete}
                />
            )}

            {/* Add/Edit Form */}
            <MobileSheet
                isOpen={showAddForm || !!editingItem}
                onClose={handleFormCancel}
                title={editingItem ? 'Edit Item' : 'Add Item'}
            >
                <ItemForm
                    item={editingItem}
                    onSuccess={handleFormSuccess}
                    onCancel={handleFormCancel}
                />
            </MobileSheet>

            {/* Bulk Update Modal */}
            {showBulkUpdateModal && selectedItems.size > 0 && (
                <MobileSheet
                    isOpen={showBulkUpdateModal}
                    onClose={() => setShowBulkUpdateModal(false)}
                    title="Bulk Update Items"
                    snapPoints={[0, 0.5, 0.7]}
                >
                    <BulkUpdateModal
                        itemIds={Array.from(selectedItems)}
                        selectedCount={selectedItems.size}
                        updateField={bulkUpdateField}
                        onSuccess={handleBulkUpdateSuccess}
                        onCancel={() => setShowBulkUpdateModal(false)}
                    />
                </MobileSheet>
            )}

            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{selectedItems.size}</strong> item{selectedItems.size !== 1 ? 's' : ''}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={bulkDeleteMutation.isPending}
                        >
                            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

