"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAllLocations,
    getLocationById,
    getLocationWithDetails,
    createLocation,
    updateLocation,
    deleteLocation,
    deactivateLocation,
    reactivateLocation,
} from '@/lib/supabase/queries/locations';
import { useUserInfo } from './useUserInfo';

export function useLocations() {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    return useQuery({
        queryKey: ['locations', organizationId],
        queryFn: () => getAllLocations(organizationId!),
        enabled: !!organizationId,
    });
}

export function useLocation(id: string | null) {
    return useQuery({
        queryKey: ['location', id],
        queryFn: () => getLocationById(id!),
        enabled: !!id,
    });
}

export function useLocationWithDetails(id: string | null) {
    return useQuery({
        queryKey: ['location-details', id],
        queryFn: () => getLocationWithDetails(id!),
        enabled: !!id,
    });
}

export function useCreateLocation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

export function useUpdateLocation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: any }) => updateLocation(id, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['location', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['location-details', variables.id] });
        },
    });
}

export function useDeleteLocation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

export function useDeactivateLocation() {
    const queryClient = useQueryClient();
    const { data: userInfo } = useUserInfo();

    return useMutation({
        mutationFn: (locationId: string) => {
            if (!userInfo?.id) throw new Error('User not authenticated');
            if (userInfo.role !== 'super_admin') throw new Error('Only super admin can deactivate locations');
            return deactivateLocation(locationId, userInfo.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}

export function useReactivateLocation() {
    const queryClient = useQueryClient();
    const { data: userInfo } = useUserInfo();

    return useMutation({
        mutationFn: (locationId: string) => {
            if (!userInfo?.id) throw new Error('User not authenticated');
            if (userInfo.role !== 'super_admin') throw new Error('Only super admin can reactivate locations');
            return reactivateLocation(locationId, userInfo.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}