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

const quantitySchema = z.object({
    new_quantity: z.number().min(0),
    action_type: z.enum(['count', 'adjustment', 'received', 'used']),
    notes: z.string().optional(),
});

type QuantityFormData = z.infer<typeof quantitySchema>;

interface QuantityUpdateModalProps {
    itemId: string;
    locationId: string;
    storageSpaceId: string | null;
    currentQuantity: number;
    onSuccess: () => void;
}

export default function QuantityUpdateModal({
    itemId,
    locationId,
    storageSpaceId,
    currentQuantity,
    onSuccess,
}: QuantityUpdateModalProps) {
    const { user } = useUser();
    const updateMutation = useUpdateQuantity();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<QuantityFormData>({
        resolver: zodResolver(quantitySchema),
        defaultValues: {
            new_quantity: currentQuantity,
            action_type: 'count',
            notes: '',
        },
    });

    const onSubmit = async (data: QuantityFormData) => {
        try {
            await updateMutation.mutateAsync({
                itemId,
                locationId,
                storageSpaceId,
                newQuantity: data.new_quantity,
                userId: user?.id || '',
                actionType: data.action_type,
                notes: data.notes,
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
                <Label htmlFor="new_quantity">New Quantity</Label>
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
                <Label htmlFor="action_type">Action Type</Label>
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
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                    id="notes"
                    {...register('notes')}
                    rows={3}
                />
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

