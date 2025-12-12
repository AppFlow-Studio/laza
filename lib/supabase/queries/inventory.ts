"use server";

import { createServerSupabaseClient } from '../server';
import { ItemLocation, InventoryLog, Alert } from '../types';
import { checkUpdateAllowed, createOverrideLog } from './updateLimits';

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

export async function updateQuantity({
    itemId,
    locationId,
    storageSpaceId,
    newQuantity,
    userId,
    actionType,
    notes,
    minQuantityOverride,
    isOverride,
    overrideReason,
    overrideAdminId,
    organizationId,
}: {
    itemId: string;
    locationId: string;
    storageSpaceId: string | null;
    newQuantity: number;
    userId: string;
    actionType: 'count' | 'adjustment' | 'received' | 'used',
    notes?: string,
    minQuantityOverride?: number | null,
    isOverride?: boolean,
    overrideReason?: string | null,
    overrideAdminId?: string | null,
    organizationId?: string
}) {
    const supabase = createServerSupabaseClient();
    console.log('updateQuantity', itemId, locationId, storageSpaceId, userId, actionType, notes, minQuantityOverride, isOverride, overrideReason, overrideAdminId, organizationId)
    // Check update limits (unless this is an admin override)
    if (!isOverride) {
        const limitCheck = await checkUpdateAllowed(itemId, locationId, storageSpaceId, userId);
        if (!limitCheck.allowed) {
            throw new Error(
                `Update limit reached. You have used ${limitCheck.currentCount}/${limitCheck.limit} updates for this item today. Please contact an admin to override.`
            );
        }
    }

    // Get current quantity
    console.log(itemId, locationId, storageSpaceId)
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
    const updateData: any = {
        item_id: itemId,
        location_id: locationId,
        storage_space_id: storageSpaceId,
        current_quantity: newQuantity,
        last_updated: new Date().toISOString(),
    };

    // Include min_quantity_override if provided
    if (minQuantityOverride !== undefined) {
        updateData.min_quantity_override = minQuantityOverride;
    }

    const { data: itemLocation, error: upsertError } = await supabase
        .from('item_locations')
        .upsert(updateData, {
            onConflict: 'item_id,location_id,storage_space_id'
        })
        .select()
        .single();

    if (upsertError) throw upsertError;

    // Create inventory log
    const { data: inventoryLog, error: logError } = await supabase
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
            organization_id: organizationId,
        })
        .select()
        .single();

    if (logError) throw logError;

    // If this was an admin override, log it
    if (isOverride && overrideAdminId && inventoryLog) {
        await createOverrideLog({
            inventory_log_id: inventoryLog.id,
            item_id: itemId,
            location_id: locationId,
            storage_space_id: storageSpaceId,
            admin_user_id: overrideAdminId,
            employee_user_id: userId !== overrideAdminId ? userId : null,
            override_reason: overrideReason || null,
        });
    }

    return itemLocation as ItemLocation;
}

export async function getInventoryLogs(filters?: {
    itemId?: string;
    locationId?: string;
    limit?: number;
}, organizationId?: string) {
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
        .order('created_at', { ascending: false })
        .eq('organization_id', organizationId);

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
    storageSpaceId?: string;
    resolved?: boolean;
}, organizationId?: string) {
    const supabase = await createServerSupabaseClient();

    // First get alerts
    let query = supabase
        .from('alerts')
        .select(`
      *,
      items (*),
      locations (*),
      storage_spaces (*)
    `)
        .order('triggered_at', { ascending: false })
        .eq('organization_id', organizationId);

    if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
    }
    if (filters?.storageSpaceId) {
        query = query.eq('storage_space_id', filters.storageSpaceId);
    }
    if (filters?.resolved !== undefined) {
        if (filters.resolved) {
            query = query.not('resolved_at', 'is', null);
        } else {
            query = query.is('resolved_at', null);
        }
    }

    const { data: alerts, error } = await query;
    if (error) throw error;

    // Enrich alerts with current quantity and min_quantity_override from item_locations
    if (!alerts || alerts.length === 0) return [];

    // Filter alerts that have storage_space_id (required for new alerts)
    const alertsWithStorageSpace = alerts.filter((alert: any) => alert.storage_space_id);
    if (alertsWithStorageSpace.length === 0) return alerts;

    // Batch fetch item_locations for all alerts
    const itemIds = [...new Set(alertsWithStorageSpace.map((a: any) => a.item_id))];
    const locationIds = [...new Set(alertsWithStorageSpace.map((a: any) => a.location_id))];
    const storageSpaceIds = [...new Set(alertsWithStorageSpace.map((a: any) => a.storage_space_id))];

    // Fetch all item_locations in one query
    const { data: itemLocations } = await supabase
        .from('item_locations')
        .select('item_id, location_id, storage_space_id, current_quantity, min_quantity_override')
        .in('item_id', itemIds)
        .in('location_id', locationIds)
        .in('storage_space_id', storageSpaceIds);

    // Create a map for quick lookup
    const itemLocationMap = new Map();
    itemLocations?.forEach((il: any) => {
        const key = `${il.item_id}-${il.location_id}-${il.storage_space_id}`;
        itemLocationMap.set(key, il);
    });

    // Enrich alerts with item_location data
    const enrichedAlerts = alerts.map((alert: any) => {
        if (!alert.storage_space_id) return alert;

        const key = `${alert.item_id}-${alert.location_id}-${alert.storage_space_id}`;
        const itemLocation = itemLocationMap.get(key);

        return {
            ...alert,
            item_locations: itemLocation || null,
        };
    });

    return enrichedAlerts;
}

export async function getLowStockItems(groupBy: 'location' | 'item' = 'location') {
    const supabase = await createServerSupabaseClient();

    // Query item_locations with effective min quantity calculation
    const { data, error } = await supabase
        .from('item_locations')
        .select(`
            *,
            items (*),
            locations (*),
            storage_spaces (*)
        `)
        .not('storage_space_id', 'is', null);

    if (error) throw error;

    // Calculate effective min quantity and filter low stock items
    const lowStockItems = (data || []).map((il: any) => {
        const effectiveMin = il.min_quantity_override ?? il.items?.min_quantity ?? 0;
        return {
            ...il,
            effective_min_quantity: effectiveMin,
            is_low_stock: il.current_quantity < effectiveMin,
        };
    }).filter((il: any) => il.is_low_stock);

    // Group by location or item
    if (groupBy === 'location') {
        const grouped: Record<string, typeof lowStockItems> = {};
        lowStockItems.forEach((item: any) => {
            const locationId = item.location_id;
            if (!grouped[locationId]) {
                grouped[locationId] = [];
            }
            grouped[locationId].push(item);
        });
        return grouped;
    } else {
        const grouped: Record<string, typeof lowStockItems> = {};
        lowStockItems.forEach((item: any) => {
            const itemId = item.item_id;
            if (!grouped[itemId]) {
                grouped[itemId] = [];
            }
            grouped[itemId].push(item);
        });
        return grouped;
    }
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

export async function bulkAssignItemsToStorage(
    locationId: string,
    storageSpaceId: string,
    items: Array<{ itemId: string; quantity: number; minQuantityOverride?: number | null }>,
    userId: string,
    organizationId: string
) {
    const supabase = await createServerSupabaseClient();

    // Prepare item_locations records
    const itemLocations = items.map(({ itemId, quantity, minQuantityOverride }) => ({
        item_id: itemId,
        location_id: locationId,
        storage_space_id: storageSpaceId,
        current_quantity: quantity,
        min_quantity_override: minQuantityOverride !== undefined ? minQuantityOverride : null,
        last_updated: new Date().toISOString(),
    }));

    // Bulk upsert item_locations
    const { data: insertedItems, error: upsertError } = await supabase
        .from('item_locations')
        .upsert(itemLocations, {
            onConflict: 'item_id,location_id,storage_space_id',
        })
        .select();

    if (upsertError) throw upsertError;

    // Create inventory logs for each assignment
    const logs = items.map(({ itemId, quantity }) => ({
        item_id: itemId,
        location_id: locationId,
        storage_space_id: storageSpaceId,
        user_id: userId,
        previous_quantity: 0,
        new_quantity: quantity,
        quantity_change: quantity,
        action_type: 'received' as const,
        notes: 'Initial assignment to storage space',
        organization_id: organizationId,
    }));

    const { error: logError } = await supabase
        .from('inventory_logs')
        .insert(logs);

    if (logError) throw logError;

    return insertedItems as ItemLocation[];
}

export async function bulkUpdateInventory(
    itemLocations: Array<{
        itemId: string;
        locationId: string;
        storageSpaceId: string;
        quantity?: number;
        minQuantityOverride?: number | null;
        actionType: 'count' | 'adjustment' | 'received' | 'used';
        notes?: string;
    }>,
    userId: string,
    isOverride?: boolean,
    organizationId?: string
) {
    const supabase = await createServerSupabaseClient();

    // Check limits for each item (unless override)
    const limitErrors: string[] = [];
    if (!isOverride) {
        for (const itemLoc of itemLocations) {
            const limitCheck = await checkUpdateAllowed(
                itemLoc.itemId,
                itemLoc.locationId,
                itemLoc.storageSpaceId,
                userId
            );
            if (!limitCheck.allowed) {
                limitErrors.push(
                    `Item ${itemLoc.itemId}: Update limit reached (${limitCheck.currentCount}/${limitCheck.limit} updates used)`
                );
            }
        }

        if (limitErrors.length > 0) {
            throw new Error(`Update limits exceeded:\n${limitErrors.join('\n')}`);
        }
    }

    // Process each item location update
    const updates = [];
    const logs = [];

    for (const itemLoc of itemLocations) {
        // Get current quantity
        const { data: current } = await supabase
            .from('item_locations')
            .select('current_quantity')
            .eq('item_id', itemLoc.itemId)
            .eq('location_id', itemLoc.locationId)
            .eq('storage_space_id', itemLoc.storageSpaceId)
            .single();

        const previousQuantity = current?.current_quantity || 0;
        const newQuantity = itemLoc.quantity !== undefined ? itemLoc.quantity : previousQuantity;
        const quantityChange = newQuantity - previousQuantity;

        // Prepare update data
        const updateData: any = {
            item_id: itemLoc.itemId,
            location_id: itemLoc.locationId,
            storage_space_id: itemLoc.storageSpaceId,
            current_quantity: newQuantity,
            last_updated: new Date().toISOString(),
        };

        if (itemLoc.minQuantityOverride !== undefined) {
            updateData.min_quantity_override = itemLoc.minQuantityOverride;
        }

        updates.push(updateData);

        // Create log entry
        logs.push({
            item_id: itemLoc.itemId,
            location_id: itemLoc.locationId,
            storage_space_id: itemLoc.storageSpaceId,
            user_id: userId,
            previous_quantity: previousQuantity,
            new_quantity: newQuantity,
            quantity_change: quantityChange,
            action_type: itemLoc.actionType,
            notes: itemLoc.notes || null,
            organization_id: organizationId,
        });
    }

    // Bulk upsert item_locations
    const { data: updatedItems, error: upsertError } = await supabase
        .from('item_locations')
        .upsert(updates, {
            onConflict: 'item_id,location_id,storage_space_id',
        })
        .select();

    if (upsertError) throw upsertError;

    // Bulk insert inventory logs
    if (logs.length > 0) {
        const { error: logError } = await supabase
            .from('inventory_logs')
            .insert(logs);

        if (logError) throw logError;
    }

    return updatedItems as ItemLocation[];
}

export async function bulkRemoveItemsFromStorage(
    itemIds: string[],
    locationId: string,
    storageSpaceId: string
) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
        .from('item_locations')
        .delete()
        .in('item_id', itemIds)
        .eq('location_id', locationId)
        .eq('storage_space_id', storageSpaceId);

    if (error) throw error;
}

export async function getInventoryByStorageSpace(storageSpaceId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('item_locations')
        .select(`
            *,
            items (*),
            storage_spaces (*)
        `)
        .eq('storage_space_id', storageSpaceId)
        .order('last_updated', { ascending: false });

    if (error) throw error;
    return data as any[];
}

export async function getInventoryLogsByStorageSpace(storageSpaceId: string, limit?: number) {
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
        .eq('storage_space_id', storageSpaceId)
        .order('created_at', { ascending: false });

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as any[];
}

