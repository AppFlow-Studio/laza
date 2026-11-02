"use server";

import { createServerSupabaseClient } from '../server';

// PostgREST caps responses at 1000 rows, and very large inserts risk the
// statement timeout (item_locations has a per-row low-stock trigger).
const PAGE_SIZE = 1000;
const INSERT_CHUNK_SIZE = 250;

type TemperatureType = 'frozen' | 'refrigerated' | 'dry';

export type StoreTemplateSpace = {
    name: string;
    temperature_type: TemperatureType;
    items: Array<{ itemId: string; minQuantityOverride: number | null }>;
};

export type StoreSetupSpace = {
    name: string;
    temperature_type: TemperatureType;
    items: Array<{ itemId: string; quantity: number; minQuantityOverride: number | null }>;
};

export type CreateStoreWithSetupInput = {
    organizationId: string;
    store: {
        name: string;
        address: { street: string; city: string; state: string; zip: string; country?: string };
        is_active: boolean;
        latitude: number | null;
        longitude: number | null;
    };
    storageSpaces: StoreSetupSpace[];
    // Every catalog item, seeded at qty 0 into a "Default Storage" space
    // (skipped when the user already has a space with that name).
    defaultStorageItemIds: string[];
};

export type CreateStoreWithSetupResult =
    | { ok: true; locationId: string }
    | { ok: false; error: string };

function toTemperatureType(value: string | null): TemperatureType {
    return value === 'frozen' || value === 'dry' ? value : 'refrigerated';
}

function errorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
        const { message, details, hint } = error as { message?: string; details?: string; hint?: string };
        return [message, details, hint].filter(Boolean).join(' — ') || 'Unknown error';
    }
    return String(error);
}

/**
 * Storage spaces of an existing store plus the items assigned to each one,
 * used to pre-fill the new-store wizard when cloning a layout.
 */
export async function getStoreTemplate(locationId: string): Promise<StoreTemplateSpace[]> {
    const supabase = createServerSupabaseClient();

    const { data: spaces, error: spacesError } = await supabase
        .from('storage_spaces')
        .select('id, name, temperature_type, created_at')
        .eq('location_id', locationId)
        .order('created_at', { ascending: true });

    if (spacesError) throw spacesError;
    if (!spaces?.length) return [];

    const rows: Array<{ item_id: number | string; storage_space_id: string; min_quantity_override: number | null }> = [];
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from('item_locations')
            .select('item_id, storage_space_id, min_quantity_override')
            .eq('location_id', locationId)
            .not('storage_space_id', 'is', null)
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE_SIZE) break;
    }

    const itemsBySpace = new Map<string, StoreTemplateSpace['items']>();
    for (const row of rows) {
        const list = itemsBySpace.get(row.storage_space_id) ?? [];
        list.push({ itemId: String(row.item_id), minQuantityOverride: row.min_quantity_override ?? null });
        itemsBySpace.set(row.storage_space_id, list);
    }

    return spaces.map((space) => ({
        name: space.name ?? 'Untitled storage',
        temperature_type: toTemperatureType(space.temperature_type),
        items: itemsBySpace.get(space.id) ?? [],
    }));
}

/**
 * Creates a store, its storage spaces and item assignments in one server call.
 * If anything after the location insert fails, the location is deleted again
 * (storage spaces, item_locations, logs and alerts cascade) so a retry starts
 * clean instead of leaving a half-built duplicate store behind.
 *
 * Errors are returned rather than thrown: Next.js strips thrown messages from
 * server actions in production, which left users with a bare "failed".
 */
export async function createStoreWithSetup(input: CreateStoreWithSetupInput): Promise<CreateStoreWithSetupResult> {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    if (!userId) return { ok: false, error: 'You are signed out. Sign in again and retry.' };

    const supabase = createServerSupabaseClient();
    const { organizationId } = input;

    const { data: location, error: locationError } = await supabase
        .from('locations')
        .insert([{
            organization_id: organizationId,
            name: input.store.name,
            address: input.store.address,
            is_active: input.store.is_active,
            latitude: input.store.latitude,
            longitude: input.store.longitude,
        }])
        .select('id')
        .single();

    if (locationError || !location) {
        return { ok: false, error: `Could not create the store: ${errorMessage(locationError)}` };
    }

    const locationId: string = location.id;
    let stage = 'catalog';

    try {
        // 1. Give the store access to every org item (mirrors createLocation)
        const orgItems: Array<{ id: number | string }> = [];
        for (let from = 0; ; from += PAGE_SIZE) {
            const { data, error } = await supabase
                .from('items')
                .select('id')
                .eq('organization_id', organizationId)
                .order('id', { ascending: true })
                .range(from, from + PAGE_SIZE - 1);
            if (error) throw error;
            orgItems.push(...(data ?? []));
            if (!data || data.length < PAGE_SIZE) break;
        }

        const assignedAt = new Date().toISOString();
        const catalogRows = orgItems.map((item) => ({
            location_id: locationId,
            item_id: item.id,
            assigned_by: userId,
            assigned_at: assignedAt,
        }));
        for (let i = 0; i < catalogRows.length; i += INSERT_CHUNK_SIZE) {
            const { error } = await supabase
                .from('location_catalog')
                .upsert(catalogRows.slice(i, i + INSERT_CHUNK_SIZE), { onConflict: 'location_id,item_id' });
            if (error) throw error;
        }

        // 2. Storage spaces — ids generated here so items map without relying on return order
        stage = 'storage spaces';
        const spaces = [...input.storageSpaces];
        const hasDefault = spaces.some((s) => s.name.trim().toLowerCase() === 'default storage');
        if (!hasDefault && input.defaultStorageItemIds.length > 0) {
            spaces.push({
                name: 'Default Storage',
                temperature_type: 'refrigerated',
                items: input.defaultStorageItemIds.map((itemId) => ({ itemId, quantity: 0, minQuantityOverride: null })),
            });
        }

        const spaceRows = spaces.map((space) => ({
            id: crypto.randomUUID(),
            location_id: locationId,
            name: space.name.trim(),
            temperature_type: space.temperature_type,
        }));
        if (spaceRows.length > 0) {
            const { error } = await supabase.from('storage_spaces').insert(spaceRows);
            if (error) throw error;
        }

        // 3. Item assignments (deduped per space — a repeat would violate the unique key)
        stage = 'item assignments';
        const now = new Date().toISOString();
        const itemRows: Array<Record<string, unknown>> = [];
        const logRows: Array<Record<string, unknown>> = [];

        spaces.forEach((space, index) => {
            const storageSpaceId = spaceRows[index].id;
            const seen = new Set<string>();
            for (const item of space.items) {
                const itemId = String(item.itemId);
                if (seen.has(itemId)) continue;
                seen.add(itemId);

                const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
                itemRows.push({
                    item_id: itemId,
                    location_id: locationId,
                    storage_space_id: storageSpaceId,
                    current_quantity: quantity,
                    min_quantity_override: item.minQuantityOverride ?? null,
                    last_updated: now,
                    organization_id: organizationId,
                });

                if (quantity !== 0) {
                    logRows.push({
                        item_id: itemId,
                        location_id: locationId,
                        storage_space_id: storageSpaceId,
                        user_id: userId,
                        previous_quantity: 0,
                        new_quantity: quantity,
                        quantity_change: quantity,
                        action_type: 'received',
                        notes: 'Initial assignment to storage space',
                        organization_id: organizationId,
                    });
                }
            }
        });

        for (let i = 0; i < itemRows.length; i += INSERT_CHUNK_SIZE) {
            const { error } = await supabase.from('item_locations').insert(itemRows.slice(i, i + INSERT_CHUNK_SIZE));
            if (error) throw error;
        }

        // 4. Starting stock logs (zero-quantity assignments are not stock movements)
        stage = 'inventory logs';
        for (let i = 0; i < logRows.length; i += INSERT_CHUNK_SIZE) {
            const { error } = await supabase.from('inventory_logs').insert(logRows.slice(i, i + INSERT_CHUNK_SIZE));
            if (error) throw error;
        }

        return { ok: true, locationId };
    } catch (error) {
        const message = errorMessage(error);
        console.error(`[createStoreWithSetup] failed at ${stage} for location ${locationId}:`, error);

        const { error: cleanupError } = await supabase.from('locations').delete().eq('id', locationId);
        if (cleanupError) {
            console.error('[createStoreWithSetup] cleanup failed:', cleanupError);
            return {
                ok: false,
                error: `Store setup failed while saving ${stage}: ${message}. A partial store named "${input.store.name}" may need to be deleted before retrying.`,
            };
        }

        return { ok: false, error: `Store setup failed while saving ${stage}: ${message}. Nothing was saved — you can retry.` };
    }
}
