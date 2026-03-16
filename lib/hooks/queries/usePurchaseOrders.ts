import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, useOrganization } from '@clerk/nextjs';

// Everything goes through server actions — Clerk JWT attached, RLS passes for all operations
import {
    getPurchaseOrdersAction,
    getPurchaseOrderByIdAction,
    getItemCostHistoryAction,
    createPurchaseOrderAction,
    updatePurchaseOrderAction,
    updatePurchaseOrderStatusAction,
    deletePurchaseOrderAction,
    upsertPurchaseOrderItemsAction,
    deletePurchaseOrderItemAction,
    recalculatePoCostsAction,
    receivePurchaseOrderAction,
} from '@/lib/supabase/actions/purchaseOrderActions';

import type { Database } from '@/lib/supabase/types';

type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert'];

// ─── Query keys ───────────────────────────────────────────────────────────────

export const purchaseOrderKeys = {
    all:    (orgId: string)                  => ['purchaseOrders', orgId] as const,
    detail: (id: string)                     => ['purchaseOrders', 'detail', id] as const,
    costs:  (orgId: string, itemId?: number) => ['itemCostHistory', orgId, itemId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePurchaseOrders(organizationId?: string) {
    return useQuery({
        queryKey:  purchaseOrderKeys.all(organizationId ?? ''),
        queryFn:   () => getPurchaseOrdersAction(organizationId!),
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
            }
        },
    });
}