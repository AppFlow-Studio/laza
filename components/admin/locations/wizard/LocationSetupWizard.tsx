"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import { useCreateLocation } from '@/lib/hooks/queries/useLocations';
import { useCreateStorageSpace, useBulkAssignItems } from '@/lib/hooks/queries/useStorageSetup';
import WizardSidebar from './WizardSidebar';
import LocationDetailsStep from './steps/LocationDetailsStep';
import type { LocationFormData } from './steps/LocationDetailsStep';
import StorageSpacesStep from './steps/StorageSpacesStep';
import type { WizardStorageSpace } from './steps/StorageSpacesStep';
import AssignItemsStep from './steps/AssignItemsStep';
import type { ItemAssignmentData } from './steps/AssignItemsStep';
import ReviewStep from './steps/ReviewStep';

const TOTAL_STEPS = 4;

export default function LocationSetupWizard() {
    const router = useRouter();
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;

    const createLocationMutation = useCreateLocation();
    const createStorageSpaceMutation = useCreateStorageSpace();
    const bulkAssignMutation = useBulkAssignItems();

    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [locationData, setLocationData] = useState<LocationFormData | null>(null);
    const [storageSpaces, setStorageSpaces] = useState<WizardStorageSpace[]>([]);
    const [itemAssignments, setItemAssignments] = useState<Record<string, ItemAssignmentData>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Direction for animation
    const [direction, setDirection] = useState(1);

    const markCompleted = useCallback((step: number) => {
        setCompletedSteps(prev => new Set([...prev, step]));
    }, []);

    const goToStep = useCallback((step: number) => {
        setDirection(step > currentStep ? 1 : -1);
        setCurrentStep(step);
    }, [currentStep]);

    // Step 1: Location details
    const handleLocationSubmit = (data: LocationFormData) => {
        setLocationData(data);
        markCompleted(1);
        goToStep(2);
    };

    // Step 2: Storage spaces
    const handleAddStorageSpace = (space: WizardStorageSpace) => {
        setStorageSpaces(prev => [...prev, space]);
    };

    const handleRemoveStorageSpace = (tempId: string) => {
        setStorageSpaces(prev => prev.filter(s => s.tempId !== tempId));
        // Clean up item assignments for removed space
        setItemAssignments(prev => {
            const next = { ...prev };
            delete next[tempId];
            return next;
        });
    };

    // Step 3: Assign items
    const handleAssignmentChange = (tempId: string, data: ItemAssignmentData) => {
        setItemAssignments(prev => ({ ...prev, [tempId]: data }));
    };

    // Navigation
    const handleNext = () => {
        if (currentStep === 1) {
            // Trigger form submit via form id
            const form = document.getElementById('location-details-form') as HTMLFormElement;
            form?.requestSubmit();
            return;
        }

        if (currentStep === 2) {
            if (storageSpaces.length === 0) {
                toast.error('Add at least one storage space to continue');
                return;
            }
            markCompleted(2);
            goToStep(3);
            return;
        }

        if (currentStep === 3) {
            // Step 3 is optional, always allow proceeding
            markCompleted(3);
            goToStep(4);
            return;
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            goToStep(currentStep - 1);
        }
    };

    const handleStepClick = (step: number) => {
        goToStep(step);
    };

    // Final submission
    const handleSubmit = async () => {
        if (!locationData || !organizationId) return;
        setIsSubmitting(true);

        try {
            // 1. Create location
            const location = await createLocationMutation.mutateAsync({
                organization_id: organizationId,
                name: locationData.name,
                address: locationData.address,
                is_active: locationData.is_active,
                latitude: locationData.latitude ?? null,
                longitude: locationData.longitude ?? null,
            });

            // 2. Create all storage spaces in parallel
            const storageSpaceResults = await Promise.all(
                storageSpaces.map(space =>
                    createStorageSpaceMutation.mutateAsync({
                        location_id: location.id,
                        name: space.name,
                        temperature_type: space.temperature_type,
                    })
                )
            );

            // Build tempId → real ID mapping
            const idMap = new Map<string, string>();
            storageSpaces.forEach((space, i) => {
                idMap.set(space.tempId, storageSpaceResults[i].id);
            });

            // 3. Bulk assign items per storage space in parallel
            const assignmentPromises: Promise<any>[] = [];
            for (const [tempId, assignment] of Object.entries(itemAssignments)) {
                if (assignment.selectedItems.size === 0) continue;
                const realId = idMap.get(tempId);
                if (!realId) continue;

                const items = Array.from(assignment.selectedItems).map(itemId => ({
                    itemId,
                    quantity: assignment.itemQuantities[itemId] || 0,
                    minQuantityOverride: assignment.itemMinQuantityOverrides[itemId] ?? null,
                }));

                assignmentPromises.push(
                    bulkAssignMutation.mutateAsync({
                        locationId: location.id,
                        storageSpaceId: realId,
                        items,
                    })
                );
            }

            if (assignmentPromises.length > 0) {
                await Promise.all(assignmentPromises);
            }

            toast.success('Location created successfully!');
            router.push(`/admin/locations/${location.id}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to create location');
        } finally {
            setIsSubmitting(false);
        }
    };

    const stepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Location Details</h2>
                        <p className="text-sm text-zinc-500 mb-6">Enter the name and address for your new location.</p>
                        <LocationDetailsStep
                            defaultValues={locationData}
                            onSubmit={handleLocationSubmit}
                        />
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Storage Spaces</h2>
                        <p className="text-sm text-zinc-500 mb-6">Add the storage areas for this location (freezers, refrigerators, dry storage).</p>
                        <StorageSpacesStep
                            storageSpaces={storageSpaces}
                            onAdd={handleAddStorageSpace}
                            onRemove={handleRemoveStorageSpace}
                        />
                    </div>
                );
            case 3:
                return (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Assign Items</h2>
                        <AssignItemsStep
                            storageSpaces={storageSpaces}
                            itemAssignments={itemAssignments}
                            onAssignmentChange={handleAssignmentChange}
                        />
                    </div>
                );
            case 4:
                return locationData ? (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Review & Create</h2>
                        <p className="text-sm text-zinc-500 mb-6">Review your setup before creating the location.</p>
                        <ReviewStep
                            locationData={locationData}
                            storageSpaces={storageSpaces}
                            itemAssignments={itemAssignments}
                            onEditStep={goToStep}
                        />
                    </div>
                ) : null;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-[calc(100vh-8rem)]  flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.push('/admin/locations')}
                    className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Locations
                </button>
                <h1 className="text-2xl font-semibold text-zinc-900">New Location</h1>
                <p className="text-sm text-zinc-600 mt-1">Set up a new cafe location with storage and inventory.</p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-600">Step {currentStep} of {TOTAL_STEPS}</span>
                </div>
                <div className="w-full bg-zinc-200 rounded-full h-2">
                    <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                    />
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex gap-8">
                {/* Sidebar (hidden on mobile) */}
                <div className="hidden lg:block w-56 flex-shrink-0">
                    <div className="sticky top-6">
                        <WizardSidebar
                            currentStep={currentStep}
                            completedSteps={completedSteps}
                            onStepClick={handleStepClick}
                        />
                    </div>
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white border border-zinc-200 rounded-xl p-6">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: direction * 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: direction * -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {stepContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Footer navigation */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-200">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={currentStep === 1 || isSubmitting}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>

                        {currentStep < TOTAL_STEPS ? (
                            <Button className='bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]' onClick={handleNext} disabled={isSubmitting}>
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                className='bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]'
                                disabled={isSubmitting || !locationData}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Location'
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
