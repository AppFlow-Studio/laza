"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStorageSpace } from '@/lib/supabase/queries/locations';
import { bulkAssignItemsToStorage } from '@/lib/supabase/queries/inventory';
import { useUser } from '@clerk/nextjs';

export function useCreateStorageSpace() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { location_id: string; name: string; temperature_type: 'frozen' | 'refrigerated' | 'dry' }) =>
            createStorageSpace(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['location-details', variables.location_id] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

export function useBulkAssignItems() {
    const queryClient = useQueryClient();
    const { user } = useUser();

    return useMutation({
        mutationFn: (data: {
            locationId: string;
            storageSpaceId: string;
            items: Array<{ itemId: string; quantity: number }>;
        }) => {
            if (!user?.id) throw new Error('User not authenticated');
            return bulkAssignItemsToStorage(data.locationId, data.storageSpaceId, data.items, user.id);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['location-details', variables.locationId] });
            queryClient.invalidateQueries({ queryKey: ['inventory', variables.locationId] });
            queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
        },
    });
}

