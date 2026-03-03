"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const locationSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        zip: z.string().min(1, 'ZIP is required'),
        country: z.string().optional(),
    }),
    is_active: z.boolean(),
});

export type LocationFormData = z.infer<typeof locationSchema>;

interface LocationDetailsStepProps {
    defaultValues?: LocationFormData | null;
    onSubmit: (data: LocationFormData) => void;
}

export default function LocationDetailsStep({ defaultValues, onSubmit }: LocationDetailsStepProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LocationFormData>({
        resolver: zodResolver(locationSchema),
        defaultValues: defaultValues || {
            name: '',
            address: {
                street: '',
                city: '',
                state: '',
                zip: '',
                country: 'US',
            },
            is_active: true,
        },
    });

    return (
        <form id="location-details-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label className="my-2" htmlFor="name">Location Name</Label>
                <Input
                    id="name"
                    {...register('name')}
                    placeholder="e.g., Downtown Cafe"
                    className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
            </div>

            <div>
                <Label className="my-2" htmlFor="street">Street Address</Label>
                <Input
                    id="street"
                    {...register('address.street')}
                    placeholder="123 Main St"
                    className={errors.address?.street ? 'border-red-500' : ''}
                />
                {errors.address?.street && (
                    <p className="text-sm text-red-500 mt-1">{errors.address.street.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="my-2" htmlFor="city">City</Label>
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
                    <Label className="my-2" htmlFor="state">State</Label>
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
                <Label className="my-2" htmlFor="zip">ZIP Code</Label>
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
                <Label className="my-2" htmlFor="is_active">Active</Label>
            </div>
        </form>
    );
}
