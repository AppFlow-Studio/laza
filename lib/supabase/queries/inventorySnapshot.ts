"use server";

import { createServerSupabaseClient } from '../server';

export interface SnapshotItem {
    itemId: string;
    storageSpaceId: string;
}

// /**
//  * createInventorySnapshot
//  *
//  * Called after a new store is created via the onboarding steps.
//  * For every item × storage-space pair that was assigned, this:
//  *   1. Upserts an item_locations row with current_quantity = 0
//  *      (the check_low_stock trigger will fire and create alerts — that's expected)
//  *   2. Inserts an inventory_logs entry so the audit trail exists from day one
//  *   3. Resolves the auto-generated "initial setup" alerts so the admin dashboard
//  *      isn't flooded with noise before any real counts have been done
//  *
//  * Uses upsert so it's safe to call even if some records already exist
//  * (e.g. if the steps was partially re-run).
//  */
/**
 * seedAllItemsToLocation
 *
 * Fetches every item in the org from the DB and seeds item_locations rows for
 * any item not already present in the location (i.e. not manually assigned).
 * Called server-side so it never depends on the client's React query cache.
 */
export async function seedAllItemsToLocation(
    locationId: string,
    organizationId: string,
    storageSpaceId: string,
    userId: string,
    alreadyAssignedItemIds: string[] = [],
): Promise<void> {
    const supabase = createServerSupabaseClient();

    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id')
        .eq('organization_id', organizationId);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) return;

    const assigned = new Set(alreadyAssignedItemIds.map(String));
    const toSeed: SnapshotItem[] = items
        .filter((item: { id: string | number }) => !assigned.has(String(item.id)))
        .map((item: { id: string | number }) => ({
            itemId: String(item.id),
            storageSpaceId,
        }));

    if (toSeed.length === 0) return;

    await createInventorySnapshot(locationId, userId, toSeed, organizationId);
}

export async function createInventorySnapshot(
    locationId: string,
    userId: string,
    items: SnapshotItem[],
    organizationId: string,
): Promise<void> {
    if (items.length === 0) return;

    const supabase = createServerSupabaseClient();

    // ── 1. Upsert item_locations with current_quantity = 0 ────────────────────
    const itemLocationRows = items.map(({ itemId, storageSpaceId }) => ({
        item_id: itemId,
        location_id: locationId,
        storage_space_id: storageSpaceId,
        current_quantity: 0,
        organization_id: organizationId,
    }));

    const { error: upsertError } = await supabase
        .from('item_locations')
        .upsert(itemLocationRows, {
            onConflict: 'item_id,location_id,storage_space_id',
            ignoreDuplicates: false,
        });

    if (upsertError) {
        console.error('createInventorySnapshot: upsert error', upsertError);
        throw upsertError;
    }

    // ── 2. Fetch the just-created item_locations IDs ──────────────────────────
    // We need these to build accurate inventory_logs rows.
    const itemIds = [...new Set(items.map(i => i.itemId))];
    const storageIds = [...new Set(items.map(i => i.storageSpaceId))];

    const { data: createdLocations, error: fetchError } = await supabase
        .from('item_locations')
        .select('id, item_id, storage_space_id')
        .eq('location_id', locationId)
        .in('item_id', itemIds)
        .in('storage_space_id', storageIds);

    if (fetchError) {
        console.error('createInventorySnapshot: fetch error', fetchError);
        throw fetchError;
    }

    // ── 3. Insert inventory_logs ──────────────────────────────────────────────
    if (createdLocations && createdLocations.length > 0) {
        const logRows = createdLocations.map(row => ({
            item_id: row.item_id,
            location_id: locationId,
            storage_space_id: row.storage_space_id,
            user_id: userId,
            previous_quantity: 0,
            new_quantity: 0,
            quantity_change: 0,
            action_type: 'count' as const,
            notes: 'Initial setup — awaiting first count',
        }));

        const { error: logError } = await supabase
            .from('inventory_logs')
            .insert(logRows);

        if (logError) {
            // Non-fatal: don't block location creation if log insert fails
            console.error('createInventorySnapshot: log insert error', logError);
        }
    }

    // ── 4. Resolve initial-setup alerts ──────────────────────────────────────
    // The check_low_stock trigger fires on every item_locations upsert and will
    // create low_stock alerts for all items (since 0 < min_quantity for most items).
    // We resolve them immediately so admins aren't flooded with noise on day one.
    // Real alerts will fire naturally once employees start doing actual counts.
    const { error: alertError } = await supabase
        .from('alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('location_id', locationId)
        .in('item_id', itemIds)
        .is('resolved_at', null);

    if (alertError) {
        // Non-fatal: don't block location creation if alert resolution fails
        console.error('createInventorySnapshot: alert resolve error', alertError);
    }
}