"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAllLocations,
    getLocationById,
    getLocationWithDetails,
    createLocation,
    updateLocation,
    deleteLocation,
} from '@/lib/supabase/queries/locations';

export function useLocations() {
    return useQuery({
        queryKey: ['locations'],
        queryFn: getAllLocations,
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

