"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import {
    getInventoryByLocation,
    getInventoryByItemAndLocation,
    updateQuantity,
    getInventoryLogs,
    getAlerts,
    getLowStockItems,
    resolveAlert,
    bulkUpdateInventory,
    bulkRemoveItemsFromStorage,
} from '@/lib/supabase/queries/inventory';
import { useUserInfo } from './useUserInfo';

export function useInventoryByLocation(locationId: string | null) {
    return useQuery({
        queryKey: ['inventory', 'location', locationId],
        queryFn: () => getInventoryByLocation(locationId!),
        enabled: !!locationId,
    });
}

export function useInventoryLogs(filters?: { itemId?: string; locationId?: string; limit?: number }) {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    return useQuery({
        queryKey: ['inventory-logs', filters],
        queryFn: () => getInventoryLogs(filters, organizationId),
    });
}

export function useAlerts(filters?: { locationId?: string; storageSpaceId?: string; resolved?: boolean }) {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    return useQuery({
        queryKey: ['alerts', filters, organizationId],
        queryFn: () => getAlerts(filters, organizationId),
    });
}

export function useLowStockItems(groupBy: 'location' | 'item' = 'location') {
    return useQuery({
        queryKey: ['low-stock-items', groupBy],
        queryFn: () => getLowStockItems(groupBy),
        staleTime: 30 * 1000, // 30 seconds
    });
}

export function useUpdateQuantity() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            itemId,
            locationId,
            storageSpaceId,
            newQuantity,
            userId,
            actionType,
            notes,
            minQuantityOverride,
            isOverride,
            overrideReason,
            overrideAdminId,
        }: {
            itemId: string;
            locationId: string;
            storageSpaceId: string | null;
            newQuantity: number;
            userId: string;
            actionType: 'count' | 'adjustment' | 'received' | 'used';
            notes?: string;
            minQuantityOverride?: number | null;
            isOverride?: boolean;
            overrideReason?: string | null;
            overrideAdminId?: string | null;
        }) => updateQuantity(
            itemId,
            locationId,
            storageSpaceId,
            newQuantity,
            userId,
            actionType,
            notes,
            minQuantityOverride,
            isOverride,
            overrideReason,
            overrideAdminId
        ),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}

export function useResolveAlert() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resolveAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}

export function useBulkUpdateInventory() {
    const queryClient = useQueryClient();
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    return useMutation({
        mutationFn: (data: {
            itemLocations: Array<{
                itemId: string;
                locationId: string;
                storageSpaceId: string;
                quantity?: number;
                minQuantityOverride?: number | null;
                actionType: 'count' | 'adjustment' | 'received' | 'used';
                notes?: string;
            }>;
        }) => {
            if (!userInfo?.id) throw new Error('userInfo not authenticated');
            return bulkUpdateInventory(data.itemLocations, userInfo.id, organizationId);
        },
        onSuccess: (_, variables) => {
            const firstItem = variables.itemLocations[0];
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
            if (firstItem) {
                queryClient.invalidateQueries({ queryKey: ['inventory', 'storage-space', firstItem.storageSpaceId] });
            }
        },
    });
}

export function useBulkRemoveItems() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            itemIds: string[];
            locationId: string;
            storageSpaceId: string;
        }) => bulkRemoveItemsFromStorage(data.itemIds, data.locationId, data.storageSpaceId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory', 'storage-space', variables.storageSpaceId] });
        },
    });
}

