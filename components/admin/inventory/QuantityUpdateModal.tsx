"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateQuantity } from '@/lib/hooks/queries/useInventory';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import { User2 } from 'lucide-react';

const quantitySchema = z.object({
    new_quantity: z.number().min(0),
    action_type: z.enum(['count', 'adjustment', 'received', 'used']),
    notes: z.string().optional(),
    min_quantity_override: z.number().optional().nullable(),
});

type QuantityFormData = z.infer<typeof quantitySchema>;

interface QuantityUpdateModalProps {
    itemId: string;
    locationId: string;
    storageSpaceId: string | null;
    currentQuantity: number;
    currentMinQuantityOverride?: number | null;
    itemMinQuantity?: number;
    onSuccess: () => void;
}

export default function QuantityUpdateModal({
    itemId,
    locationId,
    storageSpaceId,
    currentQuantity,
    currentMinQuantityOverride,
    itemMinQuantity,
    onSuccess,
}: QuantityUpdateModalProps) {
    const { data: userInfo } = useUserInfo();
    const updateMutation = useUpdateQuantity();
    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<QuantityFormData>({
        resolver: zodResolver(quantitySchema),
        defaultValues: {
            new_quantity: currentQuantity,
            action_type: 'count',
            notes: '',
            min_quantity_override: currentMinQuantityOverride || null,
        },
    });


    const minQuantityOverride = watch('min_quantity_override');

    const onSubmit = async (data: QuantityFormData) => {
        try {
            await updateMutation.mutateAsync({
                itemId,
                locationId,
                storageSpaceId,
                newQuantity: data.new_quantity,
                userId: userInfo?.id || '',
                actionType: data.action_type,
                notes: data.notes,
                minQuantityOverride: data.min_quantity_override ?? null,
            });
            toast.success('Quantity updated successfully');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update quantity');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label className='my-2' htmlFor="new_quantity">New Quantity</Label>
                <Input
                    id="new_quantity"
                    type="number"
                    step="0.01"
                    {...register('new_quantity', { valueAsNumber: true })}
                    className={errors.new_quantity ? 'border-red-500' : ''}
                />
                {errors.new_quantity && (
                    <p className="text-sm text-red-500 mt-1">{errors.new_quantity.message}</p>
                )}
                <p className="text-xs text-zinc-500 mt-1">Current: {currentQuantity}</p>
            </div>

            <div>
                <Label className='my-2' htmlFor="action_type">Action Type</Label>
                <select
                    id="action_type"
                    {...register('action_type')}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
                >
                    <option value="count">Count</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="received">Received</option>
                    <option value="used">Used</option>
                </select>
            </div>

            <div>
                <Label className='my-2' htmlFor="min_quantity_override">
                    Min Quantity Override (Optional)
                </Label>
                <Input
                    id="min_quantity_override"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('min_quantity_override', {
                        valueAsNumber: true,
                        setValueAs: (v) => v === '' || v === null || v === undefined ? null : Number(v)
                    })}
                    placeholder={itemMinQuantity ? `Default: ${itemMinQuantity}` : 'Leave empty to use item default'}
                    className={errors.min_quantity_override ? 'border-red-500' : ''}
                />
                {errors.min_quantity_override && (
                    <p className="text-sm text-red-500 mt-1">{errors.min_quantity_override.message}</p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                    {itemMinQuantity && (
                        <>Item default: {itemMinQuantity || 0}. </>
                    )}
                    {minQuantityOverride !== null && minQuantityOverride !== undefined
                        ? `Override set to: ${minQuantityOverride}`
                        : 'No override (using item default)'}
                </p>
            </div>

            <div className='flex items-start gap-2 flex-col justify-center'>
                <Label className='my-2' htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                    id="notes"
                    {...register('notes')}
                    rows={3}
                />
                <p className="text-xs text-zinc-500 mt-1 flex items-center gap-2 ">
                    <User2 className='w-4 h-4' />: {userInfo?.first_name} | {userInfo?.email}
                </p>
            </div>

            <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
            >
                {updateMutation.isPending ? 'Updating...' : 'Update Quantity'}
            </Button>
        </form>
    );
}

