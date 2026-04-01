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
    actual_arrival: string | null;
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
    /**
     * Start at step 2 (pallet assignment) when the PO was already received
     * but pallets were never created. Wizard auto-reconstructs PhaseA data
     * from the PO's stored quantity_received values.
     */
    initialStep?: 1 | 2;
    onComplete: () => void;
    onCancel: () => void;
}

const STEPS = [
    { num: 1, label: "Confirm Receipt" },
    { num: 2, label: "Assign to Pallets" },
];

/** Rebuild PhaseA data from an already-received PO so Phase B can run standalone. */
function reconstructPhaseAData(po: POForReceiving): PhaseAData {
    const { format } = require("date-fns");
    return {
        actualArrivalDate: po.actual_arrival ?? format(new Date(), "yyyy-MM-dd"),
        notes: "",
        lineItems: po.purchase_order_items.map((item) => ({
            item_id:           item.item_id,
            po_item_id:        item.id,
            quantity_ordered:  item.quantity_ordered,
            pieces_per_box:    item.pieces_per_box,
            quantity_received: item.quantity_received ?? item.quantity_ordered,
        })),
    };
}

export function ReceivingWizard({
                                    po,
                                    warehouseLocationId,
                                    organizationId,
                                    initialStep = 1,
                                    onComplete,
                                    onCancel,
                                }: ReceivingWizardProps) {
    const [currentStep, setCurrentStep]           = useState(initialStep);
    const [direction, setDirection]               = useState(1);
    const [phaseAData, setPhaseAData]             = useState<PhaseAData | null>(
        // If starting at step 2, pre-populate from the PO's received quantities
        initialStep === 2 ? reconstructPhaseAData(po) : null
    );
    const [phaseADone, setPhaseADone]             = useState(initialStep === 2);
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
                palletAssignments: data.pallets.map((p) => ({
                    pallet_label: p.pallet_label,
                    items: p.items
                        .filter((it) =>
                            it.box_configs.some((c) => (c.box_count ?? 0) > 0)
                        )
                        .map((it) => ({
                            item_id:                it.item_id,
                            purchase_order_item_id: it.purchase_order_item_id,
                            box_configs: it.box_configs
                                .filter((c) => (c.box_count ?? 0) > 0)
                                .map((c) => ({
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
                        {initialStep === 2 ? "Assign to Pallets" : "Receiving Shipment"}
                    </h1>
                    <p className="mt-0.5 text-sm text-zinc-500">
                        {po.po_number}
                        {po.supplier_name ? ` · ${po.supplier_name}` : ""}
                        {initialStep === 1 && ` · Step ${currentStep} of ${STEPS.length}`}
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

            {/* ── Progress bar (only shown for full flow) ── */}
            {initialStep === 1 && (
                <div className="px-6 pt-4 flex-shrink-0">
                    <div className="flex gap-1.5">
                        {STEPS.map((s) => (
                            <div key={s.num} className="flex-1">
                                <div
                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                        currentStep >= s.num ? "bg-indigo-600" : "bg-zinc-100"
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
            )}

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
                                onSkip={() => {}} // unused — skip is removed
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
                        currentStep > 1 && initialStep === 1
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
                                    new Event("submit", { cancelable: true, bubbles: true })
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
                    <Button
                        onClick={() =>
                            document
                                .getElementById("phase-b-form")
                                ?.dispatchEvent(
                                    new Event("submit", { cancelable: true, bubbles: true })
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
                                Pallets not yet assigned
                            </h2>
                        </div>
                        <p className="text-sm text-zinc-600">
                            Warehouse stock has already been updated. If you leave now, this
                            shipment will have no pallets. You can return to this page at any
                            time to complete pallet assignment.
                        </p>
                        <div className="mt-5 flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowCancelDialog(false)}
                            >
                                Stay &amp; assign pallets
                            </Button>
                            <Button
                                variant="destructive"
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