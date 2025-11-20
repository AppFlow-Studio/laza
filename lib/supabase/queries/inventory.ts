import { createServerSupabaseClient } from '../server';
import { ItemLocation, InventoryLog, Alert } from '../types';

export async function getInventoryByLocation(locationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('item_locations')
        .select(`
      *,
      items (*),
      storage_spaces (*)
    `)
        .eq('location_id', locationId);

    if (error) throw error;
    return data as any[];
}

export async function getInventoryByItemAndLocation(itemId: string, locationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('item_locations')
        .select('*')
        .eq('item_id', itemId)
        .eq('location_id', locationId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as ItemLocation | null;
}

export async function updateQuantity(
    itemId: string,
    locationId: string,
    storageSpaceId: string | null,
    newQuantity: number,
    userId: string,
    actionType: 'count' | 'adjustment' | 'received' | 'used',
    notes?: string
) {
    const supabase = await createServerSupabaseClient();

    // Get current quantity
    const { data: current } = await supabase
        .from('item_locations')
        .select('current_quantity')
        .eq('item_id', itemId)
        .eq('location_id', locationId)
        .eq('storage_space_id', storageSpaceId)
        .single();

    const previousQuantity = current?.current_quantity || 0;
    const quantityChange = newQuantity - previousQuantity;

    // Upsert item_location
    const { data: itemLocation, error: upsertError } = await supabase
        .from('item_locations')
        .upsert({
            item_id: itemId,
            location_id: locationId,
            storage_space_id: storageSpaceId,
            current_quantity: newQuantity,
            last_updated: new Date().toISOString(),
        }, {
            onConflict: 'item_id,location_id,storage_space_id'
        })
        .select()
        .single();

    if (upsertError) throw upsertError;

    // Create inventory log
    const { error: logError } = await supabase
        .from('inventory_logs')
        .insert({
            item_id: itemId,
            location_id: locationId,
            storage_space_id: storageSpaceId,
            user_id: userId,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            quantity_change: quantityChange,
            action_type: actionType,
            notes: notes || null,
        });

    if (logError) throw logError;

    return itemLocation as ItemLocation;
}

export async function getInventoryLogs(filters?: {
    itemId?: string;
    locationId?: string;
    limit?: number;
}) {
    const supabase = await createServerSupabaseClient();
    let query = supabase
        .from('inventory_logs')
        .select(`
      *,
      items (*),
      locations (*),
      storage_spaces (*),
      users (*)
    `)
        .order('created_at', { ascending: false });

    if (filters?.itemId) {
        query = query.eq('item_id', filters.itemId);
    }
    if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
    }
    if (filters?.limit) {
        query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
}

export async function getAlerts(filters?: {
    locationId?: string;
    resolved?: boolean;
}) {
    const supabase = await createServerSupabaseClient();
    let query = supabase
        .from('alerts')
        .select(`
      *,
      items (*),
      locations (*)
    `)
        .order('triggered_at', { ascending: false });

    if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
    }
    if (filters?.resolved !== undefined) {
        if (filters.resolved) {
            query = query.not('resolved_at', 'is', null);
        } else {
            query = query.is('resolved_at', null);
        }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Alert[];
}

export async function resolveAlert(alertId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', alertId)
        .select()
        .single();

    if (error) throw error;
    return data as Alert;
}

