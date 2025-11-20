"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getInventoryByLocation,
    getInventoryByItemAndLocation,
    updateQuantity,
    getInventoryLogs,
    getAlerts,
    resolveAlert,
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

export function useAlerts(filters?: { locationId?: string; resolved?: boolean }) {
    return useQuery({
        queryKey: ['alerts', filters],
        queryFn: () => getAlerts(filters),
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
        }: {
            itemId: string;
            locationId: string;
            storageSpaceId: string | null;
            newQuantity: number;
            userId: string;
            actionType: 'count' | 'adjustment' | 'received' | 'used';
            notes?: string;
        }) => updateQuantity(itemId, locationId, storageSpaceId, newQuantity, userId, actionType, notes),
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

