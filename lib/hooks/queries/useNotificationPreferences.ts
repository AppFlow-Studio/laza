"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getNotificationPreferences,
    createNotificationPreferences,
    updateNotificationPreferences,
    getAllLocationNotificationPreferences,
    getLowStockThresholds,
    createLowStockThreshold,
    updateLowStockThreshold,
    deleteLowStockThreshold,
    getDailySummaryPreferences,
    updateDailySummaryPreferences,
    type NotificationPreferences,
    type LowStockThreshold,
    type DailySummaryPreferences,
} from '@/lib/supabase/queries/notificationPreferences';

// ─── Notification Preferences ─────────────────────────────────────────────────

/**
 * Fetch the preferences row for a given scope.
 *
 * Admin usage:      useNotificationPreferences(orgId, locationId)
 * Super admin:      useNotificationPreferences(orgId)          ← org-wide default
 * Original callers: useNotificationPreferences(orgId)          ← unchanged behaviour
 */
export function useNotificationPreferences(
    organizationId: string | null,
    locationId?: string | null,
) {
    return useQuery({
        queryKey: ['notification-preferences', organizationId, locationId ?? 'org'],
        queryFn: () => getNotificationPreferences(organizationId!, locationId),
        enabled: !!organizationId,
    });
}

export function useUpdateNotificationPreferences() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
                         organizationId,
                         updates,
                         locationId,
                     }: {
            organizationId: string;
            updates: Partial<Omit<NotificationPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;
            locationId?: string | null;
        }) => updateNotificationPreferences(organizationId, updates, locationId),
        onSuccess: (_, { organizationId, locationId }) => {
            // Invalidate both the specific scoped key and any broader org key
            queryClient.invalidateQueries({
                queryKey: ['notification-preferences', organizationId],
            });
            if (locationId) {
                queryClient.invalidateQueries({
                    queryKey: ['all-location-notification-preferences', organizationId],
                });
            }
        },
    });
}

export function useCreateNotificationPreferences() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
                         organizationId,
                         data,
                         locationId,
                     }: {
            organizationId: string;
            data: Partial<Omit<NotificationPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;
            locationId?: string | null;
        }) => createNotificationPreferences(organizationId, data, locationId),
        onSuccess: (_, { organizationId }) => {
            queryClient.invalidateQueries({
                queryKey: ['notification-preferences', organizationId],
            });
        },
    });
}

/**
 * Super Admin: all location-specific preference rows joined with location name.
 */
export function useAllLocationNotificationPreferences(
    organizationId: string | null,
) {
    return useQuery({
        queryKey: ['all-location-notification-preferences', organizationId],
        queryFn: () => getAllLocationNotificationPreferences(organizationId!),
        enabled: !!organizationId,
        staleTime: 60_000,
    });
}

// ─── Low Stock Thresholds (call signatures unchanged) ─────────────────────────

export function useLowStockThresholds(
    organizationId: string | null,
    filters?: {
        itemId?: string;
        categoryId?: string;
        locationId?: string;
        isActive?: boolean;
    }
) {
    return useQuery({
        queryKey: ['low-stock-thresholds', organizationId, filters],
        queryFn: () => getLowStockThresholds(organizationId!, filters as any),
        enabled: !!organizationId,
    });
}

export function useCreateLowStockThreshold() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Omit<LowStockThreshold, 'id' | 'created_at' | 'updated_at'>) =>
            createLowStockThreshold(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['low-stock-thresholds', data.organization_id] });
        },
    });
}

export function useUpdateLowStockThreshold() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
                         id,
                         updates,
                     }: {
            id: string;
            updates: Partial<Omit<LowStockThreshold, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;
        }) => updateLowStockThreshold(id, updates),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['low-stock-thresholds', data.organization_id] });
        },
    });
}

export function useDeleteLowStockThreshold() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { id: string; organizationId: string }) => deleteLowStockThreshold(data.id),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['low-stock-thresholds', variables.organizationId] });
        },
    });
}

// ─── Daily Summary Preferences ────────────────────────────────────────────────

/**
 * Admin usage:      useDailySummaryPreferences(orgId, locationId)
 * Super admin:      useDailySummaryPreferences(orgId)
 * Original callers: useDailySummaryPreferences(orgId)          ← unchanged
 */
export function useDailySummaryPreferences(
    organizationId: string | null,
    locationId?: string | null,
) {
    return useQuery({
        queryKey: ['daily-summary-preferences', organizationId, locationId ?? 'org'],
        queryFn: () => getDailySummaryPreferences(organizationId!, locationId),
        enabled: !!organizationId,
    });
}

export function useUpdateDailySummaryPreferences() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
                         organizationId,
                         updates,
                         locationId,
                     }: {
            organizationId: string;
            updates: Partial<Omit<DailySummaryPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;
            locationId?: string | null;
        }) => updateDailySummaryPreferences(organizationId, updates, locationId),
        onSuccess: (_, { organizationId }) => {
            queryClient.invalidateQueries({
                queryKey: ['daily-summary-preferences', organizationId],
            });
        },
    });
}