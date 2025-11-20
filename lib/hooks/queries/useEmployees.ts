"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAllEmployees,
    getEmployeeById,
    getEmployeesByLocation,
    updateEmployee,
    assignEmployeeToLocation,
    bulkAssignEmployees,
    activateEmployee,
} from '@/lib/supabase/queries/employees';

export function useEmployees() {
    return useQuery({
        queryKey: ['employees'],
        queryFn: getAllEmployees,
    });
}

export function useEmployee(id: string | null) {
    return useQuery({
        queryKey: ['employee', id],
        queryFn: () => getEmployeeById(id!),
        enabled: !!id,
    });
}

export function useEmployeesByLocation(locationId: string | null) {
    return useQuery({
        queryKey: ['employees', 'location', locationId],
        queryFn: () => getEmployeesByLocation(locationId!),
        enabled: !!locationId,
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: any }) => updateEmployee(id, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['employee', variables.id] });
        },
    });
}

export function useAssignEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ employeeId, locationId }: { employeeId: string; locationId: string | null }) =>
            assignEmployeeToLocation(employeeId, locationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
}

export function useBulkAssignEmployees() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ employeeIds, locationId }: { employeeIds: string[]; locationId: string | null }) =>
            bulkAssignEmployees(employeeIds, locationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
}

export function useActivateEmployee() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => activateEmployee(id, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
}

