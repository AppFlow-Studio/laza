import { useQuery } from '@tanstack/react-query'
import { getItemPriceHistory } from '@/lib/supabase/queries/priceHistory'

export function useItemPriceHistory(itemId: number | null) {
  return useQuery({
    queryKey: ['price_history', itemId],
    queryFn: () => getItemPriceHistory(itemId!),
    enabled: itemId != null,
    staleTime: 5 * 60_000,
  })
}
