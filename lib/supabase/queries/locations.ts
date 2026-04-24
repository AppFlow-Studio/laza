"use server";

import { createServerSupabaseClient } from '../server';
import { Location, StorageSpace } from '../types';

export async function getAllLocations(organizationId: string) {
    const { auth } = await import('@clerk/nextjs/server');
    const { createServiceRoleClient } = await import('../server');

    const { userId } = await auth();
    if (!userId) return [];

    const supabase = createServiceRoleClient();

    // Get caller role and location assignments
    const { data: caller } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    const { data, error } = await supabase
        .from('locations')
        .select(`
            *,
            storage_spaces (id),
            employees:users (
                id,
                assigned_location:locations (id)
            )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    const callerRole = caller?.role;

    // Super admin sees everything
    if (callerRole === 'super_admin') return data as Location[];

    // Admin: scope to assigned locations, or all if unscoped
    if (callerRole === 'admin') {
        const { data: assignments } = await supabase
            .from('user_location_assignments')
            .select('location_id')
            .eq('user_id', userId);

        const assignedIds = assignments?.map((a: any) => a.location_id) ?? [];

        // No assignments = unscoped admin, sees all
        if (assignedIds.length === 0) return data as Location[];

        return data.filter((l: any) => assignedIds.includes(l.id)) as Location[];
    }

    // Employee: only their assigned location (from junction table)
    if (callerRole === 'employee') {
        const { data: empAssignments } = await supabase
            .from('user_location_assignments')
            .select('location_id')
            .eq('user_id', userId);

        const empLocationId = empAssignments?.[0]?.location_id ?? null;
        if (!empLocationId) return [];
        return data.filter((l: any) => l.id === empLocationId) as Location[];
    }

    return [];
}

async function assertLocationAccess(supabase: any, userId: string, locationId: string) {
    const { data: caller } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (caller?.role === 'super_admin') return; // full access

    if (caller?.role === 'admin') {
        const { data: assignments } = await supabase
            .from('user_location_assignments')
            .select('location_id')
            .eq('user_id', userId);

        const assignedIds = assignments?.map((a: any) => a.location_id) ?? [];
        if (assignedIds.length > 0 && !assignedIds.includes(locationId)) {
            throw new Error('Unauthorized: location not assigned to this admin');
        }
        return;
    }

    throw new Error('Unauthorized');
}

export async function getLocationById(id: string) {
    const { auth } = await import('@clerk/nextjs/server');
    const { createServiceRoleClient } = await import('../server');

    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const supabase = createServiceRoleClient();
    await assertLocationAccess(supabase, userId, id);

    const { data, error } = await supabase
        .from('locations')
        .select(
            `
            *,
            storage_spaces (id),
            employees:users (
                id,
                assigned_location:locations (id)
            )
            `
        )
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as Location;
}

export async function getLocationWithDetails(id: string) {
    const { auth } = await import('@clerk/nextjs/server');
    const { createServiceRoleClient } = await import('../server');

    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const supabase = createServiceRoleClient();
    await assertLocationAccess(supabase, userId, id);

    const { data: location, error: locationError } = await supabase
        .from('locations')
        .select(
            `
            *,
            storage_spaces (id),
            employees:users (
                id,
                assigned_location:locations (id)
            )
            `
        )
        .eq('id', id)
        .single();

    if (locationError) throw locationError;

    const { data: storageSpaces, error: storageError } = await supabase
        .from('storage_spaces')
        .select('*')
        .eq('location_id', id);

    if (storageError) throw storageError;

    const { data: employees, error: employeesError } = await supabase
        .from('user_location_assignments')
        .select('user_id, users!inner(id, is_active)')
        .eq('location_id', id)
        .eq('users.is_active', true);

    if (employeesError) throw employeesError;

    return {
        ...location,
        storage_spaces: storageSpaces as StorageSpace[],
        employee_count: employees?.length || 0,
    };
}

export async function createLocation(location: {
    organization_id: string;
    name: string;
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
        country?: string;
    };
    is_active?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    location_type?: string;
}) {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('locations')
        .insert([location])
        .select()
        .single();

    if (error) throw error;

    // Pre-populate location_catalog with all org items so the new location
    // has access to every item without manual super-admin assignment
    const { data: items } = await supabase
        .from('items')
        .select('id')
        .eq('organization_id', location.organization_id);

    if (items && items.length > 0 && userId) {
        const catalogRecords = items.map((item: { id: string | number }) => ({
            location_id: data.id,
            item_id: item.id,
            assigned_by: userId,
            assigned_at: new Date().toISOString(),
        }));

        const { error: catalogError } = await supabase
            .from('location_catalog')
            .upsert(catalogRecords, { onConflict: 'location_id,item_id' });

        if (catalogError) throw catalogError;
    }

    return data as Location;
}

export async function updateLocation(id: string, updates: Partial<Location>) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as Location;
}

export async function deleteLocation(id: string) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function deactivateLocation(locationId: string, adminUserId: string) {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc('deactivate_location', {
        p_location_id: locationId,
        p_admin_user_id: adminUserId,
    });

    if (error) throw error;
    return data;
}

export async function reactivateLocation(locationId: string, adminUserId: string) {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc('reactivate_location', {
        p_location_id: locationId,
        p_admin_user_id: adminUserId,
    });

    if (error) throw error;
    return data;
}

export async function getStorageSpacesByLocation(locationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('storage_spaces')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data as StorageSpace[];
}

export async function createStorageSpace(storageSpace: {
    location_id: string;
    name: string;
    temperature_type: 'frozen' | 'refrigerated' | 'dry';
}) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('storage_spaces')
        .insert([storageSpace])
        .select()
        .single();

    if (error) throw error;
    return data as StorageSpace;
}

export async function updateStorageSpace(id: string, updates: Partial<StorageSpace>) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('storage_spaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as StorageSpace;
}

export async function deleteStorageSpace(id: string) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
        .from('storage_spaces')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export async function getStorageSpaceById(id: string) {
    const supabase = await createServerSupabaseClient();
    const { data: storageSpace, error: storageError } = await supabase
        .from('storage_spaces')
        .select('*')
        .eq('id', id)
        .single();

    if (storageError) throw storageError;

    const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', storageSpace.location_id)
        .single();

    if (locationError) throw locationError;

    return {
        ...storageSpace,
        location: location as Location,
    };
}