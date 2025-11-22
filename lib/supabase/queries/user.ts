'use server';

import { createServerSupabaseClient } from '../server';

export async function getUserById(id: string | null) {
    if (!id) {
        return null;
    }
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('users')
        .select(`
            *,
            members(
                *,
                organizations(*)
            )
            `)
        .eq('id', id)
        .single();
    if (error) {
        console.error('getUserById error', error);
        throw error;
    }

    const cleanUser = {
        ...data,
        members: data.members?.[0] || null
    };

    return cleanUser;
}