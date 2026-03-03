"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Snowflake, Thermometer, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const storageSpaceSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    temperature_type: z.enum(['frozen', 'refrigerated', 'dry']),
});

type StorageSpaceFormData = z.infer<typeof storageSpaceSchema>;

export type WizardStorageSpace = {
    tempId: string;
    name: string;
    temperature_type: 'frozen' | 'refrigerated' | 'dry';
};

interface StorageSpacesStepProps {
    storageSpaces: WizardStorageSpace[];
    onAdd: (space: WizardStorageSpace) => void;
    onRemove: (tempId: string) => void;
}

const TEMP_TYPE_CONFIG = {
    frozen: { icon: Snowflake, label: 'Frozen', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    refrigerated: { icon: Thermometer, label: 'Refrigerated', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    dry: { icon: Sun, label: 'Dry Storage', color: 'text-amber-600 bg-amber-50 border-amber-200' },
} as const;

export default function StorageSpacesStep({ storageSpaces, onAdd, onRemove }: StorageSpacesStepProps) {
    const [showForm, setShowForm] = useState(storageSpaces.length === 0);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isValid },
    } = useForm<StorageSpaceFormData>({
        resolver: zodResolver(storageSpaceSchema),
        defaultValues: { name: '', temperature_type: 'dry' },
        mode: 'onChange',
    });

    const onSubmitForm = (data: StorageSpaceFormData) => {
        onAdd({
            tempId: crypto.randomUUID(),
            name: data.name,
            temperature_type: data.temperature_type,
        });
        reset();
        setShowForm(false);
    };

    return (
        <div className="space-y-4">
            {/* Existing spaces */}
            {storageSpaces.length > 0 && (
                <div className="space-y-2">
                    {storageSpaces.map((space) => {
                        const config = TEMP_TYPE_CONFIG[space.temperature_type];
                        const Icon = config.icon;
                        return (
                            <div
                                key={space.tempId}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border",
                                    config.color
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="w-5 h-5" />
                                    <div>
                                        <p className="font-medium text-zinc-900">{space.name}</p>
                                        <p className="text-xs text-zinc-500">{config.label}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemove(space.tempId)}
                                    className="p-1.5 rounded-md hover:bg-white/50 text-zinc-500 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add form */}
            {showForm ? (
                <div className="border border-zinc-200 rounded-lg p-4 space-y-4">
                    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
                        <div>
                            <Label className="my-2" htmlFor="space-name">Storage Space Name</Label>
                            <Input
                                id="space-name"
                                {...register('name')}
                                placeholder="e.g., Freezer A, Dry Storage 1"
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                            )}
                        </div>

                        <div>
                            <Label className="my-2" htmlFor="temp-type">Temperature Type</Label>
                            <select
                                id="temp-type"
                                {...register('temperature_type')}
                                className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="frozen">Frozen</option>
                                <option value="refrigerated">Refrigerated</option>
                                <option value="dry">Dry Storage</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={!isValid}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                            </Button>
                            {storageSpaces.length > 0 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowForm(false);
                                        reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            ) : (
                <Button
                    variant="outline"
                    onClick={() => setShowForm(true)}
                    className="w-full border-dashed"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Storage Space
                </Button>
            )}

            {storageSpaces.length === 0 && !showForm && (
                <p className="text-sm text-zinc-500 text-center py-4">
                    Add at least one storage space to continue.
                </p>
            )}
        </div>
    );
}
