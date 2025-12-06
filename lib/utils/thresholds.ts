"use server";

import { createServerSupabaseClient } from '../supabase/server';
import { getLowStockThresholds } from '../supabase/queries/notificationPreferences';

export type UrgencyLevel = 'low' | 'critical' | 'out_of_stock';

export interface EffectiveThreshold {
    lowThreshold: number;
    criticalThreshold: number | null;
    source: 'item' | 'category' | 'location' | 'storage_override' | 'default';
}

/**
 * Get the effective threshold for an item at a specific location and storage space
 * Priority: item-specific > category-specific > location-specific > min_quantity_override > default (item.min_quantity)
 */
export async function getEffectiveThreshold(
    itemId: number,
    locationId: string,
    storageSpaceId: string,
    organizationId: string
): Promise<EffectiveThreshold> {
    const supabase = createServerSupabaseClient();

    // Get item details for default threshold
    const { data: item } = await supabase
        .from('items')
        .select('min_quantity, category_id')
        .eq('id', itemId)
        .single();

    if (!item) {
        throw new Error(`Item ${itemId} not found`);
    }

    const defaultThreshold = item.min_quantity || 0;

    // Get storage-space-specific min_quantity_override from item_locations
    const { data: itemLocation } = await supabase
        .from('item_locations')
        .select('min_quantity_override')
        .eq('item_id', itemId)
        .eq('location_id', locationId)
        .eq('storage_space_id', storageSpaceId)
        .single();

    // Get all thresholds for this organization
    const thresholds = await getLowStockThresholds(organizationId, { isActive: true });

    // Find item-specific threshold
    const itemThreshold = thresholds.find(
        (t) => t.item_id === itemId && t.location_id === null
    );

    if (itemThreshold) {
        return {
            lowThreshold: itemThreshold.low_threshold,
            criticalThreshold: itemThreshold.critical_threshold,
            source: 'item',
        };
    }

    // Find item-specific threshold for this location
    const itemLocationThreshold = thresholds.find(
        (t) => t.item_id === itemId && t.location_id === locationId
    );

    if (itemLocationThreshold) {
        return {
            lowThreshold: itemLocationThreshold.low_threshold,
            criticalThreshold: itemLocationThreshold.critical_threshold,
            source: 'item',
        };
    }

    // Find category-specific threshold
    const categoryThreshold = thresholds.find(
        (t) => t.category_id === item.category && t.item_id === null && t.location_id === null
    );

    if (categoryThreshold) {
        return {
            lowThreshold: categoryThreshold.low_threshold,
            criticalThreshold: categoryThreshold.critical_threshold,
            source: 'category',
        };
    }

    // Find category-specific threshold for this location
    const categoryLocationThreshold = thresholds.find(
        (t) => t.category_id === item.category && t.item_id === null && t.location_id === locationId
    );

    if (categoryLocationThreshold) {
        return {
            lowThreshold: categoryLocationThreshold.low_threshold,
            criticalThreshold: categoryLocationThreshold.critical_threshold,
            source: 'category',
        };
    }

    // Check storage-space-specific min_quantity_override
    if (itemLocation?.min_quantity_override !== null && itemLocation?.min_quantity_override !== undefined) {
        return {
            lowThreshold: itemLocation.min_quantity_override,
            criticalThreshold: null, // No critical threshold for override
            source: 'storage_override',
        };
    }

    // Use default from item
    return {
        lowThreshold: defaultThreshold,
        criticalThreshold: null,
        source: 'default',
    };
}

/**
 * Calculate urgency level based on current quantity and thresholds
 */
export async function calculateUrgencyLevel(
    currentQuantity: number,
    lowThreshold: number,
    criticalThreshold: number | null
): Promise<UrgencyLevel> {
    if (currentQuantity <= 0) {
        return 'out_of_stock';
    }

    if (criticalThreshold !== null && currentQuantity <= criticalThreshold) {
        return 'critical';
    }

    if (currentQuantity <= lowThreshold) {
        return 'low';
    }

    return 'low'; // Shouldn't reach here if called correctly
}

/**
 * Get suggested reorder quantity based on item history and thresholds
 * Simple calculation: reorder to 2x the low threshold
 */
export async function getSuggestedReorderQuantity(
    lowThreshold: number,
    currentQuantity: number = 0
): Promise<number> {
    // Reorder to 2x the low threshold, but at least enough to get above low threshold
    const targetQuantity = Math.max(lowThreshold * 2, lowThreshold + 10);
    const reorderQuantity = Math.max(targetQuantity - currentQuantity, lowThreshold);

    // Round up to nearest reasonable increment
    return Math.ceil(reorderQuantity);
}

