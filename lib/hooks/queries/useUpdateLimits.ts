import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getUpdateLimit,
    getUpdateLimitsByLocation,
    createUpdateLimit,
    updateUpdateLimit,
    deleteUpdateLimit,
    checkUpdateAllowed,
    createOverrideLog,
    type UpdateLimit,
    type UpdateLimitInput,
    type CheckUpdateAllowedResult,
} from '@/lib/supabase/queries/updateLimits';

export function useUpdateLimit(locationId: string | null, storageSpaceId: string | null) {
    return useQuery({
        queryKey: ['update-limit', locationId, storageSpaceId],
        queryFn: () => getUpdateLimit(locationId!, storageSpaceId),
        enabled: !!locationId,
    });
}

export function useUpdateLimitsByLocation(locationId: string | null) {
    return useQuery({
        queryKey: ['update-limits', locationId],
        queryFn: () => getUpdateLimitsByLocation(locationId!),
        enabled: !!locationId,
    });
}

export function useCreateUpdateLimit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: UpdateLimitInput) => createUpdateLimit(input),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['update-limits', variables.location_id] });
            queryClient.invalidateQueries({ queryKey: ['update-limit'] });
        },
    });
}

export function useUpdateUpdateLimit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<UpdateLimitInput> }) =>
            updateUpdateLimit(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['update-limits'] });
            queryClient.invalidateQueries({ queryKey: ['update-limit'] });
        },
    });
}

export function useDeleteUpdateLimit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteUpdateLimit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['update-limits'] });
            queryClient.invalidateQueries({ queryKey: ['update-limit'] });
        },
    });
}

export function useCheckUpdateAllowed(
    itemId: string | null,
    locationId: string | null,
    storageSpaceId: string | null,
    userId: string | null
) {
    return useQuery({
        queryKey: ['check-update-allowed', itemId, locationId, storageSpaceId, userId],
        queryFn: () => checkUpdateAllowed(itemId!, locationId!, storageSpaceId, userId!),
        enabled: !!itemId && !!locationId && !!userId,
        staleTime: 10 * 1000, // 10 seconds
    });
}

export function useCreateOverrideLog() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            inventory_log_id: string;
            item_id: string;
            location_id: string;
            storage_space_id: string | null;
            admin_user_id: string;
            employee_user_id?: string | null;
            override_reason?: string | null;
        }) => createOverrideLog(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
        },
    });
}

