"use server";

import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '../server';
import { User, OrgInvite } from '../types';

export async function getOrganizationUsers(organizationId: string) {
    const supabase = createServiceRoleClient();

    const { userId } = await auth();
    if (!userId) return [];

    // Look up caller's role — bypasses RLS entirely
    const { data: caller } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .single();

    const callerRole = caller?.role;

    // Get caller's location from junction table
    const { data: callerAssignments } = await supabase
        .from('user_location_assignments')
        .select('location_id')
        .eq('user_id', userId);

    const callerLocationId = callerAssignments?.[0]?.location_id ?? null;

    // Fetch all org members, joining junction table for display and filtering
    const { data: members, error: membersError } = await supabase
        .from('members')
        .select(`
            *,
            users (
                *,
                user_location_assignments (
                    locations (id, name, address, location_type)
                )
            ),
            organizations (*)
        `)
        .eq('organization_id', organizationId);

    if (membersError) throw membersError;

    const allUsers = members
        ?.map((member: any) => {
            if (!member.users) return null;

            const assigned_locations: any[] =
                member.users.user_location_assignments
                    ?.map((a: any) => a.locations)
                    .filter(Boolean) ?? [];

            return {
                ...member.users,
                assigned_locations,
            };
        })
        .filter(Boolean) ?? [];

    // Super admin — sees everyone
    if (callerRole === 'super_admin') {
        return allUsers as UserWithAssignments[];
    }

    // Admin — sees users who share their location
    if (callerRole === 'admin' && callerLocationId) {
        const filtered = allUsers.filter((u: any) => {
            if (u.id === caller?.id) return true;
            if (u.role === 'employee' || u.role === 'admin') {
                return u.assigned_locations?.some((l: any) => l.id === callerLocationId);
            }
            return false;
        });
        return filtered as UserWithAssignments[];
    }

    // Fallback — only self
    return allUsers.filter((u: any) => u.id === userId) as UserWithAssignments[];
}

type UserWithAssignments = User & {
    assigned_locations: any[];
};

/** Returns the location IDs assigned to a user from the junction table. */
export async function getUserLocationAssignments(userId: string) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('user_location_assignments')
        .select('location_id')
        .eq('user_id', userId);

    if (error) throw error;
    return (data ?? []).map((row: { location_id: string }) => row.location_id);
}

export async function getPendingInvitations(organizationId: string) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('org_invites')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as OrgInvite[];
}
