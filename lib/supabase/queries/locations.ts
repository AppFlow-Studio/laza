"use server";

import { createServerSupabaseClient } from '../server';
import { Location, StorageSpace } from '../types';

export async function getAllLocations(organizationId: string) {
    const supabase = await createServerSupabaseClient();
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
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Location[];
}

export async function getLocationById(id: string) {
    const supabase = await createServerSupabaseClient();
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
    const supabase = await createServerSupabaseClient();
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
        .from('users')
        .select('id')
        .eq('assigned_location_id', id)
        .eq('is_active', true);

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
}) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('locations')
        .insert([location])
        .select()
        .single();

    if (error) throw error;
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

