"use client";

// app/(dashboard)/super-admin/warehouse/employees/page.tsx

import { useAuth } from "@clerk/nextjs";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { Warehouse } from "lucide-react";
import WarehouseEmployeePanel from "@/components/super-admin/warehouse/WarehouseEmployeePanel";

function PageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="animate-pulse space-y-2">
                <div className="h-7 w-48 rounded-lg bg-zinc-200" />
                <div className="h-4 w-96 rounded bg-zinc-100" />
            </div>
            <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-zinc-200" />
                        <div className="space-y-1.5 flex-1">
                            <div className="h-3 w-32 rounded bg-zinc-200" />
                            <div className="h-2.5 w-48 rounded bg-zinc-100" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function WarehouseEmployeesPage() {
    const { orgId } = useAuth();
    const { data: warehouse, isLoading, error } = useWarehouseLocation();

    if (!orgId || isLoading) return <PageSkeleton />;

    if (error || !warehouse) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="rounded-full bg-zinc-100 p-4">
                    <Warehouse className="h-8 w-8 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-700">
                    No warehouse location found
                </p>
                <p className="max-w-sm text-xs text-zinc-500">
                    The warehouse hasn't been set up yet. Complete Task 1.14
                    (seed warehouse data) and this page will become available.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900">
                    Warehouse Staff
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Manage employees assigned to{" "}
                    <span className="font-medium text-zinc-700">
                        {warehouse.name}
                    </span>
                    . Assigned staff can count and update warehouse inventory
                    using the standard employee dashboard.
                </p>
            </div>

            {/* Info callout */}
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
                <p className="text-xs leading-relaxed text-indigo-700">
                    <span className="font-semibold">
                        How warehouse counting works:{" "}
                    </span>
                    Warehouse employees log in at{" "}
                    <code className="rounded bg-indigo-100 px-1 font-mono font-medium">
                        /employee
                    </code>{" "}
                    and see the warehouse storage spaces instead of a store.
                    They count and update quantities exactly like store
                    employees — no extra training or separate system needed.
                </p>
            </div>

            {/* Panel */}
            <WarehouseEmployeePanel
                // warehouseLocationId={warehouse.id}
                // warehouseLocationName={warehouse.name}
                organizationId={orgId}
            />
        </div>
    );
}