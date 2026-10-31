"use client";

import { MapPin, Snowflake, Thermometer, Sun, Package, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useItems } from '@/lib/hooks/queries/useItems';
import type { LocationFormData } from './LocationDetailsStep';
import type { WizardStorageSpace } from './StorageSpacesStep';
import type { ItemAssignmentData } from './AssignItemsStep';

interface ReviewStepProps {
    locationData: LocationFormData;
    storageSpaces: WizardStorageSpace[];
    itemAssignments: Record<string, ItemAssignmentData>;
    onEditStep: (step: number) => void;
}

const TEMP_TYPE_CONFIG = {
    frozen: { icon: Snowflake, label: 'Frozen', color: 'text-blue-600 bg-blue-50' },
    refrigerated: { icon: Thermometer, label: 'Refrigerated', color: 'text-cyan-600 bg-cyan-50' },
    dry: { icon: Sun, label: 'Dry Storage', color: 'text-amber-600 bg-amber-50' },
} as const;

export default function ReviewStep({
    locationData,
    storageSpaces,
    itemAssignments,
    onEditStep,
}: ReviewStepProps) {
    const { data: allItems } = useItems();
    const itemsMap = new Map(allItems?.map(item => [item.id, item]) || []);

    const totalItems = Object.values(itemAssignments).reduce(
        (sum, a) => sum + a.selectedItems.size, 0
    );

    return (
        <div className="space-y-6">
            {/* Location Details */}
            <div className="border border-zinc-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-zinc-900">Location Details</h3>
                    <button
                        onClick={() => onEditStep(1)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </button>
                </div>
                <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-zinc-400 mt-0.5" />
                    <div>
                        <p className="font-medium text-zinc-900">{locationData.name}</p>
                        <p className="text-sm text-zinc-500">
                            {locationData.address.street}, {locationData.address.city}, {locationData.address.state} {locationData.address.zip}
                        </p>
                        <span className={cn(
                            "inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            locationData.is_active
                                ? "bg-green-50 text-green-700"
                                : "bg-zinc-100 text-zinc-600"
                        )}>
                            {locationData.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Storage Spaces */}
            <div className="border border-zinc-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-zinc-900">
                        Storage Spaces ({storageSpaces.length})
                    </h3>
                    <button
                        onClick={() => onEditStep(2)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </button>
                </div>
                <div className="space-y-2">
                    {storageSpaces.map((space) => {
                        const config = TEMP_TYPE_CONFIG[space.temperature_type];
                        const Icon = config.icon;
                        const assignment = itemAssignments[space.tempId];
                        const itemCount = assignment?.selectedItems.size || 0;

                        return (
                            <div key={space.tempId} className="border border-zinc-100 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded", config.color)}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-zinc-900 text-sm">{space.name}</p>
                                            <p className="text-xs text-zinc-500">{config.label}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-zinc-500">
                                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Item list for this space */}
                                {itemCount > 0 && (
                                    <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1.5">
                                        {Array.from(assignment.selectedItems).map(itemId => {
                                            const item = itemsMap.get(itemId);
                                            if (!item) return null;
                                            const qty = assignment.itemQuantities[itemId] || 0;
                                            const override = assignment.itemMinQuantityOverrides[itemId];
                                            return (
                                                <div key={itemId} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-3.5 h-3.5 text-zinc-400" />
                                                        <span className="text-zinc-700">{item.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                        <span>Qty: {qty}</span>
                                                        {override != null && (
                                                            <span>Min: {override}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary */}
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h4 className="text-sm font-medium text-indigo-900 mb-1">Summary</h4>
                <p className="text-sm text-indigo-700">
                    Creating <strong>{locationData.name}</strong> with{' '}
                    <strong>{storageSpaces.length}</strong> storage space{storageSpaces.length !== 1 ? 's' : ''} and{' '}
                    <strong>{totalItems}</strong> item assignment{totalItems !== 1 ? 's' : ''}.
                </p>
            </div>
        </div>
    );
}
