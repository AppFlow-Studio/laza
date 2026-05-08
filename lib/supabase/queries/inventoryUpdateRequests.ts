"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CreateInventoryUpdateRequestInput {
  orgId:           string;
  locationId:      string;
  storageSpaceId:  string | null;
  itemId:          number;
  requestedBy:     string;
  actionType:      "count" | "adjustment" | "used";
  newQuantity:     number;
  previousQuantity: number;
  notes?:          string | null;
}

export async function createInventoryUpdateRequest(
  input: CreateInventoryUpdateRequestInput
): Promise<string> {
  const supabase = createServerSupabaseClient();

  // Replace any existing pending request for the same item+location+storage slot
  const deleteQuery = supabase
    .from("inventory_update_requests")
    .delete()
    .eq("item_id",     input.itemId)
    .eq("location_id", input.locationId)
    .eq("status",      "pending");

  const { error: deleteError } = input.storageSpaceId
    ? await deleteQuery.eq("storage_space_id", input.storageSpaceId)
    : await deleteQuery.is("storage_space_id", null);

  if (deleteError) throw deleteError;

  const { data, error } = await supabase.from("inventory_update_requests").insert({
    org_id:            input.orgId,
    location_id:       input.locationId,
    storage_space_id:  input.storageSpaceId,
    item_id:           input.itemId,
    requested_by:      input.requestedBy,
    action_type:       input.actionType,
    new_quantity:      input.newQuantity,
    previous_quantity: input.previousQuantity,
    notes:             input.notes ?? null,
    status:            "pending",
  }).select('id').single();

  if (error) throw error;
  return data.id as string;
}

export async function getInventoryUpdateRequests(
  orgId: string,
  status?: "pending" | "approved" | "rejected"
) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("inventory_update_requests")
    .select(`
      id,
      org_id,
      location_id,
      storage_space_id,
      item_id,
      requested_by,
      action_type,
      new_quantity,
      previous_quantity,
      notes,
      status,
      reviewed_by,
      reviewed_at,
      review_note,
      created_at,
      items ( id, name, unit_of_measure ),
      storage_spaces ( id, name )
    `)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPendingRequestsForItem(
  itemId: number,
  locationId: string,
  storageSpaceId: string | null
) {
  const supabase = createServerSupabaseClient();
  const baseQuery = supabase
    .from("inventory_update_requests")
    .select("id, status, new_quantity, created_at")
    .eq("item_id",     itemId)
    .eq("location_id", locationId)
    .eq("status",      "pending");

  const { data, error } = storageSpaceId
    ? await baseQuery.eq("storage_space_id", storageSpaceId)
    : await baseQuery.is("storage_space_id", null);

  if (error) throw error;
  return data ?? [];
}

export async function approveInventoryUpdateRequest(
  requestId: string,
  reviewedBy: string
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc("approve_inventory_update_request", {
    p_request_id:  requestId,
    p_reviewed_by: reviewedBy,
  });
  if (error) throw error;
}

export async function rejectInventoryUpdateRequest(
  requestId: string,
  reviewedBy: string,
  reviewNote?: string | null
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.rpc("reject_inventory_update_request", {
    p_request_id:  requestId,
    p_reviewed_by: reviewedBy,
    p_review_note: reviewNote ?? null,
  });
  if (error) throw error;
}
