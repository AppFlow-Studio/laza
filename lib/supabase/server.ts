import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Existing client — uses Clerk JWT, RLS applies
export function createServerSupabaseClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            async accessToken() {
                return (await auth()).getToken()
            },
        },
    )
}

// Service role client — bypasses RLS, use only in server actions
export function createServiceRoleClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
}