"use server"

import { createServerSupabaseClient } from '@/lib/supabase/server'

export type PriceHistoryRecord = {
  id: string
  item_id: number
  previous_price: number | null
  new_price: number
  change_source: string
  batch_id: string | null
  change_reason: string | null
  changed_by: string
  created_at: string
}

export async function getItemPriceHistory(itemId: number): Promise<PriceHistoryRecord[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('warehouse_transfer_price_history')
    .select('id, item_id, previous_price, new_price, change_source, batch_id, change_reason, changed_by, created_at')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}
