'use server';

import { createServerSupabaseClient } from '../server';

export interface UpdateLimit {
    id: string;
    location_id: string;
    storage_space_id: string | null;
    max_updates_per_window: number;
    time_window_start: string; // TIME format 'HH:MM:SS'
    time_window_end: string; // TIME format 'HH:MM:SS'
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface UpdateLimitInput {
    location_id: string;
    storage_space_id?: string | null;
    max_updates_per_window: number;
    time_window_start: string;
    time_window_end: string;
    is_active?: boolean;
}

export interface CheckUpdateAllowedResult {
    allowed: boolean;
    reason?: string;
    remaining?: number;
    limit?: number;
    currentCount?: number;
}

export async function getUpdateLimit(locationId: string, storageSpaceId: string | null) {
    const supabase = createServerSupabaseClient();

    // First try to get storage-space-specific limit
    if (storageSpaceId) {
        const { data, error } = await supabase
            .from('update_limits')
            .select('*')
            .eq('location_id', locationId)
            .eq('storage_space_id', storageSpaceId)
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) return data as UpdateLimit;
    }

    // Fall back to location-wide default (storage_space_id is NULL)
    const { data, error } = await supabase
        .from('update_limits')
        .select('*')
        .eq('location_id', locationId)
        .is('storage_space_id', null)
        .eq('is_active', true)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as UpdateLimit | null;
}

export async function getUpdateLimitsByLocation(locationId: string) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('update_limits')
        .select(`
            *,
            storage_spaces(id, name)
        `)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any[];
}

export async function createUpdateLimit(input: UpdateLimitInput) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('update_limits')
        .insert({
            location_id: input.location_id,
            storage_space_id: input.storage_space_id || null,
            max_updates_per_window: input.max_updates_per_window,
            time_window_start: input.time_window_start,
            time_window_end: input.time_window_end,
            is_active: input.is_active !== undefined ? input.is_active : true,
        })
        .select()
        .single();

    if (error) throw error;
    return data as UpdateLimit;
}

export async function updateUpdateLimit(id: string, updates: Partial<UpdateLimitInput>) {
    const supabase = createServerSupabaseClient();
    const updateData: any = {
        updated_at: new Date().toISOString(),
    };

    if (updates.max_updates_per_window !== undefined) {
        updateData.max_updates_per_window = updates.max_updates_per_window;
    }
    if (updates.time_window_start !== undefined) {
        updateData.time_window_start = updates.time_window_start;
    }
    if (updates.time_window_end !== undefined) {
        updateData.time_window_end = updates.time_window_end;
    }
    if (updates.is_active !== undefined) {
        updateData.is_active = updates.is_active;
    }

    const { data, error } = await supabase
        .from('update_limits')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as UpdateLimit;
}

export async function deleteUpdateLimit(id: string) {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
        .from('update_limits')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function checkUpdateAllowed(
    itemId: string,
    locationId: string,
    storageSpaceId: string | null,
    userId: string
): Promise<CheckUpdateAllowedResult> {
    const supabase = createServerSupabaseClient();

    // Get user role
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (userError) throw userError;

    // Admins can always update
    if (user?.role === 'admin') {
        return { allowed: true };
    }

    // Get update limit config
    const limit = await getUpdateLimit(locationId, storageSpaceId);

    // If no limit configured, allow update
    if (!limit) {
        return { allowed: true };
    }

    // Get update count in current window using the database function
    const { data: countData, error: countError } = await supabase
        .rpc('get_update_count_in_window', {
            p_item_id: itemId,
            p_location_id: locationId,
            p_storage_space_id: storageSpaceId,
            p_user_id: userId,
            p_time_window_start: limit.time_window_start,
            p_time_window_end: limit.time_window_end,
        });

    if (countError) throw countError;

    const currentCount = countData || 0;
    const remaining = Math.max(0, limit.max_updates_per_window - currentCount);

    if (currentCount >= limit.max_updates_per_window) {
        return {
            allowed: false,
            reason: 'limit_reached',
            remaining: 0,
            limit: limit.max_updates_per_window,
            currentCount,
        };
    }

    return {
        allowed: true,
        remaining,
        limit: limit.max_updates_per_window,
        currentCount,
    };
}

export async function createOverrideLog(data: {
    inventory_log_id: string;
    item_id: string;
    location_id: string;
    storage_space_id: string | null;
    admin_user_id: string;
    employee_user_id?: string | null;
    override_reason?: string | null;
}) {
    const supabase = createServerSupabaseClient();
    const { data: overrideLog, error } = await supabase
        .from('update_override_logs')
        .insert({
            inventory_log_id: data.inventory_log_id,
            item_id: data.item_id,
            location_id: data.location_id,
            storage_space_id: data.storage_space_id,
            admin_user_id: data.admin_user_id,
            employee_user_id: data.employee_user_id || null,
            override_reason: data.override_reason || null,
        })
        .select()
        .single();

    if (error) {
        throw error;
    };
    return overrideLog;
}

