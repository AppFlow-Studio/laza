'use client';

import { useQuery } from '@tanstack/react-query';
import { getUserById } from '@/lib/supabase/queries/user';
import { useUser } from '@clerk/nextjs';

export function useUserInfo() {
    const { user } = useUser();

    return useQuery({
        queryKey: ['userInfo', user?.id],
        queryFn: () => getUserById(user?.id ?? null),
        enabled: !!user?.id,
        // Right after accepting an invite the Clerk webhook may still be creating
        // the users row — keep polling briefly instead of hanging until a refresh.
        refetchInterval: (query) => (query.state.data === null ? 1500 : false),
    });
}
