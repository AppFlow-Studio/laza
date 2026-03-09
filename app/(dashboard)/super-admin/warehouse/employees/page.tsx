"use client";

// app/(dashboard)/super-admin/warehouse/employees/page.tsx
//
// Task 2.7 — Warehouse employee management page.
//
// Route: /super-admin/warehouse/employees
// Add to super-admin sidebar nav alongside Dashboard, Warehouse, Orders, etc.
//
// This page is a thin wrapper: it resolves the warehouse location and
// hands everything off to WarehouseEmployeePanel. The panel component is
// also importable into the warehouse inventory page (Task 2.4) as a
// side-panel if the layout calls for it.

import { useAuth } from "@clerk/nextjs";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { Warehouse } from "lucide-react";
import WarehouseEmployeePanel from "@/components/super-admin/warehouse/WarehouseEmployeePanel";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function PageSkeleton() {
    return (
        <div className="mx-auto max-w-2xl space-y-4 p-6">
            <div className="animate-pulse space-y-2">
                <div className="h-5 w-48 rounded bg-zinc-700" />
                <div className="h-3 w-72 rounded bg-zinc-800" />
            </div>
            <div className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-700" />
                        <div className="space-y-1.5">
                            <div className="h-3 w-28 rounded bg-zinc-700" />
                            <div className="h-2.5 w-40 rounded bg-zinc-800" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WarehouseEmployeesPage() {
    const { orgId } = useAuth();

    const {
        data: warehouse,
        isLoading,
        error,
    } = useWarehouseLocation();

    if (!orgId || isLoading) return <PageSkeleton />;

    // Warehouse not seeded yet (Task 1.14 blocked on client data)
    if (error || !warehouse) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <Warehouse className="h-10 w-10 text-zinc-600" />
                <p className="text-sm font-medium text-zinc-300">
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
        <div className="mx-auto max-w-2xl space-y-6 p-6">

            {/* Page header */}
            <div>
                <h1 className="text-xl font-semibold text-white">
                    Warehouse Staff
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                    Manage employees assigned to{" "}
                    <span className="font-medium text-zinc-200">
                        {warehouse.name}
                    </span>
                    . Assigned staff can count and update warehouse inventory
                    using the standard employee dashboard.
                </p>
            </div>

            {/* How it works callout */}
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 px-4 py-3">
                <p className="text-xs leading-relaxed text-zinc-400">
                    <span className="font-medium text-zinc-300">
                        How warehouse counting works:
                    </span>{" "}
                    Warehouse employees log in at{" "}
                    <span className="font-mono text-zinc-300">/employee</span>{" "}
                    and see the warehouse storage spaces instead of a store.
                    They count and update quantities exactly like store
                    employees — no extra training or separate system needed.
                </p>
            </div>

            {/* Employee panel */}
            <WarehouseEmployeePanel
                warehouseLocationId={warehouse.id}
                warehouseLocationName={warehouse.name}
                organizationId={orgId}
            />

        </div>
    );
}