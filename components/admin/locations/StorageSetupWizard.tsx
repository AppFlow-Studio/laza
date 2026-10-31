"use client";

import { useState } from 'react';
import { useCreateStorageSpace, useBulkAssignItems } from '@/lib/hooks/queries/useStorageSetup';
import { useUpdateStorageSpace } from '@/lib/hooks/queries/useStorageSpace';
import StorageSpaceFormStep from './StorageSpaceFormStep';
import ItemAssignmentStep from './ItemAssignmentStep';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { StorageSpace } from '@/lib/supabase/types';

interface StorageSetupWizardProps {
    locationId: string;
    onComplete: () => void;
    onClose: () => void;
}

type Step = 1 | 2;

export default function StorageSetupWizard({ locationId, onComplete, onClose }: StorageSetupWizardProps) {
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [createdStorageSpace, setCreatedStorageSpace] = useState<StorageSpace | null>(null);
    const [formData, setFormData] = useState<{ name: string; temperature_type: 'frozen' | 'refrigerated' | 'dry' } | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
    const [itemMinQuantityOverrides, setItemMinQuantityOverrides] = useState<Record<string, number | null>>({});

    const createStorageSpaceMutation = useCreateStorageSpace();
    const updateStorageSpaceMutation = useUpdateStorageSpace();
    const bulkAssignMutation = useBulkAssignItems();

    const handleStorageSpaceSubmit = async (data: { name: string; temperature_type: 'frozen' | 'refrigerated' | 'dry' }) => {
        try {
            setFormData(data);
            if (createdStorageSpace) {
                // Already created — just update if changed, then proceed
                await updateStorageSpaceMutation.mutateAsync({
                    id: createdStorageSpace.id,
                    updates: data,
                });
                setCreatedStorageSpace({ ...createdStorageSpace, ...data });
            } else {
                const storageSpace = await createStorageSpaceMutation.mutateAsync({
                    location_id: locationId,
                    ...data,
                });
                setCreatedStorageSpace(storageSpace);
                toast.success('Storage space created successfully');
            }
            setCurrentStep(2);
        } catch (error: any) {
            toast.error(error.message || 'Failed to create storage space');
        }
    };

    const handleItemToggle = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
            const newQuantities = { ...itemQuantities };
            const newOverrides = { ...itemMinQuantityOverrides };
            delete newQuantities[itemId];
            delete newOverrides[itemId];
            setItemQuantities(newQuantities);
            setItemMinQuantityOverrides(newOverrides);
        } else {
            newSelected.add(itemId);
            setItemQuantities({ ...itemQuantities, [itemId]: 0 });
            setItemMinQuantityOverrides({ ...itemMinQuantityOverrides, [itemId]: null });
        }
        setSelectedItems(newSelected);
    };

    const handleBulkToggle = (itemIds: string[], shouldSelect: boolean) => {
        const newSelected = new Set(selectedItems);
        const newQuantities = { ...itemQuantities };
        const newOverrides = { ...itemMinQuantityOverrides };

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

        setSelectedItems(newSelected);
        setItemQuantities(newQuantities);
        setItemMinQuantityOverrides(newOverrides);
    };

    const handleQuantityChange = (itemId: string, quantity: number) => {
        setItemQuantities({ ...itemQuantities, [itemId]: quantity });
    };

    const handleSelectAll = () => {
        // This will be handled by ItemAssignmentStep for filtered items
    };

    const handleDeselectAll = () => {
        setSelectedItems(new Set());
        setItemQuantities({});
        setItemMinQuantityOverrides({});
    };

    const handleAssignItems = async () => {
        if (selectedItems.size === 0) {
            toast.error('Please select at least one item');
            return;
        }

        if (!createdStorageSpace) {
            toast.error('Storage space not found');
            return;
        }

        // Validate quantities
        const itemsToAssign = Array.from(selectedItems).map(itemId => ({
            itemId,
            quantity: itemQuantities[itemId] || 0,
            minQuantityOverride: itemMinQuantityOverrides[itemId] ?? null,
        }));

        const invalidItems = itemsToAssign.filter(item => item.quantity < 0);
        if (invalidItems.length > 0) {
            toast.error('Please enter valid quantities (0 or greater)');
            return;
        }

        try {
            await bulkAssignMutation.mutateAsync({
                locationId,
                storageSpaceId: createdStorageSpace.id,
                items: itemsToAssign,
            });
            toast.success(`Successfully assigned ${selectedItems.size} item(s) to storage space`);

            // Reset for next storage space or finish
            setSelectedItems(new Set());
            setItemQuantities({});
            setCreatedStorageSpace(null);
            setCurrentStep(1);

            onComplete();
        } catch (error: any) {
            toast.error(error.message || 'Failed to assign items');
        }
    };

    const handleAddAnother = () => {
        setSelectedItems(new Set());
        setItemQuantities({});
        setCreatedStorageSpace(null);
        setCurrentStep(1);
    };

    const isLoading = createStorageSpaceMutation.isPending || updateStorageSpaceMutation.isPending || bulkAssignMutation.isPending;

    return (
        <div className="flex flex-col h-full">
            {/* Progress Indicator */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-600">
                        Step {currentStep} of 2
                    </span>
                    {currentStep === 2 && (
                        <button
                            onClick={() => setCurrentStep(1)}
                            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                    )}
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                    <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentStep / 2) * 100}%` }}
                    />
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto">
                {currentStep === 1 && (
                    <div className='border border-zinc-200 rounded-lg p-2'>
                        <h3 className="text-lg font-semibold text-zinc-900 mb-2">Create Storage Space</h3>
                        <p className="text-sm text-zinc-600 mb-6">
                            Set up a new storage space for this location. You'll assign items to it in the next step.
                        </p>
                        <StorageSpaceFormStep
                            onSubmit={handleStorageSpaceSubmit}
                            isLoading={isLoading}
                            defaultValues={formData ?? undefined}
                        />
                    </div>
                )}

                {currentStep === 2 && createdStorageSpace && (
                    <div>
                        <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-lg font-semibold text-zinc-900">Assign Items</h3>
                            </div>
                            <p className="text-sm text-zinc-600">
                                Storage space <span className="font-semibold">{createdStorageSpace.name}</span> created.
                                Now select items from your catalog and set initial quantities.
                            </p>
                        </div>
                        <ItemAssignmentStep
                            locationId={locationId}
                            selectedItems={selectedItems}
                            itemQuantities={itemQuantities}
                            itemMinQuantityOverrides={itemMinQuantityOverrides}
                            onItemToggle={handleItemToggle}
                            onBulkToggle={handleBulkToggle}
                            onQuantityChange={handleQuantityChange}
                            onMinQuantityOverrideChange={(itemId, override) => {
                                setItemMinQuantityOverrides({ ...itemMinQuantityOverrides, [itemId]: override });
                            }}
                            onSelectAll={handleSelectAll}
                            onDeselectAll={handleDeselectAll}
                            isLoading={isLoading}
                        />
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            {currentStep === 2 && (
                <div className="mt-6 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row gap-2">
                    {/* <Button
                        variant="outline"
                        onClick={handleAddAnother}
                        className="flex-1"
                        disabled={isLoading}
                    >
                        Add Another Storage Space
                    </Button> */}
                    <Button
                        onClick={handleAssignItems}
                        className="flex-1"
                        disabled={isLoading || selectedItems.size === 0}
                    >
                        {isLoading ? 'Assigning...' : `Assign ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''}`}
                    </Button>
                </div>
            )}
        </div>
    );
}

