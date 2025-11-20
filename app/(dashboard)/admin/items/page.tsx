"use client";

import { useState } from 'react';
import { useItems, useItemsByCategory } from '@/lib/hooks/queries/useItems';
import ItemGrid from '@/components/admin/items/ItemGrid';
import SearchBar from '@/components/admin/shared/SearchBar';
import FilterDropdown from '@/components/admin/shared/FilterDropdown';
import { LoadingSkeleton, CardSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateItem, useUpdateItem, useDeleteItem } from '@/lib/hooks/queries/useItems';
import toast from 'react-hot-toast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useSearchItems } from '@/lib/hooks/queries/useItems';

const itemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sku: z.string().optional().nullable(),
    category: z.enum(['desserts', 'ingredients', 'supplies']),
    unit_of_measure: z.enum(['pcs', 'kg', 'liters', 'lbs', 'oz']),
    min_quantity: z.number().min(0),
});

type ItemFormData = z.infer<typeof itemSchema>;

export default function ItemsPage() {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const { data: allItems, isLoading: allItemsLoading, isError: allItemsError } = useItems();
    const { data: categoryItems, isLoading: categoryLoading } = useItemsByCategory(
        categoryFilter as any
    );
    const { data: searchResults, isLoading: searchLoading } = useSearchItems(debouncedSearch);

    const createMutation = useCreateItem();
    const updateMutation = useUpdateItem();
    const deleteMutation = useDeleteItem();

    const isLoading = allItemsLoading || categoryLoading || searchLoading;

    let items = allItems || [];
    if (categoryFilter) {
        items = categoryItems || [];
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
        defaultValues: editingItem || {
            name: '',
            sku: '',
            category: 'desserts',
            unit_of_measure: 'pcs',
            min_quantity: 0,
        },
    });

    const onSubmit = async (data: ItemFormData) => {
        try {
            // TODO: Get organization ID from user context
            const organizationId = 'default-org-id';

            if (editingItem) {
                await updateMutation.mutateAsync({
                    id: editingItem.id,
                    updates: data,
                });
                toast.success('Item updated successfully');
            } else {
                await createMutation.mutateAsync({
                    organization_id: organizationId,
                    ...data,
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">Items</h1>
                    <p className="text-sm text-zinc-600 mt-1">Manage your inventory items</p>
                </div>
                <Button onClick={() => setShowAddForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                </Button>
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
                    options={[
                        { value: 'desserts', label: 'Desserts' },
                        { value: 'ingredients', label: 'Ingredients' },
                        { value: 'supplies', label: 'Supplies' },
                    ]}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
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
                        >
                            <option value="desserts">Desserts</option>
                            <option value="ingredients">Ingredients</option>
                            <option value="supplies">Supplies</option>
                        </select>
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
        </div>
    );
}

