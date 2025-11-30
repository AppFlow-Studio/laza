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

export function useInventoryByLocation(locationId: string | null) {
    return useQuery({
        queryKey: ['inventory', 'location', locationId],
        queryFn: () => getInventoryByLocation(locationId!),
        enabled: !!locationId,
    });
}

export function useInventoryLogs(filters?: { itemId?: string; locationId?: string; limit?: number }) {
    return useQuery({
        queryKey: ['inventory-logs', filters],
        queryFn: () => getInventoryLogs(filters),
    });
}

export function useAlerts(filters?: { locationId?: string; storageSpaceId?: string; resolved?: boolean }) {
    return useQuery({
        queryKey: ['alerts', filters],
        queryFn: () => getAlerts(filters),
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
    const { user } = useUser();
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
            if (!user?.id) throw new Error('User not authenticated');
            return bulkUpdateInventory(data.itemLocations, user.id);
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

