import { useMutation, useQueryClient } from '@tanstack/react-query'
import { upsertItemPricing } from '@/lib/supabase/mutations/itemPricing'
import toast from 'react-hot-toast'

export function useUpsertItemPricing(previousPrice?: number | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: upsertItemPricing,
    onSuccess: (_, variables) => {
      const prev = previousPrice != null ? `$${previousPrice.toFixed(2)}` : null
      const next = `$${variables.warehouseTransferPrice.toFixed(2)}`
      toast.success(prev ? `Price updated — ${prev} → ${next}.` : `Price set — ${next}.`)
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['item_warehouse_pricing'] })
    },
    onError: (error: Error) => {
      toast.error(`Failed to update price: ${error.message}`)
    },
  })
}
