// warehouse/[id]/purchase-orders/[poId]/receive/page.tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { usePOForReceiving } from "@/lib/hooks/queries/useReceiving";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import { Ship } from "lucide-react";
import { ReceivingWizard } from "@/components/super-admin/shipment/ReceivingWizard";

export default function ReceiveShipmentPage({
    params,
}: {
    params: Promise<{ poId: string }>;
}) {
    const { poId } = use(params);
    const router = useRouter();

    const { data: po, isLoading: poLoading } = usePOForReceiving(poId);
    const { data: warehouseLocation, isLoading: whLoading } = useWarehouseLocation();


    const isLoading = poLoading || whLoading;

    // Guard: PO already received
    if (!isLoading && po && po.status === "received") {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 rounded-full bg-green-50 p-4">
                    <Ship className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-base font-semibold text-zinc-900">
                    Already received
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                    PO {po.po_number} has already been received and cannot be re-processed.
                </p>
                <button
                    onClick={() => router.back()}
                    className="mt-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                    ← Go back
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-4 max-w-3xl mx-auto p-6">
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


    return (
        <ReceivingWizard
            po={po}
            warehouseLocationId={warehouseLocation.id}
            organizationId={po.organization_id}
            onComplete={() =>
                router.push(`/super-admin/warehouse/${warehouseLocation.id}/purchase-orders/${po.id}`)
            }
            onCancel={() => router.back()}
        />
    );
}
