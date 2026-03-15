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
        mutationFn: ({
                         userId,
                         role,
                         assigned_location_id,
                         assigned_location_ids,
                         is_active,
                     }: {
            userId: string;
            role: 'admin' | 'employee' | 'super_admin';
            assigned_location_id?: string | null;
            assigned_location_ids?: string[];
            is_active: boolean;
        }) => updateUser({ userId, role, assigned_location_id, assigned_location_ids, is_active }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['organization-users'] });
            queryClient.invalidateQueries({ queryKey: ['user', variables.userId] });
        },
    });
}

export function useCancelInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ clerkInviteId }: { clerkInviteId: string }) =>
            cancelInvitation({ clerkInviteId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
        },
    });
}

export function useResendInvitation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (invitationId: string) => resendInvitation(invitationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
        },
    });
}