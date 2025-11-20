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
} from '@/lib/supabase/queries/items';

export function useItems() {
    return useQuery({
        queryKey: ['items'],
        queryFn: getAllItems,
    });
}

export function useItem(id: string | null) {
    return useQuery({
        queryKey: ['item', id],
        queryFn: () => getItemById(id!),
        enabled: !!id,
    });
}

export function useItemsByCategory(category: 'desserts' | 'ingredients' | 'supplies' | null) {
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
        mutationFn: createItem,
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

