"use server";

import { createServerSupabaseClient } from '../server';
import { clerkClient } from '@clerk/nextjs/server';
import { User, OrgInvite } from '../types';

interface CreateInvitationInput {
    organizationId: string;
    email: string;
    role: 'admin' | 'employee' | 'super_admin';
    assigned_location_id?: string | null;
    assigned_location_ids?: string[];
    first_name?: string;
    last_name?: string;
}

export async function createInvitation(input: CreateInvitationInput) {
    try {
        const supabase = await createServerSupabaseClient();
        const clerk = await clerkClient();

        if (input.role === 'employee' && !input.assigned_location_id) {
            throw new Error('Location is required for employees');
        }

        const { data: existingInvite } = await supabase
            .from('org_invites')
            .select('id')
            .eq('email', input.email)
            .eq('organization_id', input.organizationId)
            .in('status', ['pending', 'accepted'])
            .single();

        if (existingInvite) {
            throw new Error('An invitation has already been sent to this email');
        }

        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', input.email)
            .single();

        if (existingUser) {
            throw new Error('A user with this email already exists');
        }

        // super_admin and admin both map to org:admin in Clerk.
        // Fine-grained role is stored in our DB only.
        const clerkRole = input.role === 'employee' ? 'org:member' : 'org:admin';

        const clerkInvite = await clerk.organizations.createOrganizationInvitation({
            organizationId: input.organizationId,
            emailAddress: input.email,
            role: clerkRole,
            publicMetadata: {
                organizationId: input.organizationId,
                role: input.role,
                assigned_location_id: input.assigned_location_id || null,
                assigned_location_ids: input.assigned_location_ids || [],
                first_name: input.first_name || null,
                last_name: input.last_name || null,
            },
        });

        const { data: invite, error: inviteError } = await supabase
            .from('org_invites')
            .insert({
                clerk_invite_id: clerkInvite.id,
                organization_id: input.organizationId,
                email: input.email,
                status: 'pending',
                role: input.role,
                assigned_location_id: input.assigned_location_id || null,
            })
            .select()
            .single();

        if (inviteError) throw inviteError;

        return {
            success: true,
            message: 'Invitation sent successfully!',
            invitationId: invite.id,
        };
    } catch (error: any) {
        console.error('Error creating invitation:', error);
        return {
            success: false,
            message: error.message || 'Failed to create invitation',
        };
    }
}

interface UpdateUserInput {
    userId: string;
    role?: 'admin' | 'employee' | 'super_admin';
    assigned_location_id?: string | null;       // employees only (one row in junction table)
    assigned_location_ids?: string[];           // admins only (multiple rows in junction table)
    is_active?: boolean;
}

export async function updateUser(input: UpdateUserInput) {
    try {
        const supabase = await createServerSupabaseClient();

        const updates: Partial<User> = {};

        if (input.role !== undefined) {
            updates.role = input.role;
        }

        if (input.is_active !== undefined) {
            updates.is_active = input.is_active;
        }

        // Update the users table (location is stored in user_location_assignments, not here)
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', input.userId)
            .select('*');

        if (error) throw error;

        // Sync role change to Clerk so session claims reflect the new role immediately
        if (input.role !== undefined) {
            const clerk = await clerkClient();

            // 1. Update publicMetadata.role — picked up by the JWT template → sessionClaims.o.rol
            await clerk.users.updateUser(input.userId, {
                publicMetadata: { role: input.role },
            });

            // 2. Update the Clerk org membership role (org:admin vs org:member)
            //    Fetch organizationId from the members table since it's not in the input
            const { data: member } = await supabase
                .from('members')
                .select('organization_id')
                .eq('user_id', input.userId)
                .single();

            if (member?.organization_id) {
                const clerkOrgRole = input.role === 'employee' ? 'org:member' : 'org:admin';
                await clerk.organizations.updateOrganizationMembership({
                    organizationId: member.organization_id,
                    userId: input.userId,
                    role: clerkOrgRole,
                });
            }
        }

        // Clear all existing location assignments, then re-insert based on role
        const { error: deleteError } = await supabase
            .from('user_location_assignments')
            .delete()
            .eq('user_id', input.userId);

        if (deleteError) throw deleteError;

        if (input.role === 'employee' && input.assigned_location_id) {
            // Employee: exactly one row in the junction table
            const { error: insertError } = await supabase
                .from('user_location_assignments')
                .insert({ user_id: input.userId, location_id: input.assigned_location_id });

            if (insertError) throw insertError;
        } else if (input.role === 'admin') {
            // Admin: one row per assigned location
            const locationIds = input.assigned_location_ids ?? [];
            if (locationIds.length > 0) {
                const rows = locationIds.map((location_id) => ({
                    user_id: input.userId,
                    location_id,
                }));

                const { error: insertError } = await supabase
                    .from('user_location_assignments')
                    .insert(rows);

                if (insertError) throw insertError;
            }
        }
        // super_admin: no junction rows (cleared above)

        return {
            success: true,
            message: 'User updated successfully!',
            user: data,
        };
    } catch (error: any) {
        console.error('Error updating user:', error);
        return {
            success: false,
            message: error.message || 'Failed to update user',
        };
    }
}

interface CancelInvitationInput {
    clerkInviteId: string;
}

export async function cancelInvitation(input: CancelInvitationInput) {
    try {
        const supabase = await createServerSupabaseClient();
        const clerk = await clerkClient();

        const { data: invite, error: inviteError } = await supabase
            .from('org_invites')
            .select('organization_id')
            .eq('clerk_invite_id', input.clerkInviteId)
            .single();

        if (inviteError || !invite) {
            throw new Error('Invitation not found');
        }

        try {
            await clerk.organizations.revokeOrganizationInvitation({
                organizationId: invite.organization_id,
                invitationId: input.clerkInviteId,
            });
        } catch (clerkError: any) {
            console.warn('Clerk invitation revocation warning:', clerkError.message);
        }

        await supabase
            .from('org_invites')
            .update({ status: 'cancelled' })
            .eq('clerk_invite_id', input.clerkInviteId);

        return { success: true, message: 'Invitation cancelled successfully!' };
    } catch (error: any) {
        console.error('Error cancelling invitation:', error);
        return { success: false, message: error.message || 'Failed to cancel invitation' };
    }
}

export async function resendInvitation(invitationId: string) {
    try {
        const supabase = await createServerSupabaseClient();
        const clerk = await clerkClient();

        const { data: invite, error: inviteError } = await supabase
            .from('org_invites')
            .select('*')
            .eq('id', invitationId)
            .single();

        if (inviteError || !invite) {
            throw new Error('Invitation not found');
        }

        if (invite.clerk_invite_id) {
            try {
                await clerk.organizations.revokeOrganizationInvitation({
                    organizationId: invite.organization_id,
                    invitationId: invite.clerk_invite_id,
                });
            } catch (e) {
                // Ignore if already revoked
            }
        }

        const clerkRole = invite.role === 'employee' ? 'org:member' : 'org:admin';

        const clerkInvite = await clerk.organizations.createOrganizationInvitation({
            organizationId: invite.organization_id,
            emailAddress: invite.email,
            role: clerkRole,
            publicMetadata: {
                organizationId: invite.organization_id,
                role: invite.role,
                assigned_location_id: invite.assigned_location_id || null,
            },
        });

        const { error: updateError } = await supabase
            .from('org_invites')
            .update({
                clerk_invite_id: clerkInvite.id,
                status: 'pending',
                created_at: new Date().toISOString(),
            })
            .eq('id', invitationId);

        if (updateError) throw updateError;

        return { success: true, message: 'Invitation resent successfully!' };
    } catch (error: any) {
        console.error('Error resending invitation:', error);
        return { success: false, message: error.message || 'Failed to resend invitation' };
    }
}