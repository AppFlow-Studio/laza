"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useSuperAdminBulkUpdateItems, useBulkUpdateItemPrices, useItems } from '@/lib/hooks/queries/useItems';
import toast from 'react-hot-toast';
import { useCategories } from '@/lib/hooks/queries/useCategories';

const bulkUpdateSchema = z.object({
    min_quantity: z.number().min(0).optional(),
    category_id: z.string().optional().nullable(),
    unit_of_measure: z.enum(['pcs', 'kg', 'liters', 'lbs', 'oz']).optional(),
    price_increase_pct: z.number().min(0.1).max(1000).optional(),
    is_warehouse_item: z.enum(['true', 'false', '']).optional(),
});

type BulkUpdateFormData = z.infer<typeof bulkUpdateSchema>;

interface BulkUpdateModalProps {
    itemIds: string[];
    selectedCount: number;
    onSuccess: () => void;
    onCancel: () => void;
    updateField?: 'min_quantity' | 'category' | 'unit' | 'price' | 'warehouse' | 'all';
}

export default function BulkUpdateModal({
    itemIds,
    selectedCount,
    onSuccess,
    onCancel,
    updateField = 'all',
}: BulkUpdateModalProps) {
    const updateMutation = useSuperAdminBulkUpdateItems();
    const priceUpdateMutation = useBulkUpdateItemPrices();
    const { data: categories } = useCategories();
    const { data: allItems } = useItems();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<BulkUpdateFormData>({
        resolver: zodResolver(bulkUpdateSchema),
        defaultValues: {
            min_quantity: undefined,
            category_id: undefined,
            unit_of_measure: undefined,
            price_increase_pct: undefined,
            is_warehouse_item: '',
        },
    });

    const onSubmit = async (data: BulkUpdateFormData) => {
        const updates: Partial<BulkUpdateFormData> = {};

        if (updateField === 'all' || updateField === 'min_quantity') {
            if (data.min_quantity !== undefined) {
                updates.min_quantity = data.min_quantity;
            }
        }
        if (updateField === 'all' || updateField === 'category') {
            if (data.category_id !== undefined) {
                updates.category_id = data.category_id || null;
            }
        }
        if (updateField === 'all' || updateField === 'unit') {
            if (data.unit_of_measure !== undefined) {
                updates.unit_of_measure = data.unit_of_measure;
            }
        }

        if ((updateField === 'all' || updateField === 'warehouse') && data.is_warehouse_item !== '' && data.is_warehouse_item !== undefined) {
            (updates as any).is_warehouse_item = data.is_warehouse_item === 'true';
        }

        const hasPriceUpdate = (updateField === 'all' || updateField === 'price') && data.price_increase_pct !== undefined;

        if (Object.keys(updates).length === 0 && !hasPriceUpdate) {
            toast.error('Please provide at least one field to update');
            return;
        }

        try {
            if (Object.keys(updates).length > 0) {
                await updateMutation.mutateAsync({ itemIds, updates: updates as any });
            }

            if (hasPriceUpdate && allItems) {
                const multiplier = 1 + data.price_increase_pct! / 100;
                // Normalize IDs to strings for comparison — ItemGrid passes numeric IDs at runtime
                const selectedIdSet = new Set(itemIds.map(id => String(id)));
                const priceUpdates = allItems
                    .filter(item => selectedIdSet.has(String(item.id)))
                    .map(item => ({
                        id: item.id,
                        cost_per_unit: Math.round(((item.cost_per_unit ?? 0) * multiplier) * 100) / 100,
                    }));
                await priceUpdateMutation.mutateAsync(priceUpdates);
            }

            toast.success(`Successfully updated ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update items');
        }
    };

    const showMinQuantity = updateField === 'all' || updateField === 'min_quantity';
    const showCategory = updateField === 'all' || updateField === 'category';
    const showUnit = updateField === 'all' || updateField === 'unit';
    const showPrice = updateField === 'all' || updateField === 'price';
    const showWarehouse = updateField === 'all' || updateField === 'warehouse';
    const isPending = updateMutation.isPending || priceUpdateMutation.isPending;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="mb-4">
                <p className="text-sm text-zinc-600">
                    Updating <strong>{selectedCount}</strong> item{selectedCount !== 1 ? 's' : ''}
                </p>
            </div>

            {showMinQuantity && (
                <div>
                    <Label htmlFor="min_quantity">Minimum Quantity (Optional)</Label>
                    <Input
                        id="min_quantity"
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('min_quantity', { valueAsNumber: true })}
                        className={errors.min_quantity ? 'border-red-500' : ''}
                        placeholder="Leave empty to skip"
                    />
                    {errors.min_quantity && (
                        <p className="text-sm text-red-500 mt-1">{errors.min_quantity.message}</p>
                    )}
                </div>
            )}

            {showCategory && (
                <div>
                    <Label htmlFor="category_id">Category (Optional)</Label>
                    <select
                        id="category_id"
                        {...register('category_id')}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select a category (or leave empty to skip)</option>
                        {categories?.map((category) => (
                            <option key={category.id} value={category.id as string}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    {errors.category_id && (
                        <p className="text-sm text-red-500 mt-1">{errors.category_id.message}</p>
                    )}
                </div>
            )}

            {showUnit && (
                <div>
                    <Label htmlFor="unit_of_measure">Unit of Measure (Optional)</Label>
                    <select
                        id="unit_of_measure"
                        {...register('unit_of_measure')}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select a unit (or leave empty to skip)</option>
                        <option value="pcs">Pieces</option>
                        <option value="kg">Kilograms</option>
                        <option value="liters">Liters</option>
                        <option value="lbs">Pounds</option>
                        <option value="oz">Ounces</option>
                    </select>
                    {errors.unit_of_measure && (
                        <p className="text-sm text-red-500 mt-1">{errors.unit_of_measure.message}</p>
                    )}
                </div>
            )}

            {showPrice && (
                <div>
                    <Label htmlFor="price_increase_pct">Increase Price By % (Optional)</Label>
                    <div className="relative">
                        <Input
                            id="price_increase_pct"
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="1000"
                            {...register('price_increase_pct', { valueAsNumber: true })}
                            className={`pr-8 ${errors.price_increase_pct ? 'border-red-500' : ''}`}
                            placeholder="e.g. 20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">%</span>
                    </div>
                    {errors.price_increase_pct && (
                        <p className="text-sm text-red-500 mt-1">{errors.price_increase_pct.message}</p>
                    )}
                </div>
            )}

            {showWarehouse && (
                <div>
                    <Label htmlFor="is_warehouse_item">Warehouse Item (Optional)</Label>
                    <select
                        id="is_warehouse_item"
                        {...register('is_warehouse_item')}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Leave empty to skip</option>
                        <option value="true">Yes — Warehouse item</option>
                        <option value="false">No — Not a warehouse item</option>
                    </select>
                </div>
            )}

            <div className="flex gap-2 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1"
                    disabled={isPending}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={isPending}
                >
                    {isPending ? 'Updating...' : 'Update Items'}
                </Button>
            </div>
        </form>
    );
}

