'use server';

import { createServiceRoleClient } from '../server';

export async function getUserById(id: string | null) {
    if (!id) return null;

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('users')
        .select(`
            *,
            members(
                *,
                organizations(*)
            ),
            user_location_assignments(location_id)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('getUserById error', error);
        throw error;
    }

    // Derive assigned_location_id from the junction table (first row for employees)
    // so existing consumers keep working without changes.
    return {
        ...data,
        members: data.members?.[0] || null,
        assigned_location_id: data.user_location_assignments?.[0]?.location_id ?? null,
    };
}
