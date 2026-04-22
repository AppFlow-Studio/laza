"use server"

import { createServiceRoleClient } from '@/lib/supabase/server'

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
