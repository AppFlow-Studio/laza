"use server";

import { createServerSupabaseClient } from '../supabase/server';
import { getEffectiveThreshold, calculateUrgencyLevel, getSuggestedReorderQuantity } from './thresholds';

export interface LowStockAlertData {
    alertId: string;
    item: {
        id: string;
        name: string;
        sku: string | null;
        category: string;
        unit_of_measure: string;
    };
    location: {
        id: string;
        name: string;
    };
    storageSpace: {
        id: string;
        name: string;
        temperature_type: string;
    } | null;
    currentQuantity: number;
    lowThreshold: number;
    criticalThreshold: number | null;
    urgencyLevel: 'low' | 'critical' | 'out_of_stock';
    suggestedReorderQuantity: number;
    triggeredAt: string;
}

export interface LowStockDigestData {
    organizationId: string;
    organizationName: string;
    alerts: LowStockAlertData[];
    groupedBy: 'location' | 'category';
    digestDate: string;
}

export interface DailySummaryData {
    organizationId: string;
    organizationName: string;
    locationId?: string;
    locationName?: string;
    date: string;
    summary: {
        inventoryValue?: number;
        updatedItems?: Array<{
            itemId: string;
            itemName: string;
            previousQuantity: number;
            newQuantity: number;
            change: number;
            updatedBy: string;
            updatedAt: string;
        }>;
        storageUtilization?: Array<{
            storageSpaceId: string;
            storageSpaceName: string;
            usedCapacity: number;
            totalCapacity: number;
            utilizationPercent: number;
        }>;
        lowStockItems?: Array<{
            itemId: string;
            itemName: string;
            currentQuantity: number;
            threshold: number;
            urgencyLevel: 'low' | 'critical' | 'out_of_stock';
        }>;
        employeeActivity?: Array<{
            userId: string;
            userName: string;
            updateCount: number;
            itemsUpdated: number;
        }>;
        comparisonMetrics?: {
            todayVsYesterday: {
                inventoryValueChange: number;
                itemsUpdatedChange: number;
            };
            weekOverWeek: {
                inventoryValueChange: number;
                itemsUpdatedChange: number;
            };
        };
        trendingItems?: Array<{
            itemId: string;
            itemName: string;
            change: number;
            changePercent: number;
            direction: 'up' | 'down';
        }>;
    };
    /**
     * Present only for super admin recipients — summarises warehouse
     * activity for the day (tickets fulfilled, items dispatched, stock health).
     */
    warehouseSummary?: {
        /** Total order tickets fulfilled today across all stores. */
        ticketsFulfilledToday: number;
        /** Per-item dispatch totals sent out to stores today. */
        itemsDispatchedToday: Array<{
            itemId: string;
            itemName: string;
            totalBoxes: number;
            totalUnits: number;
        }>;
        /** High-level warehouse stock health snapshot. */
        stockHealth: {
            totalItems: number;
            lowStockCount: number;
            criticalCount: number;
            /** Percentage of items that are at healthy stock levels (0–100). */
            healthPercent: number;
        };
    };
}

/**
 * Build data for low stock alert email
 */
export async function buildLowStockAlertData(alertId: string): Promise<LowStockAlertData> {
    const supabase = createServerSupabaseClient();

    // Get alert with related data
    const { data: alert, error: alertError } = await supabase
        .from('alerts')
        .select(`
            *,
            items (*),
            locations (*),
            storage_spaces (*)
        `)
        .eq('id', alertId)
        .single();

    if (alertError || !alert) {
        throw new Error(`Alert ${alertId} not found`);
    }

    // Get current quantity from item_locations
    const { data: itemLocation } = await supabase
        .from('item_locations')
        .select('current_quantity')
        .eq('item_id', alert.item_id)
        .eq('location_id', alert.location_id)
        .eq('storage_space_id', alert.storage_space_id)
        .single();

    const currentQuantity = itemLocation?.current_quantity || 0;

    // Get organization_id from item
    const organizationId = (alert.items as any).organization_id;

    // Get effective threshold
    const effectiveThreshold = await getEffectiveThreshold(
        alert.item_id,
        alert.location_id,
        alert.storage_space_id,
        organizationId
    );

    // Calculate urgency
    const urgencyLevel = await calculateUrgencyLevel(
        currentQuantity,
        effectiveThreshold.lowThreshold,
        effectiveThreshold.criticalThreshold
    );

    // Get suggested reorder quantity
    const suggestedReorderQuantity = await getSuggestedReorderQuantity(
        effectiveThreshold.lowThreshold,
        currentQuantity
    );

    return {
        alertId: alert.id,
        item: {
            id: (alert.items as any).id,
            name: (alert.items as any).name,
            sku: (alert.items as any).sku,
            category: (alert.items as any).category,
            unit_of_measure: (alert.items as any).unit_of_measure,
        },
        location: {
            id: (alert.locations as any).id,
            name: (alert.locations as any).name,
        },
        storageSpace: alert.storage_spaces
            ? {
                id: (alert.storage_spaces as any).id,
                name: (alert.storage_spaces as any).name,
                temperature_type: (alert.storage_spaces as any).temperature_type,
            }
            : null,
        currentQuantity,
        lowThreshold: effectiveThreshold.lowThreshold,
        criticalThreshold: effectiveThreshold.criticalThreshold,
        urgencyLevel,
        suggestedReorderQuantity,
        triggeredAt: alert.triggered_at,
    };
}

/**
 * Build data for low stock digest email
 */
export async function buildLowStockDigestData(
    organizationId: string,
    alertIds: string[],
    groupedBy: 'location' | 'category' = 'location'
): Promise<LowStockDigestData> {
    const supabase = await createServerSupabaseClient();

    // Get organization name
    const { data: organization } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

    // Build alert data for each alert
    const alerts = await Promise.all(
        alertIds.map((alertId) => buildLowStockAlertData(alertId))
    );

    return {
        organizationId,
        organizationName: organization?.name || 'Your Organization',
        alerts,
        groupedBy,
        digestDate: new Date().toISOString(),
    };
}

/**
 * Build data for daily summary email
 * This is a simplified version - full implementation would query all the data
 */
export async function buildDailySummaryData(
    organizationId: string,
    locationId?: string,
    date?: string
): Promise<DailySummaryData> {
    const supabase = await createServerSupabaseClient();
    const summaryDate = date || new Date().toISOString().split('T')[0];

    // Get organization name
    const { data: organization } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .single();

    let locationName: string | undefined;
    if (locationId) {
        const { data: location } = await supabase
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();
        locationName = location?.name;
    }

    // This is a placeholder - full implementation would query:
    // - Inventory value
    // - Updated items today
    // - Storage utilization
    // - Low stock items
    // - Employee activity
    // - Comparison metrics
    // - Trending items

    return {
        organizationId,
        organizationName: organization?.name || 'Your Organization',
        locationId,
        locationName,
        date: summaryDate,
        summary: {
            // Placeholder data - implement full queries as needed
        },
    };
}

