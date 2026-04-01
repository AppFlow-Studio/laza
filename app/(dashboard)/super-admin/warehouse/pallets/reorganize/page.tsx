// /super-admin/warehouse/pallets/reorganize
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { usePalletsForReorganization } from "@/lib/hooks/queries/useReorganize";
import { ReorganizePanel } from "@/components/super-admin/pallets/ReorganizePanel";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import { MoveRight } from "lucide-react";

export default function PalletReorganizePage() {
    const router         = useRouter();
    const searchParams   = useSearchParams();
    const sourceParam    = searchParams.get("source");
    const warehouseParam = searchParams.get("warehouse") ?? "";

    const {
        data:      pallets = [],
        isLoading: palletsLoading,
        refetch,
    } = usePalletsForReorganization(warehouseParam || undefined);

    if (palletsLoading) {
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
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5">
                    <MoveRight className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">
                        Reorganize Pallets
                    </h1>
                    <p className="text-sm text-zinc-400">
                        Move boxes between pallets
                    </p>
                </div>
            </div>

            <ReorganizePanel
                pallets={pallets}
                preselectedSourceId={sourceParam}
                warehouseLocationId={warehouseParam}
                onComplete={() => {
                    refetch();
                    router.push("/super-admin/warehouse/pallets");
                }}
            />
        </div>
    );
}