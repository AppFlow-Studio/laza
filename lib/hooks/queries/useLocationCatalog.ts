"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getLocationCatalog,
    assignItemsToLocationCatalog,
    removeItemFromLocationCatalog,
} from "@/lib/supabase/queries/locationCatalog";
import { useUserInfo } from "./useUserInfo";

// Get all items approved for a location
// Admins use this to know what they can assign to storage spaces
export function useLocationCatalog(locationId: string) {
    return useQuery({
        queryKey: ["location-catalog", locationId],
        queryFn: () => getLocationCatalog(locationId),
        enabled: !!locationId,
        staleTime: 5 * 60 * 1000, // 5 min — catalog changes rarely
    });
}

// Super admin only — assign items to a location catalog
export function useAssignItemsToLocationCatalog() {
    const queryClient = useQueryClient();
    const { data: userInfo } = useUserInfo();

    return useMutation({
        mutationFn: (data: { locationId: string; itemIds: number[] }) => {
            if (!userInfo?.id) throw new Error("User not authenticated");
            if (userInfo.role !== "super_admin")
                throw new Error(
                    "Only super admins can assign items to a location catalog",
                );
            return assignItemsToLocationCatalog(
                data.locationId,
                data.itemIds,
                userInfo.id,
            );
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["location-catalog", variables.locationId],
            });
            queryClient.invalidateQueries({
                queryKey: ["location-details", variables.locationId],
            });
        },
    });
}

// Super admin only — remove an item from a location catalog
export function useRemoveItemFromLocationCatalog() {
    const queryClient = useQueryClient();
    const { data: userInfo } = useUserInfo();

    return useMutation({
        mutationFn: (data: { locationId: string; itemId: number }) => {
            if (!userInfo?.id) throw new Error("User not authenticated");
            if (userInfo.role !== "super_admin")
                throw new Error(
                    "Only super admins can remove items from a location catalog",
                );
            return removeItemFromLocationCatalog(data.locationId, data.itemId);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["location-catalog", variables.locationId],
            });
            queryClient.invalidateQueries({
                queryKey: ["location-details", variables.locationId],
            });
        },
    });
}