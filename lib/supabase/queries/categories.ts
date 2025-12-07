'use server';

import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '../server';

export async function getAllCategories() {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('category')
        .select(`
            *,
            items(id)
        `)
        .order('name', { ascending: true });
    if (error) throw error;

    // Transform data to include item count
    return (data || []).map((category: any) => ({
        ...category,
        item_count: category.items?.length || 0,
    }));
}

export async function getCategoryById(id: string) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('category')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data as any;
}

export async function createCategory(name: string, organization_id: string, description?: string | null) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('category')
        .insert({
            name,
            description: description || null,
            organization_id,
        })
        .select()
        .single();
    if (error) throw error;
    return data as any;
}

export async function updateCategory(id: string, updates: { name?: string; description?: string }) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('category')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data as any;
}

export async function deleteCategory(id: string) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
        .from('category')
        .delete()
        .eq('id', id);
    if (error) throw error;
}