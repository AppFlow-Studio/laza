"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sheet } from 'react-modal-sheet';
import { useUser } from '@clerk/nextjs';
import { useUpdateQuantity } from '@/lib/hooks/queries/useEmployee';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Package, ArrowUp, ArrowDown, Minus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const quantitySchema = z.object({
    new_quantity: z.number().min(0, 'Quantity must be 0 or greater'),
    action_type: z.enum(['count', 'adjustment', 'received', 'used']),
    notes: z.string().max(200, 'Notes must be 200 characters or less').optional(),
});

type QuantityFormData = z.infer<typeof quantitySchema>;

interface QuantityUpdateSheetProps {
    item: any;
    currentQuantity: number;
    locationId: string;
    storageSpaceId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const actionTypes = [
    { value: 'received', label: 'Received', icon: ArrowUp, color: 'bg-green-50 text-green-600 border-green-200' },
    { value: 'used', label: 'Used', icon: ArrowDown, color: 'bg-red-50 text-red-600 border-red-200' },
    { value: 'adjustment', label: 'Adjustment', icon: Minus, color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { value: 'count', label: 'Count', icon: CheckCircle2, color: 'bg-purple-50 text-purple-600 border-purple-200' },
];

export default function QuantityUpdateSheet({
    item,
    currentQuantity,
    locationId,
    storageSpaceId,
    isOpen,
    onClose,
    onSuccess,
}: QuantityUpdateSheetProps) {
    const { user } = useUser();
    const updateMutation = useUpdateQuantity();
    const [quantityChange, setQuantityChange] = useState<number>(0);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        reset,
    } = useForm<QuantityFormData>({
        resolver: zodResolver(quantitySchema),
        defaultValues: {
            new_quantity: currentQuantity,
            action_type: 'count',
            notes: '',
        },
    });

    const newQuantity = watch('new_quantity');
    const actionType = watch('action_type');

    useEffect(() => {
        if (newQuantity !== undefined && !isNaN(newQuantity)) {
            const change = newQuantity - currentQuantity;
            setQuantityChange(change);
        }
    }, [newQuantity, currentQuantity]);

    useEffect(() => {
        if (isOpen) {
            reset({
                new_quantity: currentQuantity,
                action_type: 'count',
                notes: '',
            });
        }
    }, [isOpen, currentQuantity, reset]);

    const onSubmit = async (data: QuantityFormData) => {
        if (data.new_quantity === currentQuantity) {
            toast.error('New quantity must be different from current quantity');
            return;
        }

        try {
            await updateMutation.mutateAsync({
                itemId: item.id,
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
        <Sheet isOpen={isOpen} onClose={onClose} snapPoints={[0, 0.5, 1]} initialSnap={0}>
            <Sheet.Container>
                <Sheet.Header />
                <Sheet.Content>
                    <div className="flex flex-col h-full bg-white rounded-t-2xl">
                        <div className="px-4 pt-4 pb-3 border-b border-zinc-200 flex-shrink-0">
                            <h2 className="text-xl font-bold text-zinc-900 mb-1">{item?.name || 'Update Quantity'}</h2>
                            {item?.sku && (
                                <p className="text-sm text-zinc-500">SKU: {item.sku}</p>
                            )}
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                                {/* Current Quantity Display */}
                                <div className="bg-zinc-50 rounded-xl p-4 text-center">
                                    <p className="text-sm text-zinc-600 mb-1">Current Quantity</p>
                                    <p className="text-3xl font-bold text-zinc-900">{currentQuantity.toFixed(2)}</p>
                                    <p className="text-sm text-zinc-500 mt-1">{item?.unit_of_measure || ''}</p>
                                </div>

                                {/* New Quantity Input */}
                                <div>
                                    <Label htmlFor="new_quantity" className="mb-2">New Quantity *</Label>
                                    <Input
                                        id="new_quantity"
                                        type="number"
                                        step="0.01"
                                        {...register('new_quantity', { valueAsNumber: true })}
                                        className={cn(
                                            "text-lg",
                                            errors.new_quantity ? 'border-red-500' : ''
                                        )}
                                        autoFocus
                                    />
                                    {errors.new_quantity && (
                                        <p className="text-sm text-red-500 mt-1">{errors.new_quantity.message}</p>
                                    )}
                                </div>

                                {/* Quantity Change Preview */}
                                <AnimatePresence>
                                    {quantityChange !== 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className={cn(
                                                "rounded-xl p-4 text-center",
                                                quantityChange > 0
                                                    ? "bg-green-50 border-2 border-green-200"
                                                    : "bg-red-50 border-2 border-red-200"
                                            )}
                                        >
                                            <p className="text-sm text-zinc-600 mb-1">Change</p>
                                            <p className={cn(
                                                "text-2xl font-bold",
                                                quantityChange > 0 ? "text-green-600" : "text-red-600"
                                            )}>
                                                {quantityChange > 0 ? '+' : ''}{quantityChange.toFixed(2)}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Action Type Selector */}
                                <div>
                                    <Label className="mb-3 block">Action Type *</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {actionTypes.map((action) => {
                                            const Icon = action.icon;
                                            const isSelected = actionType === action.value;
                                            return (
                                                <motion.button
                                                    key={action.value}
                                                    type="button"
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => setValue('action_type', action.value as any)}
                                                    className={cn(
                                                        "p-4 rounded-xl border-2 transition-all text-left",
                                                        isSelected
                                                            ? `${action.color} border-current`
                                                            : "bg-white border-zinc-200 hover:border-zinc-300"
                                                    )}
                                                >
                                                    <Icon className="w-5 h-5 mb-2" />
                                                    <p className="font-semibold text-sm">{action.label}</p>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                    {errors.action_type && (
                                        <p className="text-sm text-red-500 mt-1">{errors.action_type.message}</p>
                                    )}
                                </div>

                                {/* Notes */}
                                <div>
                                    <Label htmlFor="notes" className="mb-2">Notes (Optional)</Label>
                                    <Textarea
                                        id="notes"
                                        {...register('notes')}
                                        rows={3}
                                        placeholder="Add a note (optional)"
                                        maxLength={200}
                                        className={errors.notes ? 'border-red-500' : ''}
                                    />
                                    {errors.notes && (
                                        <p className="text-sm text-red-500 mt-1">{errors.notes.message}</p>
                                    )}
                                    <p className="text-xs text-zinc-500 mt-1">
                                        {watch('notes')?.length || 0}/200 characters
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="px-4 pt-4 pb-6 border-t border-zinc-200 space-y-2 flex-shrink-0">
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={updateMutation.isPending || quantityChange === 0}
                                    size="lg"
                                >
                                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={onClose}
                                    className="w-full"
                                    disabled={updateMutation.isPending}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={onClose} />
        </Sheet>
    );
}

