"use client";

import { useAuth } from "@clerk/nextjs";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import { WarehouseExpensesPanel } from "@/components/super-admin/warehouse/WarehouseExpensesPanel";

export default function WarehouseExpensesPage() {
    const { orgId } = useAuth();
    const { data: warehouseLocation, isLoading } = useWarehouseLocation();

    if (isLoading || !orgId || !warehouseLocation) {
        return <LoadingSkeleton />;
    }

    return (
        <WarehouseExpensesPanel
            organizationId={orgId}
            warehouseLocationId={warehouseLocation.id}
        />
    );
}
