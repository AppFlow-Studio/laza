"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const storageSpaceSchema = z.object({
    name: z.string().min(1, 'Storage space name is required'),
    temperature_type: z.enum(['frozen', 'refrigerated', 'dry']),
});

type StorageSpaceFormData = z.infer<typeof storageSpaceSchema>;

interface StorageSpaceFormStepProps {
    onSubmit: (data: StorageSpaceFormData) => void;
    isLoading?: boolean;
    defaultValues?: Partial<StorageSpaceFormData>;
}

export default function StorageSpaceFormStep({ onSubmit, isLoading, defaultValues }: StorageSpaceFormStepProps) {
    const {
        register,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm<StorageSpaceFormData>({
        resolver: zodResolver(storageSpaceSchema),
        defaultValues: {
            name: defaultValues?.name ?? '',
            temperature_type: defaultValues?.temperature_type ?? 'dry',
        },
        mode: 'onChange',
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label className='my-2' htmlFor="name">Storage Space Name</Label>
                <Input
                    id="name"
                    {...register('name')}
                    placeholder="e.g., Freezer A, Dry Storage 1"
                    className={errors.name ? 'border-red-500' : ''}
                    disabled={isLoading}
                />
                {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
            </div>

            <div>
                <Label className='my-2' htmlFor="temperature_type">Temperature Type</Label>
                <select
                    id="temperature_type"
                    {...register('temperature_type')}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isLoading}
                >
                    <option value="frozen">Frozen</option>
                    <option value="refrigerated">Refrigerated</option>
                    <option value="dry">Dry Storage</option>
                </select>
                {errors.temperature_type && (
                    <p className="text-sm text-red-500 mt-1">{errors.temperature_type.message}</p>
                )}
            </div>

            <div className="pt-4">
                <Button
                    type="submit"
                    className="w-full"
                    disabled={!isValid || isLoading}
                >
                    {isLoading ? 'Creating...' : 'Create Storage Space'}
                </Button>
            </div>
        </form>
    );
}

