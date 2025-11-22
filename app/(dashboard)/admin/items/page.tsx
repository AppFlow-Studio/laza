"use client";

import { useState, useEffect } from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateItem, useUpdateItem, useDeleteItem, useBulkUpdateItems, useBulkDeleteItems } from '@/lib/hooks/queries/useItems';
import toast from 'react-hot-toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useSearchItems } from '@/lib/hooks/queries/useItems';
import { useCategories } from '@/lib/hooks/queries/useCategories';
import { useUser } from '@clerk/nextjs';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';

const itemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sku: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    unit_of_measure: z.enum(['pcs', 'kg', 'liters', 'lbs', 'oz']),
    min_quantity: z.number().min(0),
});

type ItemFormData = z.infer<typeof itemSchema>;

export default function ItemsPage() {
    const { data: userInfo } = useUserInfo();
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

    const { data: allItems, isLoading: allItemsLoading, isError: allItemsError } = useItems();
    const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useCategories();
    const { data: searchResults, isLoading: searchLoading } = useSearchItems(debouncedSearch);

    const createMutation = useCreateItem();
    const updateMutation = useUpdateItem();
    const deleteMutation = useDeleteItem();
    const bulkUpdateMutation = useBulkUpdateItems();
    const bulkDeleteMutation = useBulkDeleteItems();

    const isLoading = allItemsLoading || categoriesLoading || searchLoading;

    let items = allItems || [];
    // Filter by category if selected
    if (categoryFilter && items.length > 0) {
        items = items.filter((item: any) => {
            const itemCategoryId = typeof item.category === 'object' && item.category !== null
                ? item.category.id
                : item.category;
            return itemCategoryId === categoryFilter;
        });
    }
    if (debouncedSearch) {
        items = searchResults || [];
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: '',
            sku: '',
            category: '',
            unit_of_measure: 'pcs',
            min_quantity: 0,
        },
    });

    // Reset form when editingItem changes
    useEffect(() => {
        if (editingItem && categories) {
            // Extract category ID - handle both object and string formats
            let categoryId = '';
            if (typeof editingItem.category === 'object' && editingItem.category !== null && 'id' in editingItem.category) {
                // Category is an object with id
                categoryId = editingItem.category.id;
            } else if (typeof editingItem.category === 'string') {
                // Category is stored as enum string, find matching category by name
                const matchingCategory = categories.find(cat =>
                    cat.name.toLowerCase() === editingItem.category.toLowerCase()
                );
                categoryId = matchingCategory?.id || '';
            }

            reset({
                name: editingItem.name || '',
                sku: editingItem.sku || '',
                category: categoryId,
                unit_of_measure: editingItem.unit_of_measure || 'pcs',
                min_quantity: editingItem.min_quantity || 0,
            });
        } else if (!editingItem) {
            reset({
                name: '',
                sku: '',
                category: '',
                unit_of_measure: 'pcs',
                min_quantity: 0,
            });
        }
    }, [editingItem, categories, reset]);

    const onSubmit = async (data: ItemFormData) => {
        try {
            const organizationId = userInfo?.members.organization_id;
            console.log(userInfo);
            if (!organizationId) {
                toast.error('Organization not found');
                return;
            }
            console.log(organizationId);



            if (editingItem) {
                await updateMutation.mutateAsync({
                    id: editingItem.id,
                    updates: {
                        name: data.name,
                        sku: data.sku || null,
                        category_id: data.category || null,
                        unit_of_measure: data.unit_of_measure,
                        min_quantity: data.min_quantity,
                    },
                });
                toast.success('Item updated successfully');
            } else {
                await createMutation.mutateAsync({
                    organization_id: organizationId,
                    name: data.name,
                    sku: data.sku || null,
                    category_id: data.category || '',
                    unit_of_measure: data.unit_of_measure,
                    min_quantity: data.min_quantity,
                });
                toast.success('Item created successfully');
            }
            setShowAddForm(false);
            setEditingItem(null);
            reset();
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        }
    };

    const handleDelete = async (item: any) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
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
                onClose={() => {
                    setShowAddForm(false);
                    setEditingItem(null);
                    reset();
                }}
                title={editingItem ? 'Edit Item' : 'Add Item'}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Item Name</Label>
                        <Input
                            id="name"
                            {...register('name')}
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="sku">SKU (Optional)</Label>
                        <Input
                            id="sku"
                            {...register('sku')}
                        />
                    </div>

                    <div>
                        <Label htmlFor="category">Category</Label>
                        <select
                            id="category"
                            {...register('category')}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
                            disabled={categoriesLoading}
                        >
                            <option value="">Select a category</option>
                            {categories?.map((category) => (
                                <option key={category.id} value={category.id as string}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        {errors.category && (
                            <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="unit_of_measure">Unit of Measure</Label>
                        <select
                            id="unit_of_measure"
                            {...register('unit_of_measure')}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
                        >
                            <option value="pcs">Pieces</option>
                            <option value="kg">Kilograms</option>
                            <option value="liters">Liters</option>
                            <option value="lbs">Pounds</option>
                            <option value="oz">Ounces</option>
                        </select>
                    </div>

                    <div>
                        <Label htmlFor="min_quantity">Minimum Quantity</Label>
                        <Input
                            id="min_quantity"
                            type="number"
                            step="0.01"
                            {...register('min_quantity', { valueAsNumber: true })}
                            className={errors.min_quantity ? 'border-red-500' : ''}
                        />
                        {errors.min_quantity && (
                            <p className="text-sm text-red-500 mt-1">{errors.min_quantity.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={createMutation.isPending || updateMutation.isPending}
                    >
                        {createMutation.isPending || updateMutation.isPending
                            ? 'Saving...'
                            : editingItem
                                ? 'Update'
                                : 'Create'}
                    </Button>
                </form>
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

