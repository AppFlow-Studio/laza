"use server";

import { createServerSupabaseClient } from '../server';
import { Item } from '../types';
import { auth } from '@clerk/nextjs/server';
export async function getAllItems(organizationId: string) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('items')
        .select(
            `
            *,
            category(*)
            `
        )
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
    if (error) {
        throw error
    };
    return data as Item[];
}

export async function getItemById(id: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('getItemById error', error);
        throw error
    };
    return data as Item;
}

export async function getItemsByCategory(category: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('category_id', category)
        .order('name', { ascending: true });

    if (error) throw error;
    return data as Item[];
}

export async function searchItems(query: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .order('name', { ascending: true });

    if (error) throw error;
    return data as Item[];
}

export async function createItem(item: {
    organization_id: string;
    name: string;
    sku?: string | null;
    category_id: number | null;
    unit_of_measure: 'pcs' | 'kg' | 'liters' | 'lbs' | 'oz';
    min_quantity: number;
}) {
    console.log(item);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('items')
        .insert(item)
        .select()
        .single();

    if (error) throw error;
    return data as Item;
}

export async function updateItem(id: string, updates: Partial<Item>) {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .select()

    if (error) throw error;

    return data;
}

export async function deleteItem(id: string) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function bulkUpdateItems(itemIds: string[], updates: Partial<Item>) {
    const supabase = await createServerSupabaseClient();

    // Only allow updating specific fields for bulk operations
    const allowedFields: (keyof Item)[] = ['min_quantity', 'category_id', 'unit_of_measure'];
    const filteredUpdates: Partial<Item> = {};

    for (const key of allowedFields) {
        if (updates[key] !== undefined) {
            filteredUpdates[key] = updates[key];
        }
    }

    if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
    }

    const { data, error } = await supabase
        .from('items')
        .update(filteredUpdates)
        .in('id', itemIds)
        .select();

    if (error) throw error;
    return data as Item[];
}

export async function bulkDeleteItems(itemIds: string[]) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
        .from('items')
        .delete()
        .in('id', itemIds);

    if (error) throw error;
}

