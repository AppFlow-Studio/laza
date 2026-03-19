"use client";

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCreateItem, useUpdateItem } from '@/lib/hooks/queries/useItems';
import { useCategories } from '@/lib/hooks/queries/useCategories';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import toast from 'react-hot-toast';

const itemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    sku: z.string().optional().nullable(),
    category: z.number().optional().nullable(),
    unit_of_measure: z.enum(['pcs', 'kg', 'liters', 'lbs', 'oz']),
    min_quantity: z.number().min(0),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormProps {
    item?: {
        id: number | string;
        name: string;
        sku?: string | null;
        category_id?: number | null;
        category?: {
            id: number;
            name: string;
        } | null;
        unit_of_measure: 'pcs' | 'kg' | 'liters' | 'lbs' | 'oz';
        min_quantity: number;
    } | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function ItemForm({ item, onSuccess, onCancel }: ItemFormProps) {
    const { data: userInfo } = useUserInfo();
    const { data: categories, isLoading: categoriesLoading } = useCategories();
    const createMutation = useCreateItem();
    const updateMutation = useUpdateItem();

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
            category: null,
            unit_of_measure: 'pcs',
            min_quantity: 0,
        },
    });

    // Reset form when item changes
    useEffect(() => {
        if (item && categories) {
            // Extract category ID from item
            // Item can have category_id directly or category object
            let categoryId: number | null = null;

            if (item.category_id) {
                categoryId = item.category_id;
            } else if (item.category && typeof item.category === 'object' && 'id' in item.category) {
                categoryId = item.category.id;
            }

            reset({
                name: item.name || '',
                sku: item.sku || '',
                category: categoryId,
                unit_of_measure: item.unit_of_measure || 'pcs',
                min_quantity: item.min_quantity || 0,
            });
        } else if (!item) {
            reset({
                name: '',
                sku: '',
                category: null,
                unit_of_measure: 'pcs',
                min_quantity: 0,
            });
        }
    }, [item, categories, reset]);

    const onSubmit = async (data: ItemFormData) => {
        try {
            const organizationId = userInfo?.members.organization_id;
            if (!organizationId) {
                toast.error('Organization not found');
                return;
            }

            if (item) {
                // Update existing item
                await updateMutation.mutateAsync({
                    id: String(item.id),
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
                // Create new item
                await createMutation.mutateAsync({
                    item: {
                        organization_id: organizationId,
                        name: data.name,
                        sku: data.sku || null,
                        category_id: data.category || null,
                        unit_of_measure: data.unit_of_measure,
                        min_quantity: data.min_quantity,
                    }
                });
                toast.success('Item created successfully');
            }

            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className='space-y-2'>
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

            <div className='space-y-2'>
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input
                    id="sku"
                    {...register('sku')}
                />
            </div>

            <div className='space-y-2'>
                <Label htmlFor="category">Category</Label>
                <select
                    id="category"
                    {...register('category', {
                        setValueAs: (v) => (v === '' ? null : Number(v))
                    })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
                    disabled={categoriesLoading}
                >
                    <option value="">Select a category</option>
                    {categories?.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
                {errors.category && (
                    <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
                )}
            </div>

            <div className='space-y-2'>
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

            <div className='space-y-2'>
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

            <div className="flex gap-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 hover:bg-zinc-100/50 text-zinc-600"
                        onClick={onCancel}
                        disabled={createMutation.isPending || updateMutation.isPending}
                    >
                        Cancel
                    </Button>
                )}
                <Button
                    type="submit"
                    className={onCancel ? "flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]" : "w-full"}
                    disabled={createMutation.isPending || updateMutation.isPending}
                >
                    {createMutation.isPending || updateMutation.isPending
                        ? 'Saving...'
                        : item
                            ? 'Update'
                            : 'Create'}
                </Button>
            </div>
        </form>
    );
}

