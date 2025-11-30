"use client";

import { useQuery } from '@tanstack/react-query';
import {
    getEmailDeliveryLogs,
    type EmailDeliveryLogFilters,
} from '@/lib/supabase/queries/emailDelivery';

export function useEmailDeliveryLogs(
    organizationId: string | null,
    filters?: EmailDeliveryLogFilters
) {
    return useQuery({
        queryKey: ['email-delivery-logs', organizationId, filters],
        queryFn: () => getEmailDeliveryLogs(organizationId!, filters),
        enabled: !!organizationId,
    });
}

