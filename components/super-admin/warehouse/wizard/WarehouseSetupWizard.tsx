"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { useCreateLocation } from "@/lib/hooks/queries/useLocations";
import WarehouseWizardSidebar from "./WarehouseWizardSidebar";
import WarehouseDetailsStep from "./steps/WarehouseDetailsStep";
import type { WarehouseFormData } from "./steps/WarehouseDetailsStep";
import WarehouseConfirmationStep from "./steps/WarehouseConfirmationStep";

const TOTAL_STEPS = 2;

export default function WarehouseSetupWizard() {
    const router      = useRouter();
    const queryClient = useQueryClient();

    const { data: userInfo }     = useUserInfo();
    const organizationId         = userInfo?.members?.organization_id;
    const createLocationMutation = useCreateLocation();

    const [currentStep,    setCurrentStep]    = useState(1);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [direction,      setDirection]      = useState(1);
    const [warehouseData,  setWarehouseData]  = useState<WarehouseFormData | null>(null);
    const [isSubmitting,   setIsSubmitting]   = useState(false);
    const [createdLocationId, setCreatedLocationId] = useState<string | null>(null);

    const markCompleted = useCallback((step: number) => {
        setCompletedSteps(prev => new Set([...prev, step]));
    }, []);

    const goToStep = useCallback((step: number) => {
        setCurrentStep(prev => {
            setDirection(step > prev ? 1 : -1);
            return step;
        });
    }, []);

    // Step 1 form submit
    const handleDetailsSubmit = (data: WarehouseFormData) => {
        setWarehouseData(data);
        markCompleted(1);
        goToStep(2);
    };

    // Footer Next / Back
    const handleNext = () => {
        if (currentStep === 1) {
            const form = document.getElementById("warehouse-details-form") as HTMLFormElement;
            form?.requestSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) goToStep(currentStep - 1);
    };

    // Final create
    const handleSubmit = async () => {
        if (!warehouseData || !organizationId) return;
        setIsSubmitting(true);
        try {
            const location = await createLocationMutation.mutateAsync({
                organization_id: organizationId,
                name:            warehouseData.name,
                address:         warehouseData.address,
                is_active:       warehouseData.is_active,
                latitude:        warehouseData.latitude ?? null,
                longitude:       warehouseData.longitude ?? null,
                location_type:   "warehouse",
            });
            queryClient.invalidateQueries({ queryKey: ["warehouses"] });
            queryClient.invalidateQueries({ queryKey: ["warehouse-location"] });
            setCreatedLocationId(location.id);
            toast.success("Warehouse created successfully!");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to create warehouse";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const stepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Warehouse Details</h2>
                        <p className="text-sm text-zinc-500 mb-6">Enter the name, address, and location for this warehouse.</p>
                        <WarehouseDetailsStep defaultValues={warehouseData} onSubmit={handleDetailsSubmit} />
                    </div>
                );
            case 2:
                return warehouseData ? (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">
                            {createdLocationId ? "Done!" : "Review & Create"}
                        </h2>
                        {!createdLocationId && (
                            <p className="text-sm text-zinc-500 mb-6">Review your setup before creating the warehouse.</p>
                        )}
                        <WarehouseConfirmationStep
                            warehouseData={warehouseData}
                            createdLocationId={createdLocationId}
                            onEditStep={goToStep}
                        />
                    </div>
                ) : null;
            default:
                return null;
        }
    };

    const showFooterNext   = currentStep === 1;
    const showFooterSubmit = currentStep === TOTAL_STEPS && !createdLocationId;

    return (
        <div className="min-h-[calc(100vh-8rem)] flex flex-col">
            {/* Header */}
            <div className="mb-6">
                <button
                    type="button"
                    onClick={() => router.push("/super-admin/warehouse")}
                    className="text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-1 mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Warehouses
                </button>
                <h1 className="text-2xl font-semibold text-zinc-900">New Warehouse</h1>
                <p className="text-sm text-zinc-600 mt-1">Set up a new warehouse location for inventory storage.</p>
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
                        <WarehouseWizardSidebar
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
                            {currentStep > 1 ? (
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                            ) : <div />}

                            <div className="flex gap-2">
                                {showFooterNext && (
                                    <Button onClick={handleNext} disabled={isSubmitting}>
                                        Next <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                )}
                                {showFooterSubmit && (
                                    <Button onClick={handleSubmit} disabled={isSubmitting || !warehouseData || !organizationId}>
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Creating…
                                            </>
                                        ) : (
                                            "Create Warehouse"
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
