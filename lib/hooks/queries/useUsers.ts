"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrganizationUsers, getPendingInvitations } from '@/lib/supabase/queries/users';
import { createInvitation, updateUser, cancelInvitation, resendInvitation } from '@/lib/supabase/mutations/users';

export function useOrganizationUsers(organizationId: string | null) {
    return useQuery({
        queryKey: ['organization-users', organizationId],
        queryFn: () => getOrganizationUsers(organizationId!),
        enabled: !!organizationId,
    });
}

export function usePendingInvitations(organizationId: string | null) {
    return useQuery({
        queryKey: ['pending-invitations', organizationId],
        queryFn: () => getPendingInvitations(organizationId!),
        enabled: !!organizationId,
    });
}

export function useCreateInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createInvitation,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['pending-invitations', variables.organizationId] });
        },
    });
}

export function useUpdateUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organization-users'] });
        },
    });
}

export function useCancelInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: cancelInvitation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
        },
    });
}

export function useResendInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resendInvitation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
        },
    });
}

