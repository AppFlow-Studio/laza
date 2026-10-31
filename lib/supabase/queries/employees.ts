"use server";

import { createServerSupabaseClient } from '../server';
import { User } from '../types';

export async function getAllEmployees(organizationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('members')
        .select('users(*)')
        .eq('organization_id', organizationId)
        .eq('users.role', 'employee')
        .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten so consumers get User objects directly
    return (data ?? [])
        .map((row: any) => row.users)
        .filter(Boolean) as User[];
}

export async function getEmployeeById(id: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as User;
}

export async function getEmployeesByLocation(locationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('user_location_assignments')
        .select('users!inner(*)')
        .eq('location_id', locationId)
        .eq('users.is_active', true);

    if (error) throw error;
    return ((data ?? []).map((row: any) => row.users).filter(Boolean)) as User[];
}

export async function updateEmployee(id: string, updates: Partial<User>) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as User;
}

export async function assignEmployeeToLocation(employeeId: string, locationId: string | null) {
    const supabase = await createServerSupabaseClient();

    // Remove any existing assignment(s) for this employee
    const { error: deleteError } = await supabase
        .from('user_location_assignments')
        .delete()
        .eq('user_id', employeeId);

    if (deleteError) throw deleteError;

    // Insert new assignment if a location was provided
    if (locationId) {
        const { error: insertError } = await supabase
            .from('user_location_assignments')
            .insert({ user_id: employeeId, location_id: locationId });

        if (insertError) throw insertError;
    }

    // Return the updated user record
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', employeeId)
        .single();

    if (error) throw error;
    return data as User;
}

export async function bulkAssignEmployees(employeeIds: string[], locationId: string | null) {
    const supabase = await createServerSupabaseClient();

    // Remove existing assignments for all specified employees
    const { error: deleteError } = await supabase
        .from('user_location_assignments')
        .delete()
        .in('user_id', employeeIds);

    if (deleteError) throw deleteError;

    // Insert new assignments if a location was provided
    if (locationId && employeeIds.length > 0) {
        const rows = employeeIds.map((userId) => ({ user_id: userId, location_id: locationId }));
        const { error: insertError } = await supabase
            .from('user_location_assignments')
            .insert(rows);

        if (insertError) throw insertError;
    }

    // Return updated user records
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', employeeIds);

    if (error) throw error;
    return data as User[];
}

export async function activateEmployee(id: string, isActive: boolean) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as User;
}

