"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import {
    getEmployeeLocation,
    getEmployeeStorageSpaces,
    getStorageSpaceItems,
    getEmployeeInventoryLogs,
    getStorageSpaceLogs,
    getEmployeeStats,
} from '@/lib/supabase/queries/employee';
import { updateQuantity } from '@/lib/supabase/queries/inventory';

export function useEmployeeLocation() {
    const { user } = useUser();
    return useQuery({
        queryKey: ['employee-location', user?.id],
        queryFn: () => getEmployeeLocation(user?.id || ''),
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useEmployeeStorageSpaces(locationId: string | null) {
    return useQuery({
        queryKey: ['employee-storage-spaces', locationId],
        queryFn: () => getEmployeeStorageSpaces(locationId!),
        enabled: !!locationId,
        staleTime: 30 * 1000, // 30 seconds
    });
}

export function useStorageSpaceItems(storageSpaceId: string | null) {
    return useQuery({
        queryKey: ['employee-items', storageSpaceId],
        queryFn: () => getStorageSpaceItems(storageSpaceId!),
        enabled: !!storageSpaceId,
        staleTime: 30 * 1000,
    });
}

export function useEmployeeInventoryLogs(locationId: string | null, limit: number = 50) {
    return useQuery({
        queryKey: ['employee-inventory-logs', locationId, limit],
        queryFn: () => getEmployeeInventoryLogs(locationId!, limit),
        enabled: !!locationId,
        staleTime: 30 * 1000,
    });
}

export function useStorageSpaceLogs(storageSpaceId: string | null, limit: number = 50) {
    return useQuery({
        queryKey: ['employee-storage-space-logs', storageSpaceId, limit],
        queryFn: () => getStorageSpaceLogs(storageSpaceId!, limit),
        enabled: !!storageSpaceId,
        staleTime: 30 * 1000,
    });
}

export function useEmployeeStats(userId: string | null, locationId: string | null) {
    return useQuery({
        queryKey: ['employee-stats', userId, locationId],
        queryFn: () => getEmployeeStats(userId!, locationId!),
        enabled: !!userId && !!locationId,
        staleTime: 60 * 1000, // 1 minute
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
        }: {
            itemId: string;
            locationId: string;
            storageSpaceId: string | null;
            newQuantity: number;
            userId: string;
            actionType: 'count' | 'adjustment' | 'received' | 'used';
            notes?: string;
            minQuantityOverride?: number | null;
        }) => updateQuantity(itemId, locationId, storageSpaceId, newQuantity, userId, actionType, notes, minQuantityOverride),
        onSuccess: (_, variables) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['employee-items', variables.storageSpaceId] });
            queryClient.invalidateQueries({ queryKey: ['employee-inventory-logs'] });
            queryClient.invalidateQueries({ queryKey: ['employee-storage-space-logs'] });
            queryClient.invalidateQueries({ queryKey: ['employee-stats'] });
        },
    });
}

