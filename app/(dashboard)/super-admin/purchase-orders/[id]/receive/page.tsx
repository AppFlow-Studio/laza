// purchase-orders/[id]/receive/page.tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePOForReceiving } from "@/lib/hooks/queries/useReceiving";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { usePallets } from "@/lib/hooks/queries/usePallets";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import {
    Ship, Layers, AlertTriangle, CheckCircle2,
    ArrowLeft, ChevronRight, Plus,
} from "lucide-react";
import { ReceivingWizard } from "@/components/super-admin/shipment/ReceivingWizard";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

// ─── Pallet list shown when PO is already received ────────────────────────────

function ExistingPalletsList({
                                 pallets,
                                 warehouseId,
                                 poId,
                             }: {
    pallets: any[];
    warehouseId: string;
    poId: string;
}) {
    return (
        <div className="space-y-1">
            {pallets.map((pallet) => (
                <Link
                    key={pallet.id}
                    href={`/super-admin/warehouse/${warehouseId}/pallets/${pallet.id}`}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-indigo-100 transition-colors">
                            <Layers className="h-4 w-4 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <div>
                            <p className="font-mono text-sm font-semibold text-zinc-900">
                                {pallet.pallet_label}
                            </p>
                            <p className="text-xs text-zinc-400">
                                {pallet.total_boxes ?? 0} boxes
                                {pallet.received_at
                                    ? ` · received ${format(new Date(pallet.received_at), "MMM d, yyyy")}`
                                    : ""}
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-indigo-400 transition-colors" />
                </Link>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReceiveShipmentPage({
                                                params,
                                            }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router  = useRouter();

    const { data: po,               isLoading: poLoading  } = usePOForReceiving(id);
    const { data: warehouseLocation, isLoading: whLoading  } = useWarehouseLocation();

    // Check whether pallets have already been created for this PO
    const { data: existingPallets, isLoading: palletsLoading } = usePallets(
        warehouseLocation?.id,
        { purchaseOrderId: id }
    );

    const isLoading = poLoading || whLoading || palletsLoading;

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl space-y-4 p-6">
                <LoadingSkeleton className="h-8 w-48" />
                <LoadingSkeleton className="h-64 w-full rounded-xl" />
                <LoadingSkeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    if (!po || !warehouseLocation) {
        return (
            <div className="py-16 text-center text-sm text-zinc-500">
                Purchase order not found.
            </div>
        );
    }

    const hasPallets = (existingPallets?.length ?? 0) > 0;

    // ── PO already received ──────────────────────────────────────────────────
    if (po.status === "received") {
        // Case A: received AND has pallets — show them
        if (hasPallets) {
            return (
                <div className="mx-auto max-w-2xl space-y-6 p-6">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>

                    <div className="flex items-start gap-4 rounded-xl border border-green-200 bg-green-50 p-5">
                        <div className="rounded-full bg-green-100 p-2 flex-shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-green-900">
                                {po.po_number} has been received
                            </p>
                            <p className="mt-0.5 text-sm text-green-700">
                                {existingPallets!.length} pallet{existingPallets!.length !== 1 ? "s" : ""} assigned to this shipment.
                            </p>
                        </div>
                    </div>

                    <div>
                        <h2 className="mb-3 text-sm font-semibold text-zinc-700">
                            Pallets from this shipment
                        </h2>
                        <ExistingPalletsList
                            pallets={existingPallets!}
                            warehouseId={warehouseLocation.id}
                            poId={id}
                        />
                    </div>
                </div>
            );
        }

        // Case B: received but NO pallets — show warning + prompt to assign
        return (
            <div className="mx-auto max-w-2xl space-y-6 p-6">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <div className="rounded-full bg-amber-100 p-2 flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-amber-900">
                            No pallets assigned to {po.po_number}
                        </p>
                        <p className="mt-0.5 text-sm text-amber-700">
                            Warehouse stock was updated when this shipment was received, but
                            no pallets were created. Assign the received inventory to pallets
                            now so stock can be tracked and located in the warehouse.
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                            <Plus className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-zinc-900">Assign to pallets</p>
                            <p className="text-sm text-zinc-500">
                                Create pallets and distribute the received boxes across them.
                            </p>
                        </div>
                    </div>
                    <ReceivingWizard
                        po={po}
                        warehouseLocationId={warehouseLocation.id}
                        organizationId={po.organization_id}
                        initialStep={2}
                        onComplete={() =>
                            router.push(`/super-admin/purchase-orders/${po.id}`)
                        }
                        onCancel={() => router.back()}
                    />
                </div>
            </div>
        );
    }

    // ── Normal receive flow ──────────────────────────────────────────────────
    return (
        <ReceivingWizard
            po={po}
            warehouseLocationId={warehouseLocation.id}
            organizationId={po.organization_id}
            onComplete={() =>
                router.push(`/super-admin/purchase-orders/${po.id}`)
            }
            onCancel={() => router.back()}
        />
    );
}