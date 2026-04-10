import { createClient } from "npm:@supabase/supabase-js";
import { verifyWebhook } from "npm:@clerk/backend/webhooks";

Deno.serve(async (req) => {
    // Verify webhook signature
    const webhookSecret = Deno.env.get("CLERK_WEBHOOK_SECRET");

    if (!webhookSecret) {
        return new Response("Webhook secret not configured", { status: 500 });
    }

    const event = await verifyWebhook(req, { signingSecret: webhookSecret });

    // Create supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
        return new Response("Supabase credentials not configured", {
            status: 500,
        });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
        case "user.created": {
            // Handle user creation
            const publicMetadata = event.data.public_metadata || {};
            const role = publicMetadata.role || null;
            const assignedLocationId =
                publicMetadata.assigned_location_id || null;

            // Insert user (no assigned_location_id — stored in junction table)
            const { data: user, error } = await supabase
                .from("users")
                .insert([
                    {
                        id: event.data.id,
                        email:
                            event.data.email_addresses?.[0]?.email_address ||
                            "",
                        first_name: event.data.first_name,
                        last_name: event.data.last_name,
                        avatar_url: event.data.image_url,
                        role: role,
                        is_active: true,
                        created_at: new Date(
                            event.data.created_at,
                        ).toISOString(),
                        updated_at: new Date(
                            event.data.updated_at,
                        ).toISOString(),
                    },
                ])
                .select()
                .single();

            if (error) {
                console.error("Error creating user:", error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                });
            }

            // If employee with a location, create junction row
            if (role === "employee" && assignedLocationId) {
                await supabase
                    .from("user_location_assignments")
                    .insert({ user_id: event.data.id, location_id: assignedLocationId });
            }

            return new Response(JSON.stringify({ user }), { status: 200 });
        }

        case "user.updated": {
            // Handle user update (profile fields only — location managed via membership events)
            const { data: user, error } = await supabase
                .from("users")
                .update({
                    email: event.data.email_addresses?.[0]?.email_address || "",
                    first_name: event.data.first_name,
                    last_name: event.data.last_name,
                    avatar_url: event.data.image_url,
                    updated_at: new Date(event.data.updated_at).toISOString(),
                })
                .eq("id", event.data.id)
                .select()
                .single();

            if (error) {
                console.error("Error updating user:", error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                });
            }

            return new Response(JSON.stringify({ user }), { status: 200 });
        }

        case "organization.created": {
            // Handle organization creation
            const { data, error } = await supabase
                .from("organizations")
                .insert([
                    {
                        id: event.data.id,
                        name: event.data.name,
                        created_at: new Date(
                            event.data.created_at,
                        ).toISOString(),
                        updated_at: new Date(
                            event.data.updated_at,
                        ).toISOString(),
                    },
                ])
                .select()
                .single();

            if (error) {
                console.error("Error updating owner:", error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                });
            }

            return new Response(JSON.stringify({ data }), { status: 200 });
        }

        case "organization.updated": {
            const { data, error } = await supabase
                .from("organizations")
                .update({
                    name: event.data.name,
                    updated_at: new Date(event.data.updated_at).toISOString(),
                })
                .eq("id", event.data.id)
                .select()
                .single();

            if (error) {
                console.error("Error updating owner:", error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                });
            }

            return new Response(JSON.stringify({ data }), { status: 200 });
        }

        case "organizationMembership.created": {
            const { data, error } = await supabase
                .from("members")
                .insert([
                    {
                        id: event.data.id,
                        user_id: event.data.public_user_data?.user_id,
                        organization_id: event.data.organization?.id,
                        created_at: new Date(
                            event.data.created_at,
                        ).toISOString(),
                        updated_at: new Date(
                            event.data.updated_at,
                        ).toISOString(),
                    },
                ])
                .select()
                .single();

            // Extract and validate role — must be one of three valid values
            const clerkRole = event.data.role as string;
            const roleMap: Record<string, string> = {
                "org:super_admin": "super_admin",
                "org:admin": "admin",
                "org:member": "employee",
            };
            const role =
                roleMap[clerkRole] ?? event.data.public_metadata?.role ?? null;

            // GUARD: super_admin is assigned manually via direct DB update only.
            // If somehow super_admin comes through here, downgrade to admin.
            // Never allow privilege escalation through membership events.
            const safeRole = role === "super_admin" ? "admin" : role;

            // Sync role and location to users table
            const userId = event.data.public_user_data?.user_id;
            const assignedLocationId =
                event.data.public_metadata?.assigned_location_id || null;
            const assignedLocationIds: string[] =
                event.data.public_metadata?.assigned_location_ids ?? [];

            const { data: userData, error: userError } = await supabase
                .from("users")
                .update({ role: safeRole })
                .eq("id", userId)
                .select()
                .single();

            if (userData) {
                console.log("User updated with role:", safeRole, userData);
            }

            if (userError) {
                console.error("Error updating user:", userError);
                return new Response(
                    JSON.stringify({ error: userError.message }),
                    { status: 500 },
                );
            }

            // Sync user_location_assignments for all roles
            if (userId) {
                // Clear existing assignments first
                await supabase
                    .from("user_location_assignments")
                    .delete()
                    .eq("user_id", userId);

                if (role === "employee" && assignedLocationId) {
                    // Employee: exactly one junction row
                    const { error: assignError } = await supabase
                        .from("user_location_assignments")
                        .insert({ user_id: userId, location_id: assignedLocationId });

                    if (assignError) {
                        console.error("Error inserting location assignment:", assignError);
                    }
                } else if (role === "admin" && assignedLocationIds.length > 0) {
                    // Admin: one row per location
                    const { error: assignError } = await supabase
                        .from("user_location_assignments")
                        .insert(
                            assignedLocationIds.map((location_id: string) => ({
                                user_id: userId,
                                location_id,
                            })),
                        );

                    if (assignError) {
                        console.error("Error inserting location assignments:", assignError);
                    }
                }
                // super_admin: no junction rows
            }

            if (error) {
                console.error("Error creating member:", error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                });
            }

            return new Response(JSON.stringify({ data }), { status: 200 });
        }

        case "organizationMembership.updated": {
            // Update members table
            const { data, error } = await supabase
                .from("members")
                .update({
                    user_id: event.data.public_user_data?.user_id,
                    organization_id: event.data.organization?.id,
                    updated_at: new Date(event.data.updated_at).toISOString(),
                })
                .eq("id", event.data.id)
                .select()
                .single();

            if (error) {
                console.error("Error updating member:", error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                });
            }

            // Sync role change to users table
            const clerkRole = event.data.role as string;
            const roleMap: Record<string, string> = {
                "org:super_admin": "super_admin",
                "org:admin": "admin",
                "org:member": "employee",
            };
            const role =
                roleMap[clerkRole] ?? event.data.public_metadata?.role ?? null;

            // GUARD: Prevent escalation to super_admin via webhook
            // Only allow super_admin role sync if the target user is already super_admin
            // This prevents a compromised admin account from promoting via Clerk dashboard
            if (role === "super_admin") {
                const { data: targetUser } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", event.data.public_user_data?.user_id)
                    .single();

                if (targetUser?.role !== "super_admin") {
                    console.warn(
                        "Blocked attempt to escalate user to super_admin via webhook:",
                        event.data.public_user_data?.user_id,
                    );
                    return new Response(
                        JSON.stringify({
                            error: "Role escalation to super_admin is not permitted via webhook",
                        }),
                        { status: 403 },
                    );
                }
            }

            const { data: userData, error: userError } = await supabase
                .from("users")
                .update({
                    role: role,
                    updated_at: new Date(event.data.updated_at).toISOString(),
                })
                .eq("id", event.data.public_user_data?.user_id)
                .select()
                .single();

            if (userData) {
                console.log(
                    "User role synced on membership update:",
                    role,
                    userData,
                );
            }

            if (userError) {
                console.error("Error syncing user role:", userError);
                return new Response(
                    JSON.stringify({ error: userError.message }),
                    { status: 500 },
                );
            }

            // Sync user_location_assignments on membership update
            const updatedUserId = event.data.public_user_data?.user_id;
            const updatedLocationId: string | null =
                event.data.public_metadata?.assigned_location_id || null;
            const updatedLocationIds: string[] =
                event.data.public_metadata?.assigned_location_ids ?? [];

            if (updatedUserId) {
                // Always clear existing assignments
                await supabase
                    .from("user_location_assignments")
                    .delete()
                    .eq("user_id", updatedUserId);

                if (role === "employee" && updatedLocationId) {
                    // Employee: exactly one junction row
                    const { error: assignError } = await supabase
                        .from("user_location_assignments")
                        .insert({ user_id: updatedUserId, location_id: updatedLocationId });

                    if (assignError) {
                        console.error("Error updating location assignment:", assignError);
                    }
                } else if (role === "admin" && updatedLocationIds.length > 0) {
                    // Admin: one row per location
                    const { error: assignError } = await supabase
                        .from("user_location_assignments")
                        .insert(
                            updatedLocationIds.map((location_id: string) => ({
                                user_id: updatedUserId,
                                location_id,
                            })),
                        );

                    if (assignError) {
                        console.error("Error updating location assignments:", assignError);
                    }
                }
                // super_admin: no junction rows
            }

            return new Response(JSON.stringify({ data }), { status: 200 });
        }

        case "organizationInvitation.accepted": {
            // Handle invitation acceptance
            const invitationId = event.data.id;
            const userId = event.data.public_user_data?.user_id;
            const organizationId = event.data.organization?.id;

            // Update org_invites table
            const { error: inviteError } = await supabase
                .from("org_invites")
                .update({
                    status: "accepted",
                    clerk_user_id: userId,
                    accepted_at: new Date().toISOString(),
                })
                .eq("clerk_invite_id", invitationId);

            if (inviteError) {
                console.error("Error updating invitation:", inviteError);
                return new Response(
                    JSON.stringify({ error: inviteError.message }),
                    { status: 500 },
                );
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
            });
        }

        case "organizationInvitation.revoked": {
            // Handle invitation revocation
            const invitationId = event.data.id;
            const userId = event.data.public_user_data?.user_id;
            const organizationId = event.data.organization?.id;

            // Update org_invites table
            const { error: inviteError } = await supabase
                .from("org_invites")
                .update({
                    status: "cancelled",
                })
                .eq("clerk_invite_id", invitationId);

            if (inviteError) {
                console.error("Error updating invitation:", inviteError);
                return new Response(
                    JSON.stringify({ error: inviteError.message }),
                    { status: 500 },
                );
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
            });
        }

        case "user.deleted": {
            // Soft delete: Set is_active = false
            const { error } = await supabase
                .from("users")
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", event.data.id);

            if (error) {
                console.error("Error soft deleting user:", error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                });
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
            });
        }

        default: {
            // Unhandled event type
            console.log(
                "Unhandled event type:",
                JSON.stringify(event, null, 2),
            );
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
            });
        }
    }
});