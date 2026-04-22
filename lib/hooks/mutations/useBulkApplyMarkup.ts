import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bulkApplyMarkup } from '@/lib/supabase/mutations/itemPricing'
import toast from 'react-hot-toast'

export function useBulkApplyMarkup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkApplyMarkup,
    onSuccess: (data) => {
      toast.success(`${data.length} item(s) updated — see Price History.`)
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['item_warehouse_pricing'] })
    },
    onError: (error: Error) => {
      toast.error(`Markup failed: ${error.message}`)
    },
  })
}
