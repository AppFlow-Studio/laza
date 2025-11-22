'use server';

import { createServerSupabaseClient } from '../server';

export async function getAllCategories() {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('category')
        .select('*');
    if (error) throw error;
    return data as any[];
}