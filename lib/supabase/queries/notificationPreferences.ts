"use server";

import { createServerSupabaseClient } from '../server';

// Types
export interface NotificationPreferences {
    id: string;
    organization_id: string;
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

// Get notification preferences
export async function getNotificationPreferences(organizationId: string): Promise<NotificationPreferences | null> {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

    if (error) {
        console.log(error, 'error1')
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }

    // console.log(data, 'Get Notification Preferences: data')

    return data as NotificationPreferences;
}

// Create notification preferences
export async function createNotificationPreferences(
    organizationId: string,
    data: Partial<Omit<NotificationPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<NotificationPreferences> {
    const supabase = createServerSupabaseClient();
    const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .insert({
            organization_id: organizationId,
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
    console.log(error)
    return preferences as NotificationPreferences;
}

// Update notification preferences
export async function updateNotificationPreferences(
    organizationId: string,
    updates: Partial<Omit<NotificationPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<NotificationPreferences> {
    const supabase = await createServerSupabaseClient();
    const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('organization_id', organizationId)
        .select()
        .single();

    if (error) { console.log(error, 'error2'); throw error };
    return preferences as NotificationPreferences;
}

// Get low stock thresholds
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

    if (filters?.itemId) {
        query = query.eq('item_id', filters.itemId);
    }
    if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
    }
    if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) { console.log(error, 'error3'); throw error };
    return data as LowStockThreshold[];
}

// Create low stock threshold
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

    if (error) { console.log(error, 'error3'); throw error };
    return threshold as LowStockThreshold;
}

// Update low stock threshold
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

    if (error) { console.log(error, 'error3'); throw error };
    return threshold as LowStockThreshold;
}

// Delete low stock threshold
export async function deleteLowStockThreshold(id: string): Promise<void> {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
        .from('low_stock_thresholds')
        .delete()
        .eq('id', id);

    if (error) { console.log(error, 'error3'); throw error };
}

// Get daily summary preferences
export async function getDailySummaryPreferences(organizationId: string): Promise<DailySummaryPreferences | null> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('daily_summary_preferences')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }

    return data as DailySummaryPreferences;
}

// Update daily summary preferences
export async function updateDailySummaryPreferences(
    organizationId: string,
    updates: Partial<Omit<DailySummaryPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>
): Promise<DailySummaryPreferences> {
    const supabase = await createServerSupabaseClient();

    // Check if preferences exist
    const existing = await getDailySummaryPreferences(organizationId);

    if (!existing) {
        // Create if doesn't exist
        const { data: preferences, error } = await supabase
            .from('daily_summary_preferences')
            .insert({
                organization_id: organizationId,
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

    // Update existing
    const { data: preferences, error } = await supabase
        .from('daily_summary_preferences')
        .update(updates)
        .eq('organization_id', organizationId)
        .select()
        .single();

    if (error) { console.log(error, 'error3'); throw error };
    return preferences as DailySummaryPreferences;
}

