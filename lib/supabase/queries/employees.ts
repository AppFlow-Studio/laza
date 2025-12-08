"use server";

import { createServerSupabaseClient } from '../server';
import { User } from '../types';

export async function getAllEmployees(organizationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('members')
        .select('users(*)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as {
        members: {
            id: string;
            organization_id: string;
            user_id: string;
            created_at: string;
            updated_at: string;
        }
        users: User;
    }[];
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
        .from('users')
        .select('*')
        .eq('assigned_location_id', locationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as User[];
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
    const { data, error } = await supabase
        .from('users')
        .update({ assigned_location_id: locationId })
        .eq('id', employeeId)
        .select()
        .single();

    if (error) throw error;
    return data as User;
}

export async function bulkAssignEmployees(employeeIds: string[], locationId: string | null) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('users')
        .update({ assigned_location_id: locationId })
        .in('id', employeeIds)
        .select();

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

