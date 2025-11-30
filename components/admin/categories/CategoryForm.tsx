"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
    initialData?: {
        name: string;
        description?: string | undefined;
    };
    onSubmit: (data: CategoryFormData) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function CategoryForm({ initialData, onSubmit, onCancel, isLoading }: CategoryFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
        },
    });

    const descriptionLength = watch('description')?.length || 0;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name" className="mb-2">
                    Name <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="name"
                    {...register('name')}
                    placeholder="Enter category name"
                    className={cn(errors.name && 'border-red-500')}
                    disabled={isLoading}
                />
                {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
            </div>

            <div>
                <Label htmlFor="description" className="mb-2">
                    Description (Optional)
                </Label>
                <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Enter category description"
                    rows={4}
                    maxLength={500}
                    className={cn(errors.description && 'border-red-500')}
                    disabled={isLoading}
                />
                {errors.description && (
                    <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
                <p className="text-xs text-zinc-500 mt-1">
                    {descriptionLength}/500 characters
                </p>
            </div>

            <div className="flex gap-2 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1"
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                >
                    {isLoading ? 'Saving...' : initialData ? 'Update Category' : 'Create Category'}
                </Button>
            </div>
        </form>
    );
}

