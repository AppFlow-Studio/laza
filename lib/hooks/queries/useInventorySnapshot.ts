"use client";

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInventorySnapshot, seedAllItemsToLocation, type SnapshotItem } from '@/lib/supabase/queries/inventorySnapshot';

// /**
//  * useCreateInventorySnapshot
//  *
//  * Mutation hook called at the end of the store onboarding steps.
//  * Creates item_locations rows with current_quantity = 0 and resolves
//  * the initial-setup low-stock alerts so the dashboard stays clean.
//  *
//  * Invalidates:
//  *   - inventory       — so storage space detail pages reflect the new rows
//  *   - alerts          — so low stock counts update
//  *   - inventoryLogs   — so the activity feed shows the initial-setup entry
//  */
export function useCreateInventorySnapshot() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
                         locationId,
                         userId,
                         items,
                     }: {
            locationId: string;
            userId: string;
            items: SnapshotItem[];
        }) => createInventorySnapshot(locationId, userId, items),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
        },
    });
}

export function useSeedAllItemsToLocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            locationId,
            organizationId,
            storageSpaceId,
            userId,
            alreadyAssignedItemIds,
        }: {
            locationId: string;
            organizationId: string;
            storageSpaceId: string;
            userId: string;
            alreadyAssignedItemIds?: string[];
        }) => seedAllItemsToLocation(locationId, organizationId, storageSpaceId, userId, alreadyAssignedItemIds),

        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['inventoryLogs'] });
        },
    });
}