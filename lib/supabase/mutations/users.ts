"use server";

import { createServerSupabaseClient } from '../server';
import { clerkClient } from '@clerk/nextjs/server';
import { User, OrgInvite } from '../types';

interface CreateInvitationInput {
    organizationId: string;
    email: string;
    role: 'admin' | 'employee';
    assigned_location_id?: string | null;
    first_name?: string;
    last_name?: string;
}

export async function createInvitation(input: CreateInvitationInput) {
    try {
        const supabase = await createServerSupabaseClient();
        const clerk = await clerkClient();

        // Validate employee has location
        if (input.role === 'employee' && !input.assigned_location_id) {
            throw new Error('Location is required for employees');
        }

        // Check if email is already invited
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

        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', input.email)
            .single();

        if (existingUser) {
            throw new Error('A user with this email already exists');
        }

        // Create Clerk invitation
        const clerkInvite = await clerk.organizations.createOrganizationInvitation({
            organizationId: input.organizationId,
            emailAddress: input.email,
            role: input.role == 'admin' ? 'org:admin' : 'org:member',
            publicMetadata: {
                organizationId: input.organizationId,
                role: input.role,
                assigned_location_id: input.assigned_location_id || null,
                first_name: input.first_name || null,
                last_name: input.last_name || null,
            },
        });

        // Insert into org_invites table
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
    role?: 'admin' | 'employee';
    assigned_location_id?: string | null;
    is_active?: boolean;
}

export async function updateUser(input: UpdateUserInput) {
    console.log('updateUser', input);
    try {
        const supabase = createServerSupabaseClient();

        const updates: Partial<User> = {};

        if (input.role !== undefined) {
            updates.role = input.role;
            // Clear location if changing to admin
            if (input.role === 'admin') {
                updates.assigned_location_id = null;
            }
        }

        if (input.assigned_location_id !== undefined) {
            updates.assigned_location_id = input.assigned_location_id;
        }

        if (input.is_active !== undefined) {
            updates.is_active = input.is_active;
        }

        console.log('updates', updates);
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', input.userId)
            .select('*');

        if (error) throw error;

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
    console.log('cancelInvitation', input);
    try {
        const supabase = await createServerSupabaseClient();
        const clerk = await clerkClient();
        // Get invitation to get organizationId
        const { data: invite, error: inviteError } = await supabase
            .from('org_invites')
            .select('organization_id')
            .eq('clerk_invite_id', input.clerkInviteId)
            .single();

        if (inviteError || !invite) {
            throw new Error('Invitation not found');
        }

        // Revoke Clerk invitation
        try {
            await clerk.organizations.revokeOrganizationInvitation({
                organizationId: invite.organization_id,
                invitationId: input.clerkInviteId,
            });
        } catch (clerkError: any) {
            // If invitation already revoked or doesn't exist, continue
            console.warn('Clerk invitation revocation warning:', clerkError.message);
        }

        return {
            success: true,
            message: 'Invitation cancelled successfully!',
        };
    } catch (error: any) {
        console.error('Error cancelling invitation:', error);
        return {
            success: false,
            message: error.message || 'Failed to cancel invitation',
        };
    }
}

export async function resendInvitation(invitationId: string) {
    try {
        const supabase = await createServerSupabaseClient();
        const clerk = await clerkClient();
        // Get existing invitation
        const { data: invite, error: inviteError } = await supabase
            .from('org_invites')
            .select('*')
            .eq('id', invitationId)
            .single();

        if (inviteError || !invite) {
            throw new Error('Invitation not found');
        }

        // Cancel old invitation first
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

        // Create new Clerk invitation
        const clerkInvite = await clerk.organizations.createOrganizationInvitation({
            organizationId: invite.organization_id,
            emailAddress: invite.email,
            role: invite.role == 'admin' ? 'org:admin' : 'org:member',
            publicMetadata: {
                organizationId: invite.organization_id,
                role: invite.role,
                assigned_location_id: invite.assigned_location_id || null,
            },
        });

        // Update org_invites with new clerk_invite_id
        const { error: updateError } = await supabase
            .from('org_invites')
            .update({
                clerk_invite_id: clerkInvite.id,
                status: 'pending',
                created_at: new Date().toISOString(),
            })
            .eq('id', invitationId);

        if (updateError) throw updateError;

        return {
            success: true,
            message: 'Invitation resent successfully!',
        };
    } catch (error: any) {
        console.error('Error resending invitation:', error);
        return {
            success: false,
            message: error.message || 'Failed to resend invitation',
        };
    }
}

