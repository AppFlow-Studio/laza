import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, useOrganization } from '@clerk/nextjs';

import {
    getPurchaseOrdersAction,
    getPurchaseOrderByIdAction,
    getItemCostHistoryAction,
    getWarehouseLocationsAction,
    createPurchaseOrderAction,
    updatePurchaseOrderAction,
    updatePurchaseOrderStatusAction,
    deletePurchaseOrderAction,
    upsertPurchaseOrderItemsAction,
    deletePurchaseOrderItemAction,
    recalculatePoCostsAction,
    receivePurchaseOrderAction,
    getActionablePOCountAction,
} from '@/lib/supabase/actions/purchaseOrderActions';

import type { Database } from '@/lib/supabase/types';

type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert'];

// ─── Query keys ───────────────────────────────────────────────────────────────

export const purchaseOrderKeys = {
    all:             (orgId: string)                  => ['purchaseOrders', orgId] as const,
    detail:          (id: string)                     => ['purchaseOrders', 'detail', id] as const,
    costs:           (orgId: string, itemId?: number) => ['itemCostHistory', orgId, itemId] as const,
    warehouses:      (orgId: string)                  => ['warehouseLocations', orgId] as const,
    actionableCount: (orgId: string)                  => ['purchaseOrders', 'actionable-count', orgId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePurchaseOrders(organizationId?: string, warehouseLocationId?: string | null) {
    return useQuery({
        queryKey:  purchaseOrderKeys.all(organizationId ?? ''),
        queryFn:   () => getPurchaseOrdersAction(organizationId!, warehouseLocationId),
        enabled:   !!organizationId,
        staleTime: 60 * 1000,
    });
}

export function usePurchaseOrder(id?: string) {
    return useQuery({
        queryKey:  purchaseOrderKeys.detail(id ?? ''),
        queryFn:   () => getPurchaseOrderByIdAction(id!),
        enabled:   !!id,
        staleTime: 30 * 1000,
    });
}

export function useItemCostHistory(organizationId?: string, itemId?: number) {
    return useQuery({
        queryKey:  purchaseOrderKeys.costs(organizationId ?? '', itemId),
        queryFn:   () => getItemCostHistoryAction(organizationId!, itemId),
        enabled:   !!organizationId,
        staleTime: 5 * 60 * 1000,
    });
}

// ─── NEW: warehouse locations for dropdown ────────────────────────────────────

export function useWarehouseLocations(organizationId?: string) {
    return useQuery({
        queryKey:  purchaseOrderKeys.warehouses(organizationId ?? ''),
        queryFn:   () => getWarehouseLocationsAction(organizationId!),
        enabled:   !!organizationId,
        staleTime: 5 * 60 * 1000,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePurchaseOrder() {
    const qc = useQueryClient();
    const { organization } = useOrganization();
    return useMutation({
        mutationFn: (data: Parameters<typeof createPurchaseOrderAction>[0]) =>
            createPurchaseOrderAction(data),
        onSuccess: () => {
            if (organization?.id) {
                qc.invalidateQueries({ queryKey: purchaseOrderKeys.all(organization.id) });
            }
        },
    });
}

export function useUpdatePurchaseOrder() {
    const qc = useQueryClient();
    const { organization } = useOrganization();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updatePurchaseOrderAction>[1] }) =>
            updatePurchaseOrderAction(id, updates),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) });
            if (organization?.id) {
                qc.invalidateQueries({ queryKey: purchaseOrderKeys.all(organization.id) });
            }
        },
    });
}

export function useUpdatePurchaseOrderStatus() {
    const qc = useQueryClient();
    const { organization } = useOrganization();
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: Parameters<typeof updatePurchaseOrderStatusAction>[1] }) =>
            updatePurchaseOrderStatusAction(id, status),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(id) });
            if (organization?.id) {
                qc.invalidateQueries({ queryKey: purchaseOrderKeys.all(organization.id) });
            }
        },
    });
}

export function useDeletePurchaseOrder() {
    const qc = useQueryClient();
    const { organization } = useOrganization();
    return useMutation({
        mutationFn: (id: string) => deletePurchaseOrderAction(id),
        onSuccess: () => {
            if (organization?.id) {
                qc.invalidateQueries({ queryKey: purchaseOrderKeys.all(organization.id) });
            }
        },
    });
}

export function useUpsertPurchaseOrderItems() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (items: PurchaseOrderItemInsert[]) =>
            upsertPurchaseOrderItemsAction(items),
        onSuccess: (_, items) => {
            const poId = items[0]?.purchase_order_id;
            if (poId) qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(poId) });
        },
    });
}

export function useDeletePurchaseOrderItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ itemId, poId }: { itemId: string; poId: string }) =>
            deletePurchaseOrderItemAction(itemId),
        onSuccess: (_, { poId }) => {
            qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(poId) });
        },
    });
}

export function useRecalculatePoCosts() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (poId: string) => recalculatePoCostsAction(poId),
        onSuccess: (_, poId) => {
            qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(poId) });
        },
    });
}

export function useReceivePurchaseOrder() {
    const qc = useQueryClient();
    const { user }         = useUser();
    const { organization } = useOrganization();
    return useMutation({
        mutationFn: ({ poId, receivedItems }: { poId: string; receivedItems: { item_id: number; quantity_received: number }[] }) =>
            receivePurchaseOrderAction(poId, user?.id ?? '', receivedItems),
        onSuccess: (_, { poId }) => {
            qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(poId) });
            qc.invalidateQueries({ queryKey: ['inventory'] });
            qc.invalidateQueries({ queryKey: ['alerts'] });
            qc.invalidateQueries({ queryKey: ['items'] });
            if (organization?.id) {
                qc.invalidateQueries({ queryKey: purchaseOrderKeys.all(organization.id) });
                qc.invalidateQueries({ queryKey: purchaseOrderKeys.costs(organization.id) });
                qc.invalidateQueries({ queryKey: purchaseOrderKeys.actionableCount(organization.id) });
            }
        },
    });
}

// ─── useActionablePOCount ─────────────────────────────────────────────────────

export function useActionablePOCount(orgId: string | undefined) {
    return useQuery({
        queryKey:             purchaseOrderKeys.actionableCount(orgId ?? ''),
        queryFn:              () => getActionablePOCountAction(orgId!),
        enabled:              !!orgId,
        staleTime:            30_000,
        refetchOnWindowFocus: true,
    });
}
