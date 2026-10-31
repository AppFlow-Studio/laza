'use client';

import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';

export function useCanManageCatalog() {
    const { data: user } = useUserInfo();
    return user?.role === 'super_admin';
}
