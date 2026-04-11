"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAllItems,
    getItemById,
    getItemsByCategory,
    searchItems,
    createItem,
    updateItem,
    deleteItem,
    bulkUpdateItems,
    bulkDeleteItems,
} from '@/lib/supabase/queries/items';
import { Item } from '@/lib/supabase/types';
import { useUserInfo } from './useUserInfo';

export function useItems() {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    return useQuery({
        queryKey: ['items', organizationId],
        queryFn: () => getAllItems(organizationId!),
        enabled: !!organizationId,
    });
}

export function useItem(id: string | null) {
    return useQuery({
        queryKey: ['item', id],
        queryFn: () => getItemById(id!),
        enabled: !!id,
    });
}

export function useItemsByCategory(category: string | null) {
    return useQuery({
        queryKey: ['items', 'category', category],
        queryFn: () => getItemsByCategory(category!),
        enabled: !!category,
    });
}

export function useSearchItems(query: string) {
    return useQuery({
        queryKey: ['items', 'search', query],
        queryFn: () => searchItems(query),
        enabled: query.length > 0,
    });
}

export function useCreateItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ item }: {
            item: {
                organization_id: string;
                name: string;
                sku?: string | null;
                category_id: number | null;
                unit_of_measure: 'pcs' | 'kg' | 'liters' | 'lbs' | 'oz';
                min_quantity: number;
            }
        }) => createItem(item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
        },
    });
}

export function useUpdateItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: any }) => updateItem(id, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['item', variables.id] });
        },
    });
}

export function useDeleteItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
        },
    });
}

export function useBulkUpdateItems() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ itemIds, updates }: { itemIds: string[]; updates: Partial<Item> }) =>
            bulkUpdateItems(itemIds, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
        },
    });
}

export function useBulkDeleteItems() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (itemIds: string[]) => bulkDeleteItems(itemIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
        },
    });
}

