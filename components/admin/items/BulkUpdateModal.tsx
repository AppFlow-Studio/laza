"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useBulkUpdateItems } from '@/lib/hooks/queries/useItems';
import toast from 'react-hot-toast';
import { useCategories } from '@/lib/hooks/queries/useCategories';

const bulkUpdateSchema = z.object({
    min_quantity: z.number().min(0).optional(),
    category_id: z.string().optional().nullable(),
    unit_of_measure: z.enum(['pcs', 'kg', 'liters', 'lbs', 'oz']).optional(),
});

type BulkUpdateFormData = z.infer<typeof bulkUpdateSchema>;

interface BulkUpdateModalProps {
    itemIds: string[];
    selectedCount: number;
    onSuccess: () => void;
    onCancel: () => void;
    updateField?: 'min_quantity' | 'category' | 'unit' | 'all';
}

export default function BulkUpdateModal({
    itemIds,
    selectedCount,
    onSuccess,
    onCancel,
    updateField = 'all',
}: BulkUpdateModalProps) {
    const updateMutation = useBulkUpdateItems();
    const { data: categories } = useCategories();

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
        },
    });

    const onSubmit = async (data: BulkUpdateFormData) => {
        // Filter out undefined values based on updateField
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

        if (Object.keys(updates).length === 0) {
            toast.error('Please provide at least one field to update');
            return;
        }

        try {
            await updateMutation.mutateAsync({
                itemIds,
                updates: updates as any,
            });
            toast.success(`Successfully updated ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update items');
        }
    };

    const showMinQuantity = updateField === 'all' || updateField === 'min_quantity';
    const showCategory = updateField === 'all' || updateField === 'category';
    const showUnit = updateField === 'all' || updateField === 'unit';

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

            <div className="flex gap-2 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1"
                    disabled={updateMutation.isPending}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? 'Updating...' : 'Update Items'}
                </Button>
            </div>
        </form>
    );
}

