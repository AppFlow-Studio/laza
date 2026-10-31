"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ItemAssignmentStep from '@/components/admin/locations/ItemAssignmentStep';
import { Snowflake, Thermometer, Sun, AlertTriangle } from 'lucide-react';
import type { WizardStorageSpace } from './StorageSpacesStep';

export type ItemAssignmentData = {
    selectedItems: Set<string>;
    itemQuantities: Record<string, number>;
    itemMinQuantityOverrides: Record<string, number | null>;
};

export type MissingAssignmentItem = { id: string; name: string };

interface AssignItemsStepProps {
    storageSpaces: WizardStorageSpace[];
    itemAssignments: Record<string, ItemAssignmentData>;
    onAssignmentChange: (tempId: string, data: ItemAssignmentData) => void;
    /** Catalog items that haven't been assigned to any storage space yet. */
    missingItems?: MissingAssignmentItem[];
    /** Total catalog item count, for the progress label. */
    totalItemCount?: number;
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
    missingItems,
    totalItemCount,
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

    const totalAssigned = totalItemCount != null && missingItems
        ? totalItemCount - missingItems.length
        : null;
    const hasMissing = (missingItems?.length ?? 0) > 0;

    return (
        <div className="space-y-4">
            <p className="text-sm text-zinc-500">
                Every catalog item must be assigned to at least one storage space. The same item can live in more than one space if needed.
            </p>

            {missingItems && totalItemCount != null && (
                <div
                    className={
                        hasMissing
                            ? "rounded-lg border border-amber-200 bg-amber-50 p-3"
                            : "rounded-lg border border-green-200 bg-green-50 p-3"
                    }
                >
                    <div className="flex items-start gap-2">
                        <AlertTriangle
                            className={
                                hasMissing
                                    ? "w-4 h-4 text-amber-600 mt-0.5 shrink-0"
                                    : "w-4 h-4 text-green-600 mt-0.5 shrink-0"
                            }
                        />
                        <div className="min-w-0 flex-1">
                            <p
                                className={
                                    hasMissing
                                        ? "text-sm font-semibold text-amber-900"
                                        : "text-sm font-semibold text-green-800"
                                }
                            >
                                {hasMissing
                                    ? `${missingItems.length} of ${totalItemCount} item${totalItemCount === 1 ? "" : "s"} not yet assigned`
                                    : `All ${totalItemCount} item${totalItemCount === 1 ? "" : "s"} assigned`}
                            </p>
                            {hasMissing && (
                                <>
                                    <p className="text-xs text-amber-800 mt-0.5">
                                        Assigned: {totalAssigned} / {totalItemCount}. Add the items below to any storage space before continuing.
                                    </p>
                                    <ul className="mt-2 flex flex-wrap gap-1">
                                        {missingItems.slice(0, 30).map((it) => (
                                            <li
                                                key={it.id}
                                                className="px-2 py-0.5 rounded-full bg-white border border-amber-200 text-[11px] text-amber-900"
                                            >
                                                {it.name}
                                            </li>
                                        ))}
                                        {missingItems.length > 30 && (
                                            <li className="px-2 py-0.5 text-[11px] text-amber-700">
                                                +{missingItems.length - 30} more
                                            </li>
                                        )}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
