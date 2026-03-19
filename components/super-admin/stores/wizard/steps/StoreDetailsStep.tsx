"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocations } from '@/lib/hooks/queries/useLocations';
import { Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

const storeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.object({
        street:  z.string().min(1, 'Street is required'),
        city:    z.string().min(1, 'City is required'),
        state:   z.string().min(1, 'State is required'),
        zip:     z.string().min(1, 'ZIP is required'),
        country: z.string().optional(),
    }),
    is_active:      z.boolean(),
    clone_from_id:  z.string().nullable(),
});

export type StoreFormData = z.infer<typeof storeSchema>;

interface StoreDetailsStepProps {
    defaultValues?: StoreFormData | null;
    onSubmit: (data: StoreFormData) => void;
}

export default function StoreDetailsStep({ defaultValues, onSubmit }: StoreDetailsStepProps) {
    const { data: existingLocations = [] } = useLocations();
    // Only show stores (not warehouses) as clone sources
    const storeLocations = existingLocations.filter((l: any) =>
        !l.location_type || l.location_type === 'store'
    );

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<StoreFormData>({
        resolver: zodResolver(storeSchema),
        defaultValues: defaultValues || {
            name: '',
            address: { street: '', city: '', state: '', zip: '', country: 'US' },
            is_active: true,
            clone_from_id: null,
        },
    });

    const cloneFromId = watch('clone_from_id');

    return (
        <form id="store-details-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
                <Label className="my-2" htmlFor="name">Store Name</Label>
                <Input
                    id="name"
                    {...register('name')}
                    placeholder="e.g., Brooklyn Location"
                    className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Address */}
            <div>
                <Label className="my-2" htmlFor="street">Street Address</Label>
                <Input
                    id="street"
                    {...register('address.street')}
                    placeholder="123 Main St"
                    className={errors.address?.street ? 'border-red-500' : ''}
                />
                {errors.address?.street && <p className="text-sm text-red-500 mt-1">{errors.address.street.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="my-2" htmlFor="city">City</Label>
                    <Input id="city" {...register('address.city')} className={errors.address?.city ? 'border-red-500' : ''} />
                    {errors.address?.city && <p className="text-sm text-red-500 mt-1">{errors.address.city.message}</p>}
                </div>
                <div>
                    <Label className="my-2" htmlFor="state">State</Label>
                    <Input id="state" {...register('address.state')} className={errors.address?.state ? 'border-red-500' : ''} />
                    {errors.address?.state && <p className="text-sm text-red-500 mt-1">{errors.address.state.message}</p>}
                </div>
            </div>

            <div>
                <Label className="my-2" htmlFor="zip">ZIP Code</Label>
                <Input id="zip" {...register('address.zip')} className={errors.address?.zip ? 'border-red-500' : ''} />
                {errors.address?.zip && <p className="text-sm text-red-500 mt-1">{errors.address.zip.message}</p>}
            </div>

            <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" {...register('is_active')} className="w-4 h-4 rounded border-zinc-300" />
                <Label className="my-2" htmlFor="is_active">Active</Label>
            </div>

            {/* Clone from existing store */}
            {storeLocations.length > 0 && (
                <div className="border border-zinc-200 rounded-lg p-4 space-y-2 bg-zinc-50">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                        <Copy className="w-4 h-4 text-indigo-500" />
                        Clone layout from existing store <span className="text-zinc-400 font-normal">(optional)</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                        Copies storage spaces and item assignments from the selected store to save setup time.
                    </p>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                        <button
                            type="button"
                            onClick={() => setValue('clone_from_id', null)}
                            className={cn(
                                'px-3 py-2 rounded-lg border text-sm text-left transition-all',
                                cloneFromId === null
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300',
                            )}
                        >
                            Start fresh
                        </button>
                        {storeLocations.map((loc: any) => {
                            const addr = typeof loc.address === 'string' ? JSON.parse(loc.address) : loc.address;
                            return (
                                <button
                                    key={loc.id}
                                    type="button"
                                    onClick={() => setValue('clone_from_id', loc.id)}
                                    className={cn(
                                        'px-3 py-2 rounded-lg border text-sm text-left transition-all',
                                        cloneFromId === loc.id
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                                            : 'border-zinc-200 text-zinc-600 hover:border-zinc-300',
                                    )}
                                >
                                    <span className="font-medium">{loc.name}</span>
                                    {addr && (
                                        <span className="text-zinc-400 ml-2 font-normal">
                                            {addr.city}, {addr.state}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </form>
    );
}
