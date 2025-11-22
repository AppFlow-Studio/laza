"use server";

import { createServerSupabaseClient } from '../server';
import { User, OrgInvite } from '../types';

export async function getOrganizationUsers(organizationId: string) {
    const supabase = await createServerSupabaseClient();

    // Get users through members table join with location info
    const { data: members, error: membersError } = await supabase
        .from('members')
        .select(`
            *,
            users (
                *,
                assigned_location:locations (*)
            ),
            organizations (*)
        `)
        .eq('organization_id', organizationId);

    if (membersError) throw membersError;

    // Extract users from members and flatten structure
    const users = members
        ?.map((member: any) => {
            if (!member.users) return null;
            return {
                ...member.users,
                assigned_location: member.users.assigned_location || null,
            };
        })
        .filter(Boolean) || [];

    return users as (User & { assigned_location?: any })[];
}

export async function getPendingInvitations(organizationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('org_invites')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as OrgInvite[];
}

