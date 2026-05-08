"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@clerk/nextjs";
import {
  getInventoryUpdateRequests,
  getPendingRequestsForItem,
  createInventoryUpdateRequest,
  approveInventoryUpdateRequest,
  rejectInventoryUpdateRequest,
  type CreateInventoryUpdateRequestInput,
} from "@/lib/supabase/queries/inventoryUpdateRequests";
import { sendInventoryAdjustmentNotification } from "@/lib/services/inventoryAdjustmentNotification";

export const inventoryRequestKeys = {
  all:     ["inventory-update-requests"] as const,
  lists:   () => [...inventoryRequestKeys.all, "list"] as const,
  byOrg:   (orgId: string, status?: string) =>
    [...inventoryRequestKeys.lists(), orgId, status ?? "all"] as const,
  pending: (itemId: number, locationId: string, storageSpaceId: string | null) =>
    [...inventoryRequestKeys.all, "pending", itemId, locationId, storageSpaceId] as const,
};

export function useInventoryUpdateRequests(status?: "pending" | "approved" | "rejected") {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  return useQuery({
    queryKey: inventoryRequestKeys.byOrg(orgId ?? "", status),
    queryFn:  () => getInventoryUpdateRequests(orgId!, status),
    enabled:  !!orgId,
    staleTime: 15_000,
  });
}

export function usePendingRequestForItem(
  itemId: number | undefined,
  locationId: string | undefined,
  storageSpaceId: string | null
) {
  return useQuery({
    queryKey: inventoryRequestKeys.pending(itemId ?? 0, locationId ?? "", storageSpaceId),
    queryFn:  () => getPendingRequestsForItem(itemId!, locationId!, storageSpaceId),
    enabled:  !!itemId && !!locationId,
    staleTime: 10_000,
  });
}

export function useCreateInventoryUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInventoryUpdateRequestInput) =>
      createInventoryUpdateRequest(input),
    onSuccess: (data) => {
      sendInventoryAdjustmentNotification(data.id).catch(console.error);
      queryClient.invalidateQueries({ queryKey: inventoryRequestKeys.all });
    },
  });
}

export function useApproveInventoryUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reviewedBy }: { requestId: string; reviewedBy: string }) =>
      approveInventoryUpdateRequest(requestId, reviewedBy),
    onSuccess: () => {
      // Invalidate root key so employee pending badges also clear
      queryClient.invalidateQueries({ queryKey: inventoryRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useRejectInventoryUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      reviewedBy,
      reviewNote,
    }: {
      requestId: string;
      reviewedBy: string;
      reviewNote?: string | null;
    }) => rejectInventoryUpdateRequest(requestId, reviewedBy, reviewNote),
    onSuccess: () => {
      // Invalidate root key so employee pending badges also clear
      queryClient.invalidateQueries({ queryKey: inventoryRequestKeys.all });
    },
  });
}
