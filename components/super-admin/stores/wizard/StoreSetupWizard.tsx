"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import { useCreateLocation, useLocationWithDetails } from '@/lib/hooks/queries/useLocations';
import { useCreateStorageSpace, useBulkAssignItems } from '@/lib/hooks/queries/useStorageSetup';
import { useCreateInvitation } from '@/lib/hooks/queries/useUsers';
import { useItems } from '@/lib/hooks/queries/useItems';
import StoreWizardSidebar from './StoreWizardSidebar';
import StoreDetailsStep from './steps/StoreDetailsStep';
import type { StoreFormData } from './steps/StoreDetailsStep';
import StoreStorageSpacesStep from './steps/StoreStorageSpacesStep';
import type { WizardStorageSpace } from './steps/StoreStorageSpacesStep';
import AssignItemsStep from '@/components/admin/locations/wizard/steps/AssignItemsStep';
import type { ItemAssignmentData } from '@/components/admin/locations/wizard/steps/AssignItemsStep';
import InviteAdminStep from './steps/InviteAdminStep';
import type { InviteAdminFormData } from './steps/InviteAdminStep';
import ConfirmationStep from './steps/ConfirmationStep';

const TOTAL_STEPS = 5;

export default function StoreSetupWizard() {
    const router = useRouter();
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    const userId = userInfo?.id;

    const createLocationMutation      = useCreateLocation();
    const createStorageSpaceMutation  = useCreateStorageSpace();
    const bulkAssignMutation          = useBulkAssignItems();
    const createInvitationMutation    = useCreateInvitation();
    // Fetch org-wide catalog items to seed the Default Storage space
    const { data: items, isLoading: itemsLoading } = useItems();

    // ── Wizard state ─────────────────────────────────────────────────────────
    const [currentStep, setCurrentStep]       = useState(1);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [direction, setDirection]           = useState(1);

    const [storeData,       setStoreData]       = useState<StoreFormData | null>(null);
    const [storageSpaces,   setStorageSpaces]   = useState<WizardStorageSpace[]>([]);
    const [itemAssignments, setItemAssignments] = useState<Record<string, ItemAssignmentData>>({});
    const [inviteData,      setInviteData]      = useState<InviteAdminFormData | null>(null);
    const [inviteSkipped,   setInviteSkipped]   = useState(false);

    const [isSubmitting,      setIsSubmitting]      = useState(false);
    const [createdLocationId, setCreatedLocationId] = useState<string | null>(null);

    // ── Clone support ─────────────────────────────────────────────────────────
    const cloneSourceId = storeData?.clone_from_id ?? '';
    const { data: cloneSource } = useLocationWithDetails(cloneSourceId);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const markCompleted = useCallback((step: number) => {
        setCompletedSteps(prev => new Set([...prev, step]));
    }, []);

    const goToStep = useCallback((step: number) => {
        setDirection(step > currentStep ? 1 : -1);
        setCurrentStep(step);
    }, [currentStep]);

    // ── Step handlers ─────────────────────────────────────────────────────────

    // Step 1
    const handleStoreSubmit = (data: StoreFormData) => {
        setStoreData(data);
        markCompleted(1);

        if (data.clone_from_id && cloneSource?.storage_spaces?.length) {
            const cloned: WizardStorageSpace[] = cloneSource.storage_spaces.map((s: any) => ({
                tempId:           crypto.randomUUID(),
                name:             s.name,
                temperature_type: s.temperature_type as 'frozen' | 'refrigerated' | 'dry',
            }));
            setStorageSpaces(cloned);
        }

        goToStep(2);
    };

    // Step 2
    const handleAddStorageSpace    = (space: WizardStorageSpace) => setStorageSpaces(prev => [...prev, space]);
    const handleRemoveStorageSpace = (tempId: string) => {
        setStorageSpaces(prev => prev.filter(s => s.tempId !== tempId));
        setItemAssignments(prev => { const n = { ...prev }; delete n[tempId]; return n; });
    };

    // Step 3
    const handleAssignmentChange = (tempId: string, data: ItemAssignmentData) => {
        setItemAssignments(prev => ({ ...prev, [tempId]: data }));
    };

    // Step 4
    const handleInviteSubmit = (data: InviteAdminFormData) => {
        setInviteData(data);
        setInviteSkipped(false);
        markCompleted(4);
        goToStep(5);
    };

    const handleInviteSkip = () => {
        setInviteData(null);
        setInviteSkipped(true);
        markCompleted(4);
        goToStep(5);
    };

    // ── Navigation ────────────────────────────────────────────────────────────
    const handleNext = () => {
        if (currentStep === 1) {
            const form = document.getElementById('store-details-form') as HTMLFormElement;
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
            markCompleted(3);
            goToStep(4);
            return;
        }
        if (currentStep === 4) {
            const form = document.getElementById('invite-admin-form') as HTMLFormElement;
            form?.requestSubmit();
            return;
        }
    };

    const handleBack = () => {
        if (currentStep > 1) goToStep(currentStep - 1);
    };

    // ── Final submission ──────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!storeData || !organizationId || !userId) return;
        setIsSubmitting(true);

        try {
            // 1. Create the store location
            const location = await createLocationMutation.mutateAsync({
                organization_id: organizationId,
                name:            storeData.name,
                address:         storeData.address,
                is_active:       storeData.is_active,
                latitude:        storeData.latitude ?? null,
                longitude:       storeData.longitude ?? null,
            });

            // 2. Create storage spaces in parallel
            const storageResults = await Promise.all(
                storageSpaces.map(space =>
                    createStorageSpaceMutation.mutateAsync({
                        location_id:      location.id,
                        name:             space.name,
                        temperature_type: space.temperature_type,
                    })
                )
            );

            // tempId → real DB id map
            const idMap = new Map<string, string>();
            storageSpaces.forEach((space, i) => idMap.set(space.tempId, storageResults[i].id));

            // 3. Bulk assign items per storage space in parallel
            const assignPromises: Promise<any>[] = [];
            for (const [tempId, assignment] of Object.entries(itemAssignments)) {
                if (assignment.selectedItems.size === 0) continue;
                const realId = idMap.get(tempId);
                if (!realId) continue;

                const spaceItems = Array.from(assignment.selectedItems).map(itemId => ({
                    itemId,
                    quantity:            assignment.itemQuantities[itemId] || 0,
                    minQuantityOverride: assignment.itemMinQuantityOverrides[itemId] ?? null,
                }));

                assignPromises.push(
                    bulkAssignMutation.mutateAsync({
                        locationId:     location.id,
                        storageSpaceId: realId,
                        items:          spaceItems,
                    })
                );
            }
            if (assignPromises.length > 0) await Promise.all(assignPromises);

            // 4. Always create a Default Storage space; assign all catalog items if available (qty 0).
            const defaultNameTaken = storageSpaces.some(
                s => s.name.trim().toLowerCase() === 'default storage'
            );

            if (!defaultNameTaken) {
                const defaultSpace = await createStorageSpaceMutation.mutateAsync({
                    location_id:      location.id,
                    name:             'Default Storage',
                    temperature_type: 'refrigerated',
                });

                const allItems = (items ?? []).map(item => ({
                    itemId:              String(item.id),
                    quantity:            0,
                    minQuantityOverride: null,
                }));

                if (allItems.length > 0) {
                    await bulkAssignMutation.mutateAsync({
                        locationId:     location.id,
                        storageSpaceId: defaultSpace.id,
                        items:          allItems,
                    });
                }
            }

            // 5. Send admin invitation if not skipped
            if (inviteData?.email) {
                await createInvitationMutation.mutateAsync({
                    email:                 inviteData.email,
                    role:                  'admin',
                    organizationId,
                    assigned_location_id:  location.id,
                    assigned_location_ids: [location.id],
                });
            }

            setCreatedLocationId(location.id);
            toast.success('Store created successfully!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create store');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Step content ──────────────────────────────────────────────────────────
    const stepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Store Details</h2>
                        <p className="text-sm text-zinc-500 mb-6">Enter the name, address, and optionally clone the layout from an existing store.</p>
                        <StoreDetailsStep defaultValues={storeData} onSubmit={handleStoreSubmit} />
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Storage Spaces</h2>
                        <p className="text-sm text-zinc-500 mb-6">
                            Add the storage areas for this store.
                            {storeData?.clone_from_id && storageSpaces.length > 0 && (
                                <span className="ml-1 text-indigo-600 font-medium">
                                    Layout cloned from existing store — edit as needed.
                                </span>
                            )}
                        </p>
                        <StoreStorageSpacesStep
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
                        <p className="text-sm text-zinc-500 mb-6">Optionally assign catalog items and set initial quantities for each storage space.</p>
                        <AssignItemsStep
                            storageSpaces={storageSpaces}
                            itemAssignments={itemAssignments}
                            onAssignmentChange={handleAssignmentChange}
                        />
                    </div>
                );
            case 4:
                return (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Invite First Admin</h2>
                        <p className="text-sm text-zinc-500 mb-6">Invite the store manager who will oversee this location's inventory.</p>
                        <InviteAdminStep
                            defaultValues={inviteData}
                            onSubmit={handleInviteSubmit}
                            onSkip={handleInviteSkip}
                        />
                    </div>
                );
            case 5:
                return storeData ? (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                            {createdLocationId ? 'Done!' : 'Review & Create'}
                        </h2>
                        {!createdLocationId && (
                            <p className="text-sm text-zinc-500 mb-6">Review your setup before creating the store.</p>
                        )}
                        <ConfirmationStep
                            storeData={storeData}
                            storageSpaces={storageSpaces}
                            itemAssignments={itemAssignments}
                            inviteData={inviteData}
                            createdLocationId={createdLocationId}
                            onEditStep={goToStep}
                        />
                    </div>
                ) : null;
            default:
                return null;
        }
    };

    const showFooterNext   = currentStep < TOTAL_STEPS && currentStep !== 4;
    const showFooterSubmit = currentStep === TOTAL_STEPS && !createdLocationId;

    return (
        <div className="min-h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.push('/super-admin/stores')}
                    className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Stores
                </button>
                <h1 className="text-2xl font-semibold text-zinc-900">New Store</h1>
                <p className="text-sm text-zinc-600 mt-1">Set up a new cafe location with storage, inventory, and staff.</p>
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

            {/* Main layout */}
            <div className="flex-1 flex gap-8">
                {/* Sidebar — desktop only */}
                <div className="hidden lg:block w-56 flex-shrink-0">
                    <div className="sticky top-6">
                        <StoreWizardSidebar
                            currentStep={currentStep}
                            completedSteps={completedSteps}
                            onStepClick={goToStep}
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
                    {!createdLocationId && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-200">
                            <Button
                                variant="outline"
                                onClick={handleBack}
                                disabled={currentStep === 1 || isSubmitting}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>

                            <div className="flex gap-2">
                                {currentStep === 4 && (
                                    <p className="text-sm text-zinc-400 self-center mr-2">
                                        Use the form above to invite or skip
                                    </p>
                                )}

                                {showFooterNext && (
                                    <Button onClick={handleNext} disabled={isSubmitting}>
                                        Next <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                )}

                                {showFooterSubmit && (
                                    <Button onClick={handleSubmit} disabled={isSubmitting || !storeData || itemsLoading}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Creating…
                                            </>
                                        ) : (
                                            'Create Store'
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}