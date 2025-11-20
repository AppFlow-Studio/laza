"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCreateLocation, useUpdateLocation } from '@/lib/hooks/queries/useLocations';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { Location } from '@/lib/supabase/types';

const locationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        zip: z.string().min(1, 'ZIP is required'),
        country: z.string().optional(),
    }),
    is_active: z.boolean().default(true),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface LocationFormProps {
    location?: Location;
    organizationId: string;
    onSuccess: () => void;
}

export default function LocationForm({ location, organizationId, onSuccess }: LocationFormProps) {
    const createMutation = useCreateLocation();
    const updateMutation = useUpdateLocation();

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<LocationFormData>({
        resolver: zodResolver(locationSchema),
        defaultValues: {
            name: location?.name || '',
            address: typeof location?.address === 'string'
                ? JSON.parse(location.address)
                : location?.address || {
                    street: '',
                    city: '',
                    state: '',
                    zip: '',
                    country: 'US',
                },
            is_active: location?.is_active ?? true,
        },
    });

    const onSubmit = async (data: LocationFormData) => {
        try {
            if (location) {
                await updateMutation.mutateAsync({
                    id: location.id,
                    updates: {
                        name: data.name,
                        address: data.address,
                        is_active: data.is_active,
                    },
                });
                toast.success('Location updated successfully');
            } else {
                await createMutation.mutateAsync({
                    organization_id: organizationId,
                    ...data,
                });
                toast.success('Location created successfully');
            }
            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'An error occurred');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Location Name</Label>
                <Input
                    id="name"
                    {...register('name')}
                    className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
            </div>

            <div>
                <Label htmlFor="street">Street Address</Label>
                <Input
                    id="street"
                    {...register('address.street')}
                    className={errors.address?.street ? 'border-red-500' : ''}
                />
                {errors.address?.street && (
                    <p className="text-sm text-red-500 mt-1">{errors.address.street.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                        id="city"
                        {...register('address.city')}
                        className={errors.address?.city ? 'border-red-500' : ''}
                    />
                    {errors.address?.city && (
                        <p className="text-sm text-red-500 mt-1">{errors.address.city.message}</p>
                    )}
                </div>
                <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                        id="state"
                        {...register('address.state')}
                        className={errors.address?.state ? 'border-red-500' : ''}
                    />
                    {errors.address?.state && (
                        <p className="text-sm text-red-500 mt-1">{errors.address.state.message}</p>
                    )}
                </div>
            </div>

            <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                    id="zip"
                    {...register('address.zip')}
                    className={errors.address?.zip ? 'border-red-500' : ''}
                />
                {errors.address?.zip && (
                    <p className="text-sm text-red-500 mt-1">{errors.address.zip.message}</p>
                )}
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="is_active"
                    {...register('is_active')}
                    className="w-4 h-4 rounded border-zinc-300"
                />
                <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2 pt-4">
                <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1"
                >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : location ? 'Update' : 'Create'}
                </Button>
            </div>
        </form>
    );
}

