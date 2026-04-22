"use server"

import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function upsertItemPricing({
  itemId,
  warehouseTransferPrice,
  cbmPerCarton,
  updatedBy,
}: {
  itemId: number
  warehouseTransferPrice: number
  cbmPerCarton?: number | null
  updatedBy: string
}) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('item_warehouse_pricing')
    .upsert(
      {
        item_id: itemId,
        warehouse_transfer_price: warehouseTransferPrice,
        updated_by: updatedBy,
      },
      { onConflict: 'item_id' }
    )

  if (error) throw error

  // Update cbm_per_carton on items table separately
  if (cbmPerCarton !== undefined) {
    const { error: itemError } = await supabase
      .from('items')
      .update({ cbm_per_carton: cbmPerCarton })
      .eq('id', itemId)
    if (itemError) throw itemError
  }
}

export async function bulkApplyMarkup({
  itemIds,
  mode,
  markupPct,
  reason,
}: {
  itemIds: number[]
  mode: 'percentage_increase' | 'markup_over_cost'
  markupPct: number
  reason?: string | null
}) {
  // Must use server client (Clerk JWT) so bulk_apply_markup's is_super_admin() check passes
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.rpc('bulk_apply_markup', {
    p_item_ids: itemIds,
    p_mode: mode,
    p_markup_pct: markupPct,
    p_reason: reason ?? null,
  })
  if (error) throw error
  return data as Array<{ item_id: number; previous_price: number; new_price: number }>
}
