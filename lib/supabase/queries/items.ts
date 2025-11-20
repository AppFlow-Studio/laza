import { createServerSupabaseClient } from '../server';
import { Item } from '../types';

export async function getAllItems() {
    const supabase =  createServerSupabaseClient();
    console.log('supabase', supabase);
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('getAllItems error', error);
        throw error
    };
    console.log(data)
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

export async function getItemsByCategory(category: 'desserts' | 'ingredients' | 'supplies') {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('category', category)
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
    category: 'desserts' | 'ingredients' | 'supplies';
    unit_of_measure: 'pcs' | 'kg' | 'liters' | 'lbs' | 'oz';
    min_quantity: number;
}) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('items')
        .insert([item])
        .select()
        .single();

    if (error) throw error;
    return data as Item;
}

export async function updateItem(id: string, updates: Partial<Item>) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Item;
}

export async function deleteItem(id: string) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

