import { createClient } from '@supabase/supabase-js'

/**
 * Resolves the role used for routing.
 *
 * A user is treated as super admin when their Clerk org role is `admin` and
 * their row in Supabase `users` has role `super_admin`. A Clerk `super_admin`
 * org role is still honoured as-is. Any lookup failure falls back to the Clerk
 * role, so a DB hiccup never grants super admin access.
 */
export async function resolveEffectiveRole(
    userId: string | null,
    clerkRole: string | undefined,
): Promise<string | undefined> {
    if (!userId || clerkRole !== 'admin') return clerkRole

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } },
        )
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .maybeSingle()

        if (error) throw error
        return data?.role === 'super_admin' ? 'super_admin' : clerkRole
    } catch (err) {
        console.error('[resolveEffectiveRole] Falling back to Clerk role:', err)
        return clerkRole
    }
}
