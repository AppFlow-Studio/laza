"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useConfirmPOReceipt, useAssignShipmentToPallets } from "@/lib/hooks/queries/useReceiving";
import { PhaseAStep, type PhaseAData } from "./PhaseAStep";
import { PhaseBStep, type PhaseBData } from "./PhaseBStep";

type POForReceiving = {
    id: string;
    po_number: string;
    supplier_name: string | null;
    organization_id: string;
    expected_arrival: string | null;
    purchase_order_items: {
        id: string;
        item_id: number;
        quantity_ordered: number;
        quantity_received: number | null;
        pieces_per_box: number;
        unit_cost_after: number | null;
        cbm: number | null;
        cartons: number | null;
        items: {
            id: number;
            name: string;
            short_label: string | null;
            sku: string | null;
            box_quantity: number | null;
        } | null;
    }[];
};

interface ReceivingWizardProps {
    po: POForReceiving;
    warehouseLocationId: string;
    organizationId: string;
    onComplete: () => void;
    onCancel: () => void;
}

const STEPS = [
    { num: 1, label: "Confirm Receipt" },
    { num: 2, label: "Assign to Pallets" },
];

export function ReceivingWizard({
                                    po,
                                    warehouseLocationId,
                                    organizationId,
                                    onComplete,
                                    onCancel,
                                }: ReceivingWizardProps) {
    const [currentStep, setCurrentStep]           = useState(1);
    const [direction, setDirection]               = useState(1);
    const [phaseAData, setPhaseAData]             = useState<PhaseAData | null>(null);
    const [phaseADone, setPhaseADone]             = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    const confirmReceipt  = useConfirmPOReceipt();
    const assignToPallets = useAssignShipmentToPallets();

    const goTo = useCallback(
        (step: number) => {
            setDirection(step > currentStep ? 1 : -1);
            setCurrentStep(step);
        },
        [currentStep]
    );

    // ── Phase A submitted ──────────────────────────────────────────────────
    const handlePhaseASubmit = async (data: PhaseAData) => {
        setPhaseAData(data);
        try {
            await confirmReceipt.mutateAsync({
                purchaseOrderId:   po.id,
                receivedItems:     data.lineItems.map((li) => ({
                    item_id:           li.item_id,
                    quantity_received: li.quantity_received,
                })),
                actualArrivalDate: data.actualArrivalDate,
            });
            setPhaseADone(true);
            toast.success("Warehouse stock updated. Now assign items to pallets.");
            goTo(2);
        } catch (err: any) {
            toast.error(err.message ?? "Failed to confirm receipt. Please try again.");
        }
    };

    // ── Phase B submitted ──────────────────────────────────────────────────
    const handlePhaseBSubmit = async (data: PhaseBData) => {
        try {
            await assignToPallets.mutateAsync({
                purchaseOrderId:    po.id,
                organizationId,
                warehouseLocationId,
                // Map the new box_configs shape to what the RPC expects
                palletAssignments: data.pallets.map((p) => ({
                    pallet_label:     p.pallet_label,
                    storage_space_id: p.storage_space_id,
                    items: p.items.map((it) => ({
                        item_id:               it.item_id,
                        purchase_order_item_id: it.purchase_order_item_id,
                        // Pass the full box_configs array (D4 RPC format)
                        box_configs: it.box_configs.map((c) => ({
                            pieces_per_box: c.pieces_per_box,
                            box_count:      c.box_count,
                        })),
                    })),
                })),
            });
            toast.success(
                `Shipment received. ${data.pallets.length} pallet${data.pallets.length !== 1 ? "s" : ""} created.`
            );
            onComplete();
        } catch (err: any) {
            toast.error(err.message ?? "Failed to create pallets. Please try again.");
        }
    };

    // ── Phase B skipped ────────────────────────────────────────────────────
    const handlePhaseBSkip = () => {
        toast.success(
            "Shipment received. You can assign pallets later from the Pallets page."
        );
        onComplete();
    };

    // ── Cancel guard ──────────────────────────────────────────────────────
    const handleCancelClick = () => {
        if (phaseADone) {
            setShowCancelDialog(true);
        } else {
            onCancel();
        }
    };

    const isPhaseALoading = confirmReceipt.isPending;
    const isPhaseBLoading = assignToPallets.isPending;

    return (
        <div className="flex flex-col h-full max-h-[90vh]">
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 flex-shrink-0">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900">
                        Receiving Shipment
                    </h1>
                    <p className="mt-0.5 text-sm text-zinc-500">
                        {po.po_number}
                        {po.supplier_name ? ` · ${po.supplier_name}` : ""}
                        {" · "}Step {currentStep} of {STEPS.length}
                    </p>
                </div>
                <button
                    onClick={handleCancelClick}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    aria-label="Cancel"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* ── Progress bar ── */}
            <div className="px-6 pt-4 flex-shrink-0">
                <div className="flex gap-1.5">
                    {STEPS.map((s) => (
                        <div key={s.num} className="flex-1">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                    currentStep >= s.num
                                        ? "bg-indigo-600"
                                        : "bg-zinc-100"
                                }`}
                            />
                            <p
                                className={`mt-1.5 text-xs font-medium ${
                                    currentStep === s.num
                                        ? "text-indigo-600"
                                        : currentStep > s.num
                                            ? "text-zinc-400"
                                            : "text-zinc-300"
                                }`}
                            >
                                Step {s.num}: {s.label}
                                {s.num === 1 && phaseADone && (
                                    <span className="ml-1 text-green-500">✓</span>
                                )}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Step Content ── */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: direction * 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: direction * -24 }}
                        transition={{ duration: 0.18 }}
                    >
                        {currentStep === 1 && (
                            <PhaseAStep
                                po={po}
                                onSubmit={handlePhaseASubmit}
                                isLoading={isPhaseALoading}
                            />
                        )}
                        {currentStep === 2 && phaseAData && (
                            <PhaseBStep
                                po={po}
                                phaseAData={phaseAData}
                                warehouseLocationId={warehouseLocationId}
                                organizationId={organizationId}
                                onSubmit={handlePhaseBSubmit}
                                onSkip={handlePhaseBSkip}
                                isLoading={isPhaseBLoading}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 px-6 py-4 flex-shrink-0">
                <Button
                    variant="outline"
                    onClick={() =>
                        currentStep > 1
                            ? goTo(currentStep - 1)
                            : handleCancelClick()
                    }
                    disabled={
                        isPhaseALoading ||
                        isPhaseBLoading ||
                        (phaseADone && currentStep === 1)
                    }
                    size="sm"
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    {currentStep === 1 ? "Cancel" : "Back"}
                </Button>

                {currentStep === 1 && (
                    <Button
                        onClick={() =>
                            document
                                .getElementById("phase-a-form")
                                ?.dispatchEvent(
                                    new Event("submit", {
                                        cancelable: true,
                                        bubbles: true,
                                    })
                                )
                        }
                        disabled={isPhaseALoading}
                        size="sm"
                    >
                        {isPhaseALoading ? (
                            <>
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                Confirming…
                            </>
                        ) : (
                            <>
                                Confirm Receipt
                                <ArrowRight className="ml-1.5 h-4 w-4" />
                            </>
                        )}
                    </Button>
                )}

                {currentStep === 2 && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (
                                    confirm(
                                        "Skip pallet assignment? You can assign pallets later from the Pallets page. Warehouse stock has already been updated."
                                    )
                                ) {
                                    handlePhaseBSkip();
                                }
                            }}
                            disabled={isPhaseBLoading}
                            size="sm"
                        >
                            Skip for now
                        </Button>
                        <Button
                            onClick={() =>
                                document
                                    .getElementById("phase-b-form")
                                    ?.dispatchEvent(
                                        new Event("submit", {
                                            cancelable: true,
                                            bubbles: true,
                                        })
                                    )
                            }
                            disabled={isPhaseBLoading}
                            size="sm"
                        >
                            {isPhaseBLoading ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    Creating pallets…
                                </>
                            ) : (
                                "Complete Receiving"
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Cancel dialog (shown when Phase A already committed) ── */}
            {showCancelDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="rounded-full bg-amber-100 p-2">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <h2 className="text-base font-semibold text-zinc-900">
                                Warehouse stock already updated
                            </h2>
                        </div>
                        <p className="text-sm text-zinc-600">
                            Phase A (receipt confirmation) has already been committed —
                            warehouse quantities have been updated. Leaving now will skip
                            pallet assignment. You can assign pallets later from the Pallets
                            page.
                        </p>
                        <div className="mt-5 flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowCancelDialog(false)}
                            >
                                Stay
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => {
                                    setShowCancelDialog(false);
                                    onComplete();
                                }}
                            >
                                Leave anyway
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}