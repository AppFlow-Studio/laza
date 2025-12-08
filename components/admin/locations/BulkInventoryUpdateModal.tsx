"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useBulkUpdateInventory } from '@/lib/hooks/queries/useInventory';
import toast from 'react-hot-toast';

const bulkInventoryUpdateSchema = z.object({
    quantity: z.number().min(0).optional(),
    minQuantityOverride: z.number().min(0).nullable().optional(),
    actionType: z.enum(['count', 'adjustment', 'received', 'used']),
    notes: z.string().optional(),
    applyToAll: z.boolean().default(true),
});

type BulkInventoryUpdateFormData = z.infer<typeof bulkInventoryUpdateSchema>;

interface BulkInventoryUpdateModalProps {
    selectedItems: Array<{
        itemId: string;
        locationId: string;
        storageSpaceId: string;
        currentQuantity: number;
        itemName: string;
    }>;
    selectedCount: number;
    onSuccess: () => void;
    onCancel: () => void;
    updateField?: 'quantity' | 'minOverride' | 'all';
}

export default function BulkInventoryUpdateModal({
    selectedItems,
    selectedCount,
    onSuccess,
    onCancel,
    updateField = 'all',
}: BulkInventoryUpdateModalProps) {

    const updateMutation = useBulkUpdateInventory();
    const [individualQuantities, setIndividualQuantities] = useState<Record<string, number>>({});

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<BulkInventoryUpdateFormData>({
        resolver: zodResolver(bulkInventoryUpdateSchema),
        defaultValues: {
            quantity: undefined,
            minQuantityOverride: undefined,
            actionType: 'count',
            notes: '',
            applyToAll: true,
        },
    });

    const applyToAll = watch('applyToAll');
    const showQuantity = updateField === 'all' || updateField === 'quantity';
    const showMinOverride = updateField === 'all' || updateField === 'minOverride';

    const onSubmit = async (data: BulkInventoryUpdateFormData) => {
        if (selectedItems.length === 0) {
            toast.error('No items selected');
            return;
        }

        const itemLocations = selectedItems.map((item) => {
            let quantity = item.currentQuantity;

            if (showQuantity) {
                if (applyToAll && data.quantity !== undefined) {
                    quantity = data.quantity;
                } else if (!applyToAll && individualQuantities[item.itemId] !== undefined) {
                    quantity = individualQuantities[item.itemId];
                }
            }

            return {
                itemId: item.itemId,
                locationId: item.locationId,
                storageSpaceId: item.storageSpaceId,
                quantity: showQuantity ? quantity : undefined,
                minQuantityOverride: showMinOverride ? (data.minQuantityOverride ?? null) : undefined,
                actionType: data.actionType,
                notes: data.notes || undefined,
                organizationId: organizationId,
            };
        });

        try {
            await updateMutation.mutateAsync({ itemLocations });
            toast.success(`Successfully updated ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update items');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="mb-4">
                <p className="text-sm text-zinc-600">
                    Updating <strong>{selectedCount}</strong> item{selectedCount !== 1 ? 's' : ''} in storage space
                </p>
            </div>

            {showQuantity && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="checkbox"
                            id="applyToAll"
                            {...register('applyToAll')}
                            className="w-4 h-4"
                        />
                        <Label htmlFor="applyToAll" className="text-sm font-medium cursor-pointer">
                            Apply same quantity to all items
                        </Label>
                    </div>
                    {applyToAll ? (
                        <div>
                            <Label htmlFor="quantity">New Quantity</Label>
                            <Input
                                id="quantity"
                                type="number"
                                step="0.01"
                                min="0"
                                {...register('quantity', { valueAsNumber: true })}
                                className={errors.quantity ? 'border-red-500' : ''}
                                placeholder="Enter quantity"
                            />
                            {errors.quantity && (
                                <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {selectedItems.map((item) => (
                                <div key={item.itemId}>
                                    <Label htmlFor={`qty-${item.itemId}`} className="text-xs">
                                        {item.itemName} (Current: {item.currentQuantity})
                                    </Label>
                                    <Input
                                        id={`qty-${item.itemId}`}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={individualQuantities[item.itemId] ?? item.currentQuantity}
                                        onChange={(e) => {
                                            setIndividualQuantities({
                                                ...individualQuantities,
                                                [item.itemId]: parseFloat(e.target.value) || 0,
                                            });
                                        }}
                                        className="text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {showMinOverride && (
                <div>
                    <Label htmlFor="minQuantityOverride">Min Quantity Override (Optional)</Label>
                    <Input
                        id="minQuantityOverride"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Leave empty to use item default"
                        {...register('minQuantityOverride', {
                            valueAsNumber: true,
                            setValueAs: (v) => v === '' || v === null || v === undefined ? null : Number(v)
                        })}
                        className={errors.minQuantityOverride ? 'border-red-500' : ''}
                    />
                    {errors.minQuantityOverride && (
                        <p className="text-sm text-red-500 mt-1">{errors.minQuantityOverride.message}</p>
                    )}
                </div>
            )}

            <div>
                <Label htmlFor="actionType">Action Type (Required for Logging)</Label>
                <select
                    id="actionType"
                    {...register('actionType')}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="count">Count</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="received">Received</option>
                    <option value="used">Used</option>
                </select>
                {errors.actionType && (
                    <p className="text-sm text-red-500 mt-1">{errors.actionType.message}</p>
                )}
            </div>

            <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                    id="notes"
                    {...register('notes')}
                    rows={3}
                    placeholder="Add notes for this bulk update..."
                />
            </div>

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

