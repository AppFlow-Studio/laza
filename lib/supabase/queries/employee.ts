"use server";

import { createServerSupabaseClient } from '../server';
import { Location, StorageSpace } from '../types';

export async function getEmployeeLocation(userId: string) {
    const supabase = await createServerSupabaseClient();

    // Get a user's assigned location from the junction table
    const { data: assignment, error: assignmentError } = await supabase
        .from('user_location_assignments')
        .select('location_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

    console.log(assignment)

    if (assignmentError) throw assignmentError;
    if (!assignment?.location_id) {
        throw new Error('No location assigned to employee');
    }

    // Get location details
    const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', assignment.location_id)
        .single();

    if (locationError) {
        console.log('location', location);
        console.log('locationError', locationError);
        throw locationError;
    }
    return location as Location;
}

export async function getEmployeeStorageSpaces(locationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('storage_spaces')
        .select('*')
        .eq('location_id', locationId)
        .order('name', { ascending: true });

    if (error) throw error;
    return data as StorageSpace[];
}

export async function getStorageSpaceById(storageSpaceId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('storage_spaces')
        .select('*')
        .eq('id', storageSpaceId)
        .single();

    if (error) throw error;
    return data as StorageSpace;
}

export async function getStorageSpaceItems(storageSpaceId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('item_locations')
        .select(`
            *,
            items (
                *,
                category (*)
            )
        `)
        .eq('storage_space_id', storageSpaceId);

    if (error) throw error;

    // Sort by item name
    const sorted = (data || []).sort((a: any, b: any) => {
        const nameA = a.items?.name || '';
        const nameB = b.items?.name || '';
        return nameA.localeCompare(nameB);
    });

    return sorted as any[];
}

export async function getEmployeeInventoryLogs(locationId: string, limit: number = 50) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('inventory_logs')
        .select(`
            *,
            items (*),
            storage_spaces (*),
            users (*)
        `)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data as any[];
}

export async function getStorageSpaceLogs(storageSpaceId: string, limit: number = 50) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('inventory_logs')
        .select(`
            *,
            items (*),
            storage_spaces (*),
            users (*)
        `)
        .eq('storage_space_id', storageSpaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data as any[];
}

export async function getEmployeeStats(userId: string, locationId: string) {
    const supabase = await createServerSupabaseClient();

    // Get total updates made by employee
    const { count: totalUpdates } = await supabase
        .from('inventory_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('location_id', locationId);

    // Get updates this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { count: weeklyUpdates } = await supabase
        .from('inventory_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('location_id', locationId)
        .gte('created_at', weekAgo.toISOString());

    // Get last activity
    const { data: lastActivity } = await supabase
        .from('inventory_logs')
        .select('created_at')
        .eq('user_id', userId)
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Get items managed count
    const { count: itemsManaged } = await supabase
        .from('item_locations')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId);

    return {
        totalUpdates: totalUpdates || 0,
        weeklyUpdates: weeklyUpdates || 0,
        itemsManaged: itemsManaged || 0,
        lastActivity: lastActivity?.created_at || null,
    };
}

