"use server";

import { createServerSupabaseClient, createServiceRoleClient } from '../server';
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
    const allowedFields: (keyof Item)[] = ['min_quantity', 'category_id', 'unit_of_measure', 'is_warehouse_item'];
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

export async function bulkUpdateItemPrices(items: Array<{ id: number; cost_per_unit: number }>) {
    const supabase = await createServerSupabaseClient();

    const results = await Promise.all(
        items.map(({ id, cost_per_unit }) =>
            supabase.from('items').update({ cost_per_unit }).eq('id', id).select().single()
        )
    );

    const failed = results.find(r => r.error);
    if (failed?.error) throw failed.error;

    return results.map(r => r.data);
}

export async function bulkDeleteItems(itemIds: string[]) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
        .from('items')
        .delete()
        .in('id', itemIds);

    if (error) throw error;
}

// --- Super-admin mutations (service role — bypasses RLS) ---
// The /super-admin route is already Clerk-protected; these bypass RLS so that
// super_admin users (who share role='admin' in the DB) can still write after
// the A1 migration removes the generic admin write policies.

export async function superAdminCreateItem(item: {
    organization_id: string;
    name: string;
    sku?: string | null;
    category_id: number | null;
    unit_of_measure: 'pcs' | 'kg' | 'liters' | 'lbs' | 'oz';
    min_quantity: number;
    is_warehouse_item?: boolean;
    cbm_per_carton?: number | null;
}) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('items')
        .insert(item)
        .select()
        .single();

    if (error) throw error;
    return data as Item;
}

export async function superAdminUpdateItem(id: string, updates: Partial<Item> & { cbm_per_carton?: number | null }) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data;
}

export async function superAdminDeleteItem(id: string) {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function superAdminBulkUpdateItems(itemIds: string[], updates: Partial<Item>) {
    const supabase = createServiceRoleClient();

    const allowedFields: (keyof Item)[] = ['min_quantity', 'category_id', 'unit_of_measure', 'is_warehouse_item'];
    const filteredUpdates: Partial<Item> = {};
    for (const key of allowedFields) {
        if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
    }

    if (Object.keys(filteredUpdates).length === 0) throw new Error('No valid fields to update');

    const { data, error } = await supabase
        .from('items')
        .update(filteredUpdates)
        .in('id', itemIds)
        .select();

    if (error) throw error;
    return data as Item[];
}

export async function superAdminBulkDeleteItems(itemIds: string[]) {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
        .from('items')
        .delete()
        .in('id', itemIds);

    if (error) throw error;
}

export async function getSuperAdminItems(organizationId: string) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('items')
        .select(`*, category(*), item_warehouse_pricing(warehouse_transfer_price)`)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}
