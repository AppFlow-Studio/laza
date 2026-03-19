import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, useOrganization } from '@clerk/nextjs';
import {
    getPOForReceivingAction,
    getWarehouseStorageSpacesAction,
    confirmPOReceiptAction,
    assignShipmentToPalletsAction,
    PalletAssignment,
} from '@/lib/supabase/actions/palletActions';
import { purchaseOrderKeys } from '@/lib/hooks/queries/usePurchaseOrders';
import { palletKeys } from '@/lib/hooks/queries/usePallets';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const receivingKeys = {
    poForReceiving: (poId: string) => ['po-for-receiving', poId] as const,
    storageSpaces:  (locationId: string) => ['warehouse-storage-spaces', locationId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Loads the PO + all line items for Phase A. Always fresh — never stale. */
export function usePOForReceiving(purchaseOrderId: string | undefined) {
    return useQuery({
        queryKey:  receivingKeys.poForReceiving(purchaseOrderId ?? ''),
        queryFn:   () => getPOForReceivingAction(purchaseOrderId!),
        enabled:   !!purchaseOrderId,
        staleTime: 0, // always refetch — data changes as user edits
    });
}

/** Warehouse storage spaces for the pallet assignment step. */
export function useWarehouseStorageSpaces(warehouseLocationId: string | undefined) {
    return useQuery({
        queryKey:  receivingKeys.storageSpaces(warehouseLocationId ?? ''),
        queryFn:   () => getWarehouseStorageSpacesAction(warehouseLocationId!),
        enabled:   !!warehouseLocationId,
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Phase A — confirms PO receipt via the receive_purchase_order RPC. */
export function useConfirmPOReceipt() {
    const qc                   = useQueryClient();
    const { user }             = useUser();
    const { organization }     = useOrganization();

    return useMutation({
        mutationFn: ({
            purchaseOrderId,
            receivedItems,
            actualArrivalDate,
        }: {
            purchaseOrderId: string;
            receivedItems: { item_id: number; quantity_received: number }[];
            actualArrivalDate: string;
        }) =>
            confirmPOReceiptAction(
                purchaseOrderId,
                user?.id ?? '',
                receivedItems,
                actualArrivalDate,
            ),

        onSuccess: (_, { purchaseOrderId }) => {
            // Invalidate PO detail so status badge updates
            qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(purchaseOrderId) });
            // Invalidate warehouse inventory — quantities just changed
            qc.invalidateQueries({ queryKey: ['warehouse-inventory'] });
            qc.invalidateQueries({ queryKey: ['inventory'] });
            qc.invalidateQueries({ queryKey: ['alerts'] });
            qc.invalidateQueries({ queryKey: ['items'] });
            if (organization?.id) {
                qc.invalidateQueries({ queryKey: purchaseOrderKeys.all(organization.id) });
                qc.invalidateQueries({ queryKey: purchaseOrderKeys.costs(organization.id) });
            }
        },
    });
}

/** Phase B — creates all pallets via the receive_shipment_to_pallets RPC. */
export function useAssignShipmentToPallets() {
    const qc               = useQueryClient();
    const { user }         = useUser();
    const { organization } = useOrganization();

    return useMutation({
        mutationFn: ({
            purchaseOrderId,
            organizationId,
            warehouseLocationId,
            palletAssignments,
        }: {
            purchaseOrderId: string;
            organizationId: string;
            warehouseLocationId: string;
            palletAssignments: PalletAssignment[];
        }) =>
            assignShipmentToPalletsAction(
                purchaseOrderId,
                organizationId,
                warehouseLocationId,
                user?.id ?? '',
                palletAssignments,
            ),

        onSuccess: () => {
            // Pallets list and stats need to refresh
            qc.invalidateQueries({ queryKey: palletKeys.lists() });
            qc.invalidateQueries({ queryKey: palletKeys.all });
            // Warehouse stats cards
            qc.invalidateQueries({ queryKey: ['warehouse-stats'] });
        },
    });
}
