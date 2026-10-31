"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useConfirmPOReceipt, useAssignShipmentToPallets } from "@/lib/hooks/queries/useReceiving";
import { PhaseAStep, type PhaseAData } from "./PhaseAStep";
import { PhaseBStep, type PhaseBData } from "./PhaseBStep";
import { getFriendlyErrorMessage } from "@/lib/utils/errorMessages";

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
    return {
        actualArrivalDate: po.actual_arrival ?? format(new Date(), "yyyy-MM-dd"),
        notes: "",
        lineItems: po.purchase_order_items.map((item) => ({
            item_id:             item.item_id,
            po_item_id:          item.id,
            quantity_ordered:    item.quantity_ordered,
            pieces_per_box:      item.pieces_per_box,
            quantity_received:   item.quantity_received ?? item.quantity_ordered,
            partial_box_reason:  null,
            partial_box_note:    "",
            overage_acknowledged: false,
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
    const [currentStep, setCurrentStep] = useState<1 | 2>(initialStep);
    const [direction, setDirection]     = useState(1);
    const [phaseAData, setPhaseAData]   = useState<PhaseAData | null>(
        initialStep === 2 ? reconstructPhaseAData(po) : null
    );
    const [phaseBValid, setPhaseBValid]         = useState(false);
    const [receiptConfirmed, setReceiptConfirmed] = useState(initialStep === 2);

    const confirmReceipt  = useConfirmPOReceipt();
    const assignToPallets = useAssignShipmentToPallets();

    const goTo = useCallback(
        (step: 1 | 2) => {
            setDirection(step > currentStep ? 1 : -1);
            setCurrentStep(step);
        },
        [currentStep]
    );

    // ── Phase A: just save data and advance — no API call ─────────────────
    const handlePhaseASubmit = (data: PhaseAData) => {
        setPhaseAData(data);
        goTo(2);
    };

    // ── Phase B: confirm receipt first (if not already received), then assign pallets ──
    const handlePhaseBSubmit = async (data: PhaseBData) => {
        try {
            if (!receiptConfirmed) {
                await confirmReceipt.mutateAsync({
                    purchaseOrderId:   po.id,
                    receivedItems:     phaseAData!.lineItems.map((li) => ({
                        item_id:              li.item_id,
                        quantity_received:    li.quantity_received,
                        partial_box_reason:   li.partial_box_reason ?? null,
                        partial_box_note:     li.partial_box_note ?? null,
                        overage_acknowledged: li.overage_acknowledged ?? false,
                    })),
                    actualArrivalDate: phaseAData!.actualArrivalDate,
                });
                setReceiptConfirmed(true);
            }

            await assignToPallets.mutateAsync({
                purchaseOrderId:   po.id,
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
        } catch (err: unknown) {
            toast.error(getFriendlyErrorMessage(err));
        }
    };

    const handleCancelClick = () => {
        if (currentStep > 1 && initialStep === 1) {
            goTo(1);
        } else {
            onCancel();
        }
    };

    const isPhaseALoading = false; // Phase A no longer calls any API
    const isPhaseBLoading = confirmReceipt.isPending || assignToPallets.isPending;

    // Label for the Phase B loading state
    const phaseBLoadingLabel = confirmReceipt.isPending
        ? "Receiving…"
        : "Creating pallets…";

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
                                onValidityChange={setPhaseBValid}
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
                    onClick={handleCancelClick}
                    disabled={isPhaseBLoading}
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
                        size="sm"
                    >
                        Next
                        <ArrowRight className="ml-1.5 h-4 w-4" />
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
                        disabled={isPhaseBLoading || !phaseBValid}
                        size="sm"
                    >
                        {isPhaseBLoading ? (
                            <>
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                {phaseBLoadingLabel}
                            </>
                        ) : (
                            "Receive & Assign to Pallets"
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
