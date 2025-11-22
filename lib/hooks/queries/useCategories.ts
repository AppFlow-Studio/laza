import { useQuery } from '@tanstack/react-query';
import { getAllCategories } from '@/lib/supabase/queries/categories';

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: getAllCategories,
    });
}