"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStorageSpaceById, updateStorageSpace, deleteStorageSpace } from '@/lib/supabase/queries/locations';
import { getInventoryByStorageSpace, getInventoryLogsByStorageSpace } from '@/lib/supabase/queries/inventory';
import { StorageSpace } from '@/lib/supabase/types';

export function useStorageSpace(id: string | null) {
    console.log(id)
    return useQuery({
        queryKey: ['storage-space', id],
        queryFn: () => getStorageSpaceById(id!),
        enabled: !!id,
    });
}

export function useInventoryByStorageSpace(storageSpaceId: string | null) {
    return useQuery({
        queryKey: ['inventory', 'storage-space', storageSpaceId],
        queryFn: () => getInventoryByStorageSpace(storageSpaceId!),
        enabled: !!storageSpaceId,
    });
}

export function useInventoryLogsByStorageSpace(storageSpaceId: string | null, limit?: number) {
    return useQuery({
        queryKey: ['inventory-logs', 'storage-space', storageSpaceId, limit],
        queryFn: () => getInventoryLogsByStorageSpace(storageSpaceId!, limit),
        enabled: !!storageSpaceId,
    });
}

export function useUpdateStorageSpace() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<StorageSpace> }) =>
            updateStorageSpace(id, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['storage-space', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['location-details'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

export function useDeleteStorageSpace() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteStorageSpace,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['storage-space'] });
            queryClient.invalidateQueries({ queryKey: ['location-details'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

