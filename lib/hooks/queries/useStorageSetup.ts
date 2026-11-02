"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStorageSpace } from "@/lib/supabase/queries/locations";
import { bulkAssignItemsToStorage } from "@/lib/supabase/queries/inventory";
import { createStoreWithSetup } from "@/lib/supabase/queries/storeSetup";
import type { CreateStoreWithSetupInput } from "@/lib/supabase/queries/storeSetup";
import { useUser } from "@clerk/nextjs";
import { useUserInfo } from "./useUserInfo";

export function useCreateStorageSpace() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            location_id: string;
            name: string;
            temperature_type: "frozen" | "refrigerated" | "dry";
        }) => createStorageSpace(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["location-details", variables.location_id],
            });
            queryClient.invalidateQueries({ queryKey: ["locations"] });
        },
    });
}

export function useBulkAssignItems() {
    const queryClient = useQueryClient();
    const { data: userInfo } = useUserInfo();
    return useMutation({
        mutationFn: (data: {
            locationId: string;
            storageSpaceId: string;
            items: Array<{
                itemId: string;
                quantity: number;
                minQuantityOverride?: number | null;
            }>;
        }) => {
            if (!userInfo?.id) throw new Error("User not authenticated");
            return bulkAssignItemsToStorage(
                data.locationId,
                data.storageSpaceId,
                data.items,
                userInfo.id,
                userInfo.members?.organization_id,
                userInfo.role as "super_admin" | "admin" | "employee", // added
            );
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["location-details", variables.locationId],
            });
            queryClient.invalidateQueries({
                queryKey: ["inventory", variables.locationId],
            });
            queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
        },
    });
}

export function useCreateStoreWithSetup() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateStoreWithSetupInput) => createStoreWithSetup(input),
        onSuccess: (result) => {
            if (!result.ok) return;
            queryClient.invalidateQueries({ queryKey: ["locations"] });
            queryClient.invalidateQueries({ queryKey: ["location-details", result.locationId] });
            queryClient.invalidateQueries({ queryKey: ["inventory", result.locationId] });
        },
    });
}
