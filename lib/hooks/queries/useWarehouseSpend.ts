import { useQuery } from "@tanstack/react-query";
import { getMonthlySpendAction } from "@/lib/supabase/actions/warehouseSpendActions";

export function useMonthlySpend(locationId: string | null | undefined) {
    return useQuery({
        queryKey: ["warehouse-spend-monthly", locationId],
        queryFn: () => getMonthlySpendAction(locationId!),
        enabled: !!locationId,
        staleTime: 5 * 60_000,
    });
}
