"use client";

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import { useCreateStoreWithSetup } from '@/lib/hooks/queries/useStorageSetup';
import { useCreateInvitation } from '@/lib/hooks/queries/useUsers';
import { useItems } from '@/lib/hooks/queries/useItems';
import { getAllItems } from '@/lib/supabase/queries/items';
import { getStoreTemplate } from '@/lib/supabase/queries/storeSetup';
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

export type InviteStatus = 'idle' | 'sending' | 'sent' | 'failed';

export default function StoreSetupWizard() {
    const router = useRouter();
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    const userId = userInfo?.id;

    const createStoreMutation         = useCreateStoreWithSetup();
    const createInvitationMutation    = useCreateInvitation();
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

    // Which source the current layout was cloned from ("<locationId>:<withItems>"),
    // so revisiting step 1 doesn't wipe edits unless the clone choice changed.
    const [clonedKey,         setClonedKey]         = useState<string | null>(null);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

    // ── Invite state (separate from store creation) ───────────────────────────
    const [inviteStatus, setInviteStatus] = useState<InviteStatus>('idle');
    const [inviteError,  setInviteError]  = useState<string | null>(null);

    // ── Catalog vs assignments — every item must be in at least one space ───
    const missingItems = useMemo(() => {
        if (!items) return [];
        // selectedItems is typed as Set<string> but runtime values may be numbers
        // (item.id is a bigint). Normalize both sides to string before comparing.
        const assignedIds = new Set<string>();
        for (const a of Object.values(itemAssignments)) {
            for (const id of a.selectedItems) assignedIds.add(String(id));
        }
        return items
            .filter((it) => !assignedIds.has(String(it.id)))
            .map((it) => ({
                id:   String(it.id),
                name: (it as any).short_label ?? it.name ?? `Item #${it.id}`,
            }));
    }, [items, itemAssignments]);

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
    const applyCloneSource = async (sourceId: string, withItems: boolean) => {
        const template = await getStoreTemplate(sourceId);

        // Selection sets must hold the catalog's own id values (numbers at
        // runtime) or the item picker won't show them as selected.
        const catalog = items ?? (organizationId ? await getAllItems(organizationId) : []);
        const catalogIds = new Map(catalog.map((it) => [String(it.id), it.id as unknown as string]));

        const spaces: WizardStorageSpace[] = [];
        const assignments: Record<string, ItemAssignmentData> = {};

        for (const space of template) {
            const tempId = crypto.randomUUID();
            spaces.push({ tempId, name: space.name, temperature_type: space.temperature_type });
            if (!withItems) continue;

            const selected   = new Set<string>();
            const quantities: Record<string, number> = {};
            const overrides:  Record<string, number | null> = {};
            for (const item of space.items) {
                const id = catalogIds.get(item.itemId);
                if (id === undefined) continue; // item no longer in the catalog
                selected.add(id);
                quantities[id] = 0;
                overrides[id]  = item.minQuantityOverride;
            }
            assignments[tempId] = {
                selectedItems:            selected,
                itemQuantities:           quantities,
                itemMinQuantityOverrides: overrides,
            };
        }

        setStorageSpaces(spaces);
        setItemAssignments(assignments);
        return template.length;
    };

    const handleStoreSubmit = async (data: StoreFormData) => {
        const withItems = data.clone_items !== false;
        const nextCloneKey = data.clone_from_id ? `${data.clone_from_id}:${withItems}` : null;

        if (nextCloneKey && nextCloneKey !== clonedKey) {
            setIsLoadingTemplate(true);
            try {
                const copied = await applyCloneSource(data.clone_from_id!, withItems);
                if (copied === 0) toast('That store has no storage spaces to copy.');
            } catch (error) {
                console.error('Failed to load store layout', error);
                toast.error("Couldn't load the layout from that store. Try again, or start fresh.");
                return;
            } finally {
                setIsLoadingTemplate(false);
            }
        }
        setClonedKey(nextCloneKey);

        setStoreData(data);
        markCompleted(1);
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
            if (itemsLoading) {
                toast.error('Catalog still loading — please wait.');
                return;
            }
            if (missingItems.length > 0) {
                toast.error(
                    `${missingItems.length} item${missingItems.length === 1 ? "" : "s"} not yet assigned to any storage space. Assign all items before continuing.`,
                );
                return;
            }
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

    // ── Store creation (no invitation here) ───────────────────────────────────
    const handleSubmit = async () => {
        if (!storeData) return;
        if (!organizationId || !userId) {
            toast.error('Your account is still loading — wait a moment and try again.');
            return;
        }
        setIsSubmitting(true);

        try {
            const result = await createStoreMutation.mutateAsync({
                organizationId,
                store: {
                    name:      storeData.name,
                    address:   storeData.address,
                    is_active: storeData.is_active,
                    latitude:  storeData.latitude ?? null,
                    longitude: storeData.longitude ?? null,
                },
                storageSpaces: storageSpaces.map(space => {
                    const assignment = itemAssignments[space.tempId];
                    return {
                        name:             space.name,
                        temperature_type: space.temperature_type,
                        items: assignment
                            ? Array.from(assignment.selectedItems).map(itemId => ({
                                itemId:              String(itemId),
                                quantity:            assignment.itemQuantities[itemId] || 0,
                                minQuantityOverride: assignment.itemMinQuantityOverrides[itemId] ?? null,
                            }))
                            : [],
                    };
                }),
                defaultStorageItemIds: (items ?? []).map(item => String(item.id)),
            });

            if (!result.ok) {
                toast.error(result.error, { duration: 10000 });
                return;
            }

            setCreatedLocationId(result.locationId);
            toast.success('Store created successfully!');
        } catch (error: any) {
            // Only reached if the request itself failed (network, deploy mismatch)
            console.error('Store creation request failed', error);
            toast.error('Could not reach the server to create the store. Check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Invitation (separate action, mirrors InviteUserWizard exactly) ────────
    const handleSendInvite = async () => {
        if (!inviteData?.email || !organizationId || !createdLocationId) return;
        setInviteStatus('sending');
        setInviteError(null);

        try {
            const result = await createInvitationMutation.mutateAsync({
                organizationId,
                email:                 inviteData.email,
                role:                  'admin',
                assigned_location_id:  createdLocationId,
                assigned_location_ids: [createdLocationId],
            });

            if (result.success) {
                toast.success(result.message);
                setInviteStatus('sent');
            } else {
                toast.error(result.message);
                setInviteStatus('failed');
                setInviteError(result.message);
            }
        } catch (error: any) {
            const msg = error.message || 'Failed to send invitation';
            toast.error(msg);
            setInviteStatus('failed');
            setInviteError(msg);
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
                                    {storeData.clone_items !== false && ' Items are pre-assigned on the next step.'}
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
                        <p className="text-sm text-zinc-500 mb-6">Assign every catalog item to at least one storage space and set initial quantities.</p>
                        <AssignItemsStep
                            storageSpaces={storageSpaces}
                            itemAssignments={itemAssignments}
                            onAssignmentChange={handleAssignmentChange}
                            missingItems={missingItems}
                            totalItemCount={items?.length ?? 0}
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
                            inviteStatus={inviteStatus}
                            inviteError={inviteError}
                            onEditStep={goToStep}
                            onSendInvite={handleSendInvite}
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
                                    <Button onClick={handleNext} disabled={isSubmitting || isLoadingTemplate}>
                                        {isLoadingTemplate ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Copying layout…
                                            </>
                                        ) : (
                                            <>
                                                Next <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
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
