"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUpdateStorageSpace } from '@/lib/hooks/queries/useStorageSpace';
import toast from 'react-hot-toast';
import { StorageSpace } from '@/lib/supabase/types';

const storageSpaceSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    temperature_type: z.enum(['frozen', 'refrigerated', 'dry']),
});

type StorageSpaceFormData = z.infer<typeof storageSpaceSchema>;

interface EditStorageSpaceModalProps {
    storageSpace: StorageSpace;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function EditStorageSpaceModal({
    storageSpace,
    onSuccess,
    onCancel,
}: EditStorageSpaceModalProps) {
    const updateMutation = useUpdateStorageSpace();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<StorageSpaceFormData>({
        resolver: zodResolver(storageSpaceSchema),
        defaultValues: {
            name: storageSpace.name,
            temperature_type: storageSpace.temperature_type,
        },
    });

    const onSubmit = async (data: StorageSpaceFormData) => {
        try {
            await updateMutation.mutateAsync({
                id: storageSpace.id,
                updates: data,
            });
            toast.success('Storage space updated successfully');
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update storage space');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Storage Space Name</Label>
                <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-red-500' : ''}
                    placeholder="e.g., Freezer A, Dry Storage 1"
                />
                {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
            </div>

            <div>
                <Label htmlFor="temperature_type">Temperature Type</Label>
                <select
                    id="temperature_type"
                    {...register('temperature_type')}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="frozen">Frozen</option>
                    <option value="refrigerated">Refrigerated</option>
                    <option value="dry">Dry</option>
                </select>
                {errors.temperature_type && (
                    <p className="text-sm text-red-500 mt-1">{errors.temperature_type.message}</p>
                )}
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
                    {updateMutation.isPending ? 'Updating...' : 'Update Storage Space'}
                </Button>
            </div>
        </form>
    );
}

