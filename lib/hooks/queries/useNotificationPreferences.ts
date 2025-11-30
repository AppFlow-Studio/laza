"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getNotificationPreferences,
    createNotificationPreferences,
    updateNotificationPreferences,
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

// Notification Preferences Hooks
export function useNotificationPreferences(organizationId: string | null) {
    return useQuery({
        queryKey: ['notification-preferences', organizationId],
        queryFn: () => getNotificationPreferences(organizationId!),
        enabled: !!organizationId,
    });
}

export function useUpdateNotificationPreferences() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            organizationId,
            updates,
        }: {
            organizationId: string;
            updates: Partial<Omit<NotificationPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;
        }) => updateNotificationPreferences(organizationId, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notification-preferences', variables.organizationId] });
        },
    });
}

export function useCreateNotificationPreferences() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            organizationId,
            data,
        }: {
            organizationId: string;
            data: Partial<Omit<NotificationPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;
        }) => createNotificationPreferences(organizationId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notification-preferences', variables.organizationId] });
        },
    });
}

// Low Stock Thresholds Hooks
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
        queryFn: () => getLowStockThresholds(organizationId!, filters),
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

// Daily Summary Preferences Hooks
export function useDailySummaryPreferences(organizationId: string | null) {
    return useQuery({
        queryKey: ['daily-summary-preferences', organizationId],
        queryFn: () => getDailySummaryPreferences(organizationId!),
        enabled: !!organizationId,
    });
}

export function useUpdateDailySummaryPreferences() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            organizationId,
            updates,
        }: {
            organizationId: string;
            updates: Partial<Omit<DailySummaryPreferences, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>;
        }) => updateDailySummaryPreferences(organizationId, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['daily-summary-preferences', variables.organizationId] });
        },
    });
}

