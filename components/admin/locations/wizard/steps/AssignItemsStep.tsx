"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ItemAssignmentStep from '@/components/admin/locations/ItemAssignmentStep';
import { Snowflake, Thermometer, Sun } from 'lucide-react';
import type { WizardStorageSpace } from './StorageSpacesStep';

export type ItemAssignmentData = {
    selectedItems: Set<string>;
    itemQuantities: Record<string, number>;
    itemMinQuantityOverrides: Record<string, number | null>;
};

interface AssignItemsStepProps {
    storageSpaces: WizardStorageSpace[];
    itemAssignments: Record<string, ItemAssignmentData>;
    onAssignmentChange: (tempId: string, data: ItemAssignmentData) => void;
}

const TEMP_ICONS = {
    frozen: Snowflake,
    refrigerated: Thermometer,
    dry: Sun,
} as const;

export default function AssignItemsStep({
    storageSpaces,
    itemAssignments,
    onAssignmentChange,
}: AssignItemsStepProps) {
    const getAssignment = (tempId: string): ItemAssignmentData => {
        return itemAssignments[tempId] || {
            selectedItems: new Set<string>(),
            itemQuantities: {},
            itemMinQuantityOverrides: {},
        };
    };

    const handleItemToggle = (tempId: string, itemId: string) => {
        const current = getAssignment(tempId);
        const newSelected = new Set(current.selectedItems);
        const newQuantities = { ...current.itemQuantities };
        const newOverrides = { ...current.itemMinQuantityOverrides };

        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
            delete newQuantities[itemId];
            delete newOverrides[itemId];
        } else {
            newSelected.add(itemId);
            newQuantities[itemId] = 0;
            newOverrides[itemId] = null;
        }

        onAssignmentChange(tempId, {
            selectedItems: newSelected,
            itemQuantities: newQuantities,
            itemMinQuantityOverrides: newOverrides,
        });
    };

    const handleBulkToggle = (tempId: string, itemIds: string[], shouldSelect: boolean) => {
        const current = getAssignment(tempId);
        const newSelected = new Set(current.selectedItems);
        const newQuantities = { ...current.itemQuantities };
        const newOverrides = { ...current.itemMinQuantityOverrides };

        itemIds.forEach(itemId => {
            if (shouldSelect) {
                newSelected.add(itemId);
                newQuantities[itemId] = newQuantities[itemId] ?? 0;
                newOverrides[itemId] = newOverrides[itemId] ?? null;
            } else {
                newSelected.delete(itemId);
                delete newQuantities[itemId];
                delete newOverrides[itemId];
            }
        });

        onAssignmentChange(tempId, {
            selectedItems: newSelected,
            itemQuantities: newQuantities,
            itemMinQuantityOverrides: newOverrides,
        });
    };

    const handleQuantityChange = (tempId: string, itemId: string, quantity: number) => {
        const current = getAssignment(tempId);
        onAssignmentChange(tempId, {
            ...current,
            itemQuantities: { ...current.itemQuantities, [itemId]: quantity },
        });
    };

    const handleMinQuantityOverrideChange = (tempId: string, itemId: string, override: number | null) => {
        const current = getAssignment(tempId);
        onAssignmentChange(tempId, {
            ...current,
            itemMinQuantityOverrides: { ...current.itemMinQuantityOverrides, [itemId]: override },
        });
    };

    const handleSelectAll = (tempId: string) => {
        // Handled internally by ItemAssignmentStep via bulk toggle
    };

    const handleDeselectAll = (tempId: string) => {
        onAssignmentChange(tempId, {
            selectedItems: new Set<string>(),
            itemQuantities: {},
            itemMinQuantityOverrides: {},
        });
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-zinc-500">
                Select items and set initial quantities for each storage space. This step is optional — you can assign items later.
            </p>

            <Tabs defaultValue={storageSpaces[0]?.tempId}>
                <TabsList className="w-full flex-wrap h-auto gap-1">
                    {storageSpaces.map((space) => {
                        const Icon = TEMP_ICONS[space.temperature_type];
                        const assignment = getAssignment(space.tempId);
                        const count = assignment.selectedItems.size;
                        return (
                            <TabsTrigger key={space.tempId} value={space.tempId} className="gap-1.5">
                                <Icon className="w-3.5 h-3.5" />
                                <span>{space.name}</span>
                                {count > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                                        {count}
                                    </span>
                                )}
                            </TabsTrigger>
                        );
                    })}
                </TabsList>

                {storageSpaces.map((space) => {
                    const assignment = getAssignment(space.tempId);
                    return (
                        <TabsContent key={space.tempId} value={space.tempId}>
                            <ItemAssignmentStep
                                selectedItems={assignment.selectedItems}
                                itemQuantities={assignment.itemQuantities}
                                itemMinQuantityOverrides={assignment.itemMinQuantityOverrides}
                                onItemToggle={(itemId) => handleItemToggle(space.tempId, itemId)}
                                onBulkToggle={(itemIds, shouldSelect) => handleBulkToggle(space.tempId, itemIds, shouldSelect)}
                                onQuantityChange={(itemId, qty) => handleQuantityChange(space.tempId, itemId, qty)}
                                onMinQuantityOverrideChange={(itemId, override) => handleMinQuantityOverrideChange(space.tempId, itemId, override)}
                                onSelectAll={() => handleSelectAll(space.tempId)}
                                onDeselectAll={() => handleDeselectAll(space.tempId)}
                            />
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}
