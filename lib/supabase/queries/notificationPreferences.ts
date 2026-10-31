"use server";

import { createServerSupabaseClient } from '../server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPreferences {
    id: string;
    organization_id: string;
    /** NULL = org-wide default row. Non-null = location-specific override. */
    location_id: string | null;
    primary_email: string;
    secondary_emails: string[];
    timezone: string;
    notifications_enabled: boolean;
    low_stock_alerts_enabled: boolean;
    daily_summary_enabled: boolean;
    low_stock_delivery_mode: 'immediate' | 'digest' | 'both';
    low_stock_digest_schedule: string | null;
    daily_summary_schedule: string;
    daily_summary_days: number[];
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    email_format: 'html' | 'plain';
    created_at: string;
    updated_at: string;
}

export interface LowStockThreshold {
    id: string;
    organization_id: string;
    item_id: number | null;
    category_id: string | null;
    location_id: string | null;
    low_threshold: number;
    critical_threshold: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface DailySummaryPreferences {
    id: string;
    organization_id: string;
    /** NULL = org-wide default row. Non-null = location-specific override. */
    location_id: string | null;
    include_inventory_value: boolean;
    include_updated_items: boolean;
    include_storage_utilization: boolean;
    include_low_stock_items: boolean;
    include_employee_activity: boolean;
    include_comparison_metrics: boolean;
    include_trending_items: boolean;
    min_significance_threshold: number;
    summary_format: 'detailed' | 'concise';
    group_by_location: boolean;
    locations_to_include: string[];
    show_matrix_only_with_stock: boolean;
    created_at: string;
    updated_at: string;
}

// ─── Notification Preferences ─────────────────────────────────────────────────

/**
 * Get the preferences row for a given scope.
 * - Pass `locationId` → location-specific override row (null if not yet created).
 * - Omit/null → org-wide default row (original behaviour).
 */
export async function getNotificationPreferences(
    organizationId: string,
    locationId?: string | null,
): Promise<NotificationPreferences | null> {
    const supabase = createServerSupabaseClient();

    let query = supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', organizationId);

    if (locationId) {
        query = query.eq('location_id', locationId);
    } else {
        query = query.is('location_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.log(error, 'error1');
        throw error;
    }

    return data as NotificationPreferences | null;
}

/**
 * Create a preferences row.
 * Pass `locationId` for a location-specific override; omit for org-wide default.
 */
export async function createNotificationPreferences(
    organizationId: string,
    data: Partial<Omit<NotificationPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>,
    locationId?: string | null,
): Promise<NotificationPreferences> {
    const supabase = createServerSupabaseClient();
    const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .insert({
            organization_id: organizationId,
            location_id: locationId ?? null,
            primary_email: data.primary_email || '',
            secondary_emails: data.secondary_emails || [],
            timezone: data.timezone || 'America/New_York',
            notifications_enabled: data.notifications_enabled ?? true,
            low_stock_alerts_enabled: data.low_stock_alerts_enabled ?? true,
            daily_summary_enabled: data.daily_summary_enabled ?? true,
            low_stock_delivery_mode: data.low_stock_delivery_mode || 'immediate',
            low_stock_digest_schedule: data.low_stock_digest_schedule || null,
            daily_summary_schedule: data.daily_summary_schedule || '08:00:00',
            daily_summary_days: data.daily_summary_days || [1, 2, 3, 4, 5],
            quiet_hours_start: data.quiet_hours_start || null,
            quiet_hours_end: data.quiet_hours_end || null,
            email_format: data.email_format || 'html',
        })
        .select()
        .single();

    if (error) throw error;
    return preferences as NotificationPreferences;
}

/**
 * Update a preferences row for the given scope.
 * - Pass `locationId` → upserts the location-specific row.
 * - Omit → updates the org-wide default row (original behaviour).
 */
export async function updateNotificationPreferences(
    organizationId: string,
    updates: Partial<Omit<NotificationPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>,
    locationId?: string | null,
): Promise<NotificationPreferences> {
    const supabase = await createServerSupabaseClient();

    if (locationId) {
        // Upsert the location-specific override row
        const { data: preferences, error } = await supabase
            .from('notification_preferences')
            .upsert(
                { organization_id: organizationId, location_id: locationId, ...updates },
                { onConflict: 'organization_id,location_id' },
            )
            .select()
            .single();

        if (error) { console.log(error, 'error2'); throw error; }
        return preferences as NotificationPreferences;
    }

    // Org-wide row: try update first; if no row exists yet, create it
    const { data: updated, error: updateError } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('organization_id', organizationId)
        .is('location_id', null)
        .select()
        .maybeSingle();

    if (updateError) { console.log(updateError, 'error2'); throw updateError; }

    if (updated) return updated as NotificationPreferences;

    // No org-wide row existed — insert it with the requested fields as defaults
    const { data: created, error: createError } = await supabase
        .from('notification_preferences')
        .insert({
            organization_id: organizationId,
            location_id: null,
            primary_email: (updates as any).primary_email ?? '',
            ...updates,
        })
        .select()
        .single();

    if (createError) { console.log(createError, 'error2'); throw createError; }
    return created as NotificationPreferences;
}

/**
 * Returns all location-specific preference rows for an org, joined with
 * location name. Used by the Super Admin settings page.
 */
export async function getAllLocationNotificationPreferences(organizationId: string) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('notification_preferences')
        .select('*, locations(id, name, address)')
        .eq('organization_id', organizationId)
        .not('location_id', 'is', null)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data ?? [];
}

// ─── Low Stock Thresholds (unchanged) ────────────────────────────────────────

export async function getLowStockThresholds(
    organizationId: string,
    filters?: {
        itemId?: number;
        categoryId?: string;
        locationId?: string;
        isActive?: boolean;
    }
): Promise<LowStockThreshold[]> {
    const supabase = await createServerSupabaseClient();
    let query = supabase
        .from('low_stock_thresholds')
        .select('*')
        .eq('organization_id', organizationId);

    if (filters?.itemId) query = query.eq('item_id', filters.itemId);
    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters?.locationId) query = query.eq('location_id', filters.locationId);
    if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) { console.log(error, 'error3'); throw error; }
    return data as LowStockThreshold[];
}

export async function createLowStockThreshold(
    data: Omit<LowStockThreshold, 'id' | 'created_at' | 'updated_at'>
): Promise<LowStockThreshold> {
    const supabase = createServerSupabaseClient();
    const { data: threshold, error } = await supabase
        .from('low_stock_thresholds')
        .insert({
            organization_id: data.organization_id,
            item_id: data.item_id || null,
            category_id: data.category_id || null,
            location_id: data.location_id || null,
            low_threshold: data.low_threshold,
            critical_threshold: data.critical_threshold || null,
            is_active: data.is_active ?? true,
        })
        .select()
        .single();

    if (error) { console.log(error, 'error3'); throw error; }
    return threshold as LowStockThreshold;
}

export async function updateLowStockThreshold(
    id: string,
    updates: Partial<Omit<LowStockThreshold, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<LowStockThreshold> {
    const supabase = await createServerSupabaseClient();
    const { data: threshold, error } = await supabase
        .from('low_stock_thresholds')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) { console.log(error, 'error3'); throw error; }
    return threshold as LowStockThreshold;
}

export async function deleteLowStockThreshold(id: string): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
        .from('low_stock_thresholds')
        .delete()
        .eq('id', id);

    if (error) { console.log(error, 'error3'); throw error; }
}

// ─── Daily Summary Preferences ────────────────────────────────────────────────

/**
 * Get daily summary preferences for the given scope.
 * Pass `locationId` for a location-specific row; omit for org-wide default.
 */
export async function getDailySummaryPreferences(
    organizationId: string,
    locationId?: string | null,
): Promise<DailySummaryPreferences | null> {
    const supabase = await createServerSupabaseClient();

    let query = supabase
        .from('daily_summary_preferences')
        .select('*')
        .eq('organization_id', organizationId);

    if (locationId) {
        query = query.eq('location_id', locationId);
    } else {
        query = query.is('location_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    return data as DailySummaryPreferences | null;
}

/**
 * Update (or create) daily summary preferences for the given scope.
 * Preserves the original create-if-not-exists pattern.
 */
export async function updateDailySummaryPreferences(
    organizationId: string,
    updates: Partial<Omit<DailySummaryPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>,
    locationId?: string | null,
): Promise<DailySummaryPreferences> {
    const supabase = await createServerSupabaseClient();

    const existing = await getDailySummaryPreferences(organizationId, locationId);

    if (!existing) {
        const { data: preferences, error } = await supabase
            .from('daily_summary_preferences')
            .insert({
                organization_id: organizationId,
                location_id: locationId ?? null,
                include_inventory_value: updates.include_inventory_value ?? true,
                include_updated_items: updates.include_updated_items ?? true,
                include_storage_utilization: updates.include_storage_utilization ?? true,
                include_low_stock_items: updates.include_low_stock_items ?? true,
                include_employee_activity: updates.include_employee_activity ?? true,
                include_comparison_metrics: updates.include_comparison_metrics ?? true,
                include_trending_items: updates.include_trending_items ?? false,
                min_significance_threshold: updates.min_significance_threshold ?? 10,
                summary_format: updates.summary_format || 'detailed',
                group_by_location: updates.group_by_location ?? false,
                locations_to_include: updates.locations_to_include || [],
                show_matrix_only_with_stock: updates.show_matrix_only_with_stock ?? false,
            })
            .select()
            .single();

        if (error) throw error;
        return preferences as DailySummaryPreferences;
    }

    // Use .eq('id', existing.id) to be unambiguous — works regardless of location scope
    const { data: preferences, error } = await supabase
        .from('daily_summary_preferences')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

    if (error) { console.log(error, 'error3'); throw error; }
    return preferences as DailySummaryPreferences;
}