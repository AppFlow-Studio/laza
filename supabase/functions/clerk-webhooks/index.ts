import { createClient } from 'npm:@supabase/supabase-js'
import { verifyWebhook } from 'npm:@clerk/backend/webhooks'

Deno.serve(async (req) => {
  // Verify webhook signature
  const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET')

  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  const event = await verifyWebhook(req, { signingSecret: webhookSecret })

  // Create supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response('Supabase credentials not configured', { status: 500 })
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  switch (event.type) {
    case 'user.created': {
      // Handle user creation
      // Extract metadata from publicMetadata
      const publicMetadata = event.data.public_metadata || {}
      const organizationId = publicMetadata.organizationId
      const role = publicMetadata.role || null
      const assignedLocationId = publicMetadata.assigned_location_id || null

      // Insert user
      const { data: user, error } = await supabase
        .from('users')
        .insert([
          {
            id: event.data.id,
            email: event.data.email_addresses?.[0]?.email_address || '',
            first_name: event.data.first_name,
            last_name: event.data.last_name,
            avatar_url: event.data.image_url,
            role: role,
            assigned_location_id: assignedLocationId,
            is_active: true,
            created_at: new Date(event.data.created_at).toISOString(),
            updated_at: new Date(event.data.updated_at).toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      // If organizationId exists, create member record
      if (organizationId) {
        // Note: The members record will be created by organizationMembership.created event
        // But we can also create it here if needed
      }

      return new Response(JSON.stringify({ user }), { status: 200 })
    }

    case 'user.updated': {
      // Handle user update
      const publicMetadata = event.data.public_metadata || {}
      const role = publicMetadata.role || null
      const assignedLocationId = publicMetadata.assigned_location_id || null

      const { data: user, error } = await supabase
        .from('users')
        .update({
          email: event.data.email_addresses?.[0]?.email_address || '',
          first_name: event.data.first_name,
          last_name: event.data.last_name,
          avatar_url: event.data.image_url,
          role: role,
          assigned_location_id: assignedLocationId,
          updated_at: new Date(event.data.updated_at).toISOString(),
        })
        .eq('id', event.data.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      return new Response(JSON.stringify({ user }), { status: 200 })
    }

    case 'organization.created': {
      // Handle organization creation
      const { data, error } = await supabase
        .from('organizations')
        .insert([
          {
            id: event.data.id,
            name: event.data.name,
            created_at: new Date(event.data.created_at).toISOString(),
            updated_at: new Date(event.data.updated_at).toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Error updating owner:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      return new Response(JSON.stringify({ data }), { status: 200 })
    }

    case 'organization.updated': {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: event.data.name,
          updated_at: new Date(event.data.updated_at).toISOString(),
        })
        .eq('id', event.data.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating owner:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      return new Response(JSON.stringify({ data }), { status: 200 })
    }

    case 'organizationMembership.created': {
      const { data, error } = await supabase
        .from('members')
        .insert([
          {
            id: event.data.id,
            user_id: event.data.public_user_data?.user_id,
            organization_id: event.data.organization?.id,
            created_at: new Date(event.data.created_at).toISOString(),
            updated_at: new Date(event.data.updated_at).toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('Error updating member:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      return new Response(JSON.stringify({ data }), { status: 200 })
    }

    case 'organizationMembership.updated': {
      const { data, error } = await supabase
        .from('members')
        .update({
          user_id: event.data.public_user_data?.user_id,
          organization_id: event.data.organization?.id,
          updated_at: new Date(event.data.updated_at).toISOString(),
        })
        .eq('id', event.data.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating member:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      return new Response(JSON.stringify({ data }), { status: 200 })
    }

    case 'organizationInvitation.accepted': {
      // Handle invitation acceptance
      const invitationId = event.data.id
      const userId = event.data.public_user_data?.user_id
      const organizationId = event.data.organization?.id

      // Update org_invites table
      const { error: inviteError } = await supabase
        .from('org_invites')
        .update({
          status: 'accepted',
          clerk_user_id: userId,
          accepted_at: new Date().toISOString(),
        })
        .eq('clerk_invite_id', invitationId)

      if (inviteError) {
        console.error('Error updating invitation:', inviteError)
        return new Response(JSON.stringify({ error: inviteError.message }), { status: 500 })
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    case 'organizationInvitation.revoked': {
      // Handle invitation revocation
      const invitationId = event.data.id
      const userId = event.data.public_user_data?.user_id
      const organizationId = event.data.organization?.id

      // Update org_invites table
      const { error: inviteError } = await supabase
        .from('org_invites')
        .update({
          status: 'cancelled',
        })
        .eq('clerk_invite_id', invitationId)

      if (inviteError) {
        console.error('Error updating invitation:', inviteError)
        return new Response(JSON.stringify({ error: inviteError.message }), { status: 500 })
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    case 'user.deleted': {
      // Soft delete: Set is_active = false
      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.data.id)

      if (error) {
        console.error('Error soft deleting user:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
      }

      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }

    default: {
      // Unhandled event type
      console.log('Unhandled event type:', JSON.stringify(event, null, 2))
      return new Response(JSON.stringify({ success: true }), { status: 200 })
    }
  }
})