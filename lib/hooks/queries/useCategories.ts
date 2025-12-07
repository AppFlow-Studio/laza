import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '@/lib/supabase/queries/categories';

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: getAllCategories,
    });
}

export function useCategory(id: string | null) {
    return useQuery({
        queryKey: ['category', id],
        queryFn: () => getCategoryById(id!),
        enabled: !!id,
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ name, description, organization_id }: { name: string; description?: string; organization_id: string }) =>
            createCategory(name, organization_id, description || null),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: { name?: string; description?: string } }) =>
            updateCategory(id, updates),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            queryClient.invalidateQueries({ queryKey: ['category', variables.id] });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            // Also invalidate items since they reference categories
            queryClient.invalidateQueries({ queryKey: ['items'] });
        },
    });
}