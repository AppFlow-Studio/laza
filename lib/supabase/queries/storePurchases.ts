"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface StorePurchaseItem {
  itemId: number;
  quantity: number;
  unitCost: number;
  storageSpaceId?: string | null;
}

export interface CreateStorePurchaseInput {
  orgId: string;
  locationId: string;
  purchasedBy: string;
  purchasedAt: string; // ISO string
  supplierName?: string | null;
  notes?: string | null;
  items: StorePurchaseItem[];
}

export async function createStorePurchase(input: CreateStorePurchaseInput): Promise<string> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("create_store_purchase", {
    p_org_id:        input.orgId,
    p_location_id:   input.locationId,
    p_purchased_by:  input.purchasedBy,
    p_purchased_at:  input.purchasedAt,
    p_supplier_name: input.supplierName ?? null,
    p_notes:         input.notes ?? null,
    p_items: input.items.map((i) => ({
      item_id:          i.itemId,
      quantity:         i.quantity,
      unit_cost:        i.unitCost,
      storage_space_id: i.storageSpaceId ?? null,
    })),
  });
  if (error) throw error;
  return data as string;
}

export async function getStorePurchases(orgId: string, locationId: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("store_purchases")
    .select(`
      id,
      purchased_at,
      supplier_name,
      notes,
      total_cost,
      purchased_by,
      created_at,
      store_purchase_items (
        id,
        item_id,
        quantity,
        unit_cost,
        line_total,
        items ( id, name, unit_of_measure )
      )
    `)
    .eq("org_id", orgId)
    .eq("location_id", locationId)
    .order("purchased_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getStorePurchaseById(id: string) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("store_purchases")
    .select(`
      id,
      purchased_at,
      supplier_name,
      notes,
      total_cost,
      purchased_by,
      created_at,
      location_id,
      org_id,
      store_purchase_items (
        id,
        item_id,
        quantity,
        unit_cost,
        line_total,
        storage_space_id,
        storage_spaces ( id, name ),
        items ( id, name, unit_of_measure, sku )
      )
    `)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
