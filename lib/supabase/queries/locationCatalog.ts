'use server';

import { createServerSupabaseClient } from '../server';

// Get all items approved for a location
// Used by admin when browsing what they can assign to storage spaces
export async function getLocationCatalog(locationId: string) {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
        .from('location_catalog')
        .select(`
            *,
            items(
                id,
                name,
                sku,
                unit_of_measure,
                min_quantity,
                box_quantity,
                category:category(id, name)
            )
        `)
        .eq('location_id', locationId);

    if (error) throw error;
    return data;
}

// Assign items to a location catalog — super admin only
// Called during store onboarding or when adding new items to a store
export async function assignItemsToLocationCatalog(
    locationId: string,
    itemIds: number[],
    assignedBy: string
) {
    const supabase = await createServerSupabaseClient();

    const records = itemIds.map(itemId => ({
        location_id: locationId,
        item_id: itemId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
        .from('location_catalog')
        .upsert(records, { onConflict: 'location_id,item_id' })
        .select();

    if (error) throw error;
    return data;
}

// Remove an item from a location catalog — super admin only
// This does NOT delete the item_locations record,
// it only removes the approval for future assignments
export async function removeItemFromLocationCatalog(
    locationId: string,
    itemId: number
) {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
        .from('location_catalog')
        .delete()
        .eq('location_id', locationId)
        .eq('item_id', itemId);

    if (error) throw error;
}