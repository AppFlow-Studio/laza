"use server";

import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from '../server';
import { User, OrgInvite } from '../types';

export async function getOrganizationUsers(organizationId: string) {
    const supabase = createServiceRoleClient();

    // Get the calling user's ID from Clerk — always reliable, no RLS dependency
    const { userId } = await auth();

    if (!userId) {
        return [];
    }

    // Look up caller's role and location using service role — bypasses RLS entirely
    const { data: caller } = await supabase
        .from('users')
        .select('id, role, assigned_location_id')
        .eq('id', userId)
        .single();

    const callerRole = caller?.role;
    const callerLocationId = caller?.assigned_location_id;

    // Fetch all org members
    const { data: members, error: membersError } = await supabase
        .from('members')
        .select(`
            *,
            users (
                *,
                assigned_location:locations (*),
                user_location_assignments (
                    location_id,
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

            const assigned_location_ids: string[] =
                member.users.user_location_assignments?.map(
                    (a: any) => a.location_id
                ) ?? [];

            const assigned_locations: any[] =
                member.users.user_location_assignments
                    ?.map((a: any) => a.locations)
                    .filter(Boolean) ?? [];

            return {
                ...member.users,
                assigned_location: member.users.assigned_location || null,
                assigned_location_ids,
                assigned_locations,
            };
        })
        .filter(Boolean) ?? [];

    // Super admin — sees everyone
    if (callerRole === 'super_admin') {
        return allUsers as UserWithAssignments[];
    }

    console.log(callerRole)

    // Admin — sees users at their location only
    if (callerRole === 'admin' && callerLocationId) {
        const filtered = allUsers.filter((u: any) => {
            if (u.id === caller?.id) return true;

            if (u.role === 'employee') {
                return u.assigned_location_id === callerLocationId;
            }

            if (u.role === 'admin') {
                return u.assigned_location_ids?.includes(callerLocationId);
            }

            return false;
        });

        return filtered as UserWithAssignments[];
    }

    // Fallback
    return allUsers.filter((u: any) => u.id === userId) as UserWithAssignments[];
}

type UserWithAssignments = User & {
    assigned_location?: any;
    assigned_location_ids: string[];
    assigned_locations: any[];
};

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