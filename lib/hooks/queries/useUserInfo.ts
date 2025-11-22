'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserById } from '@/lib/supabase/queries/user';
import { useUser } from '@clerk/nextjs';

export function useUserInfo() {
    const { user } = useUser();
   
    return useQuery({
        queryKey: ['userInfo', user?.id],
        queryFn: () => getUserById(user?.id),
    });
}   