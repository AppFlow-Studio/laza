"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { usePalletsForReorganization } from "@/lib/hooks/queries/useReorganize";
import { ReorganizePanel } from "./_components/ReorganizePanel";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import { MoveRight } from "lucide-react";

export default function PalletReorganizePage() {
    const router       = useRouter();
    const searchParams = useSearchParams();
    const sourceParam  = searchParams.get("source"); // pre-selected source pallet id

    const { data: warehouseLocation, isLoading: whLoading } = useWarehouseLocation();

    const {
        data:      pallets = [],
        isLoading: palletsLoading,
        refetch,
    } = usePalletsForReorganization(warehouseLocation?.id);

    const isLoading = whLoading || palletsLoading;

    if (isLoading) {
        return (
            <div className="space-y-4 p-6">
                <LoadingSkeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 gap-6">
                    <LoadingSkeleton className="h-96 rounded-xl" />
                    <LoadingSkeleton className="h-96 rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5">
                    <MoveRight className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">
                        Reorganize Pallets
                    </h1>
                    <p className="text-sm text-zinc-400">
                        Move boxes between pallets or reassign storage spaces
                    </p>
                </div>
            </div>

            <ReorganizePanel
                pallets={pallets}
                preselectedSourceId={sourceParam}
                warehouseLocationId={warehouseLocation?.id ?? ""}
                onComplete={() => {
                    refetch();
                    router.push("/super-admin/warehouse/pallets");
                }}
            />
        </div>
    );
}
