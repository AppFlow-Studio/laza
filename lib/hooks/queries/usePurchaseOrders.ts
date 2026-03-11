// lib/hooks/queries/usePurchaseOrders.ts
//
// React Query hooks for purchase orders and item cost history — Task 2.20.
// Wraps lib/supabase/queries/purchaseOrders.ts.
//
// Stale times (from Developer Task Plan v3, Task 2.20):
//   usePurchaseOrders     — 1 min  (list refreshes reasonably often)
//   usePurchaseOrder      — 1 min  (single PO detail)
//   useItemCostHistory    — 5 min  (historical data, rarely changes)
//
// Cache invalidation targets:
//   After useReceivePurchaseOrder succeeds:
//     → purchaseOrderKeys.all(orgId)          (list reflects new "received" status)
//     → purchaseOrderKeys.detail(id)          (detail page reflects new status)
//     → warehouseKeys.inventory(locationId)  (quantities just increased)
//     → warehouseKeys.stats(locationId)       (low stock counts may have changed)
//     → ["items"]                             (current_unit_cost updated on items)
//
//   After useCreatePurchaseOrder / useUpdatePurchaseOrder:
//     → purchaseOrderKeys.all(orgId)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

import {
    getAllPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    getItemCostHistory,
} from "@/lib/supabase/queries/purchaseOrders";

import { warehouseKeys } from "./useWarehouse";

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const purchaseOrderKeys = {
    // All POs for this org (optionally filtered)
    all: (organizationId: string, filters?: Record<string, string>) =>
        ["purchase-orders", organizationId, filters ?? {}] as const,

    // Single PO detail with line items
    detail: (id: string) =>
        ["purchase-orders", "detail", id] as const,

    // Cost history for a specific item
    costHistory: (itemId: number) =>
        ["item-cost-history", itemId] as const,
};

// ---------------------------------------------------------------------------
// Types — passed from components into mutations
// ---------------------------------------------------------------------------

export interface CreatePOInput {
    po: {
        organization_id: string;
        po_number: string;
        supplier_name: string | null;
        status: string;
        order_date: string | null;
        expected_arrival: string | null;
        office_fee: number;
        shipping_fee: number;
        subtotal_before: number;
        total_cbm: number | null;
        notes: string | null;
        created_by: string;
    };
    items: {
        item_id: number;
        quantity_ordered: number;
        unit_price_before: number;
        total_price_before: number;
        pieces_per_carton: number | null;
        cartons: number | null;
        cbm: number | null;
        cbm_share: number | null;
        allocated_office_fee: number | null;
        allocated_shipping_fee: number | null;
        total_cost_after: number;
        unit_cost_after: number;
    }[];
}

export interface ReceivePOInput {
    purchaseOrderId: string;
    userId: string;
    receivedItems: {
        item_id: number;
        quantity_received: number;
    }[];
}

// ---------------------------------------------------------------------------
// 1. usePurchaseOrders — list all POs for the org, optionally filtered
//    Used by: /super-admin/purchase-orders (list page)
// ---------------------------------------------------------------------------

export function usePurchaseOrders(
    organizationId: string,
    filters?: { status?: string }
) {
    return useQuery({
        queryKey: purchaseOrderKeys.all(organizationId, filters as Record<string, string>),
        queryFn: () => getAllPurchaseOrders(organizationId, filters),
        enabled: !!organizationId,
        staleTime: 60 * 1000, // 1 minute
    });
}

// ---------------------------------------------------------------------------
// 2. usePurchaseOrder — single PO with all line items joined
//    Used by: /super-admin/purchase-orders/[id] (detail page)
// ---------------------------------------------------------------------------

export function usePurchaseOrder(id: string | undefined) {
    return useQuery({
        queryKey: purchaseOrderKeys.detail(id ?? ""),
        queryFn: () => getPurchaseOrderById(id!),
        enabled: !!id,
        staleTime: 60 * 1000, // 1 minute
    });
}

// ---------------------------------------------------------------------------
// 3. useCreatePurchaseOrder — create PO header + all line items atomically
//    Calls createPurchaseOrder() which inserts the PO, inserts all items,
//    then calls recalculate_po_costs() RPC to confirm stored calculations.
//
//    On success: invalidate the PO list so the new entry appears immediately.
// ---------------------------------------------------------------------------

export function useCreatePurchaseOrder() {
    const queryClient = useQueryClient();
    const { orgId } = useAuth();

    return useMutation({
        mutationFn: (input: CreatePOInput) =>
            createPurchaseOrder(input.po, input.items),

        onSuccess: () => {
            if (orgId) {
                // Invalidate all PO list queries for this org (any filter combination)
                queryClient.invalidateQueries({
                    queryKey: ["purchase-orders", orgId],
                });
            }
        },
    });
}

// ---------------------------------------------------------------------------
// 4. useUpdatePurchaseOrder — update PO header (status, dates, fees, notes)
//    Used for status advancement: draft → submitted → in_transit → arrived.
//    Does NOT recalculate line items — use useCreatePurchaseOrder for that
//    if the entire PO needs to be replaced.
//
//    On success: invalidate both the list and the specific detail entry.
// ---------------------------------------------------------------------------

export function useUpdatePurchaseOrder() {
    const queryClient = useQueryClient();
    const { orgId } = useAuth();

    return useMutation({
        mutationFn: ({
            id,
            updates,
        }: {
            id: string;
            updates: Record<string, unknown>;
        }) => updatePurchaseOrder(id, updates),

        onSuccess: (_data, variables) => {
            // Refresh this specific PO's detail
            queryClient.invalidateQueries({
                queryKey: purchaseOrderKeys.detail(variables.id),
            });
            // Refresh the list (status badge will have changed)
            if (orgId) {
                queryClient.invalidateQueries({
                    queryKey: ["purchase-orders", orgId],
                });
            }
        },
    });
}

// ---------------------------------------------------------------------------
// 5. useReceivePurchaseOrder — the most consequential mutation in this file.
//
//    Calls the receive_purchase_order() RPC (Task 1.25) which in a single
//    DB transaction:
//      1. Increments warehouse item_locations.current_quantity for each item
//      2. Creates inventory_logs entries (action_type = 'received')
//      3. Inserts item_cost_history rows with the landed unit_cost_after
//      4. Updates items.current_unit_cost to the new landed cost
//      5. Sets purchase_orders.status = 'received' and actual_arrival = NOW()
//      6. Fires the check_low_stock() trigger automatically (DB level)
//
//    On success: cascade-invalidate everything touched by the RPC.
// ---------------------------------------------------------------------------

export function useReceivePurchaseOrder() {
    const queryClient = useQueryClient();
    const { orgId } = useAuth();

    return useMutation({
        mutationFn: (input: ReceivePOInput) =>
            receivePurchaseOrder(
                input.purchaseOrderId,
                input.userId,
                input.receivedItems
            ),

        onSuccess: (_data, variables) => {
            // 1. The PO itself changed status to "received"
            queryClient.invalidateQueries({
                queryKey: purchaseOrderKeys.detail(variables.purchaseOrderId),
            });

            // 2. The PO list needs to reflect the new status
            if (orgId) {
                queryClient.invalidateQueries({
                    queryKey: ["purchase-orders", orgId],
                });
            }

            // 3. Warehouse inventory quantities have changed
            //    We don't know the warehouse location ID here, so invalidate
            //    all warehouse inventory queries (safe broad invalidation)
            queryClient.invalidateQueries({
                queryKey: ["warehouse", "inventory"],
            });

            // 4. Warehouse stats (out_of_stock / low_stock counts may change)
            queryClient.invalidateQueries({
                queryKey: ["warehouse", "stats"],
            });

            // 5. items.current_unit_cost was updated — affects order ticket
            //    pricing (Task 3.7 cost snapshot) and the warehouse catalog display
            queryClient.invalidateQueries({
                queryKey: ["inventory"],
            });
            queryClient.invalidateQueries({
                queryKey: ["items"],
            });

            // 6. Alerts may have been resolved (check_low_stock trigger fired)
            queryClient.invalidateQueries({
                queryKey: ["alerts"],
            });
        },
    });
}

// ---------------------------------------------------------------------------
// 6. useItemCostHistory — time-series of landed costs for one item
//    Used by: analytics cost trend chart (Task 4.9 / 4.10)
//    Stale time: 5 minutes (historical data, only changes when a PO is received)
// ---------------------------------------------------------------------------

export function useItemCostHistory(itemId: number | undefined) {
    return useQuery({
        queryKey: purchaseOrderKeys.costHistory(itemId ?? 0),
        queryFn: () => getItemCostHistory(itemId!),
        enabled: !!itemId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}