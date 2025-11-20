"use client";

import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';

export function useSupabaseClient() {
    const { getToken } = useAuth();

    const supabase = useMemo(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!;

        return createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            global: {
                fetch: async (url, options = {}) => {
                    const token = await getToken({ template: 'supabase' });
                    const headers = new Headers(options.headers);
                    if (token) {
                        headers.set('Authorization', `Bearer ${token}`);
                    }
                    return fetch(url, { ...options, headers });
                },
            },
        });
    }, [getToken]);

    return supabase;
}

