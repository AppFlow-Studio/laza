import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@clerk/nextjs";
import { useAdminStore } from "@/lib/stores/adminStore";
import {
  getStorePurchases,
  getStorePurchaseById,
  createStorePurchase,
  type CreateStorePurchaseInput,
} from "@/lib/supabase/queries/storePurchases";

export const storePurchaseKeys = {
  all:    ["store-purchases"] as const,
  lists:  () => [...storePurchaseKeys.all, "list"] as const,
  byLocation: (orgId: string, locationId: string) =>
    [...storePurchaseKeys.lists(), orgId, locationId] as const,
  detail: (id: string) => [...storePurchaseKeys.all, "detail", id] as const,
};

export function useStorePurchases() {
  const { organization } = useOrganization();
  const { selectedLocationId } = useAdminStore();
  const orgId = organization?.id;

  return useQuery({
    queryKey: storePurchaseKeys.byLocation(orgId ?? "", selectedLocationId ?? ""),
    queryFn:  () => getStorePurchases(orgId!, selectedLocationId!),
    enabled:  !!orgId && !!selectedLocationId,
    staleTime: 30_000,
  });
}

export function useStorePurchase(id: string | undefined) {
  return useQuery({
    queryKey: storePurchaseKeys.detail(id ?? ""),
    queryFn:  () => getStorePurchaseById(id!),
    enabled:  !!id,
    staleTime: 60_000,
  });
}

export function useCreateStorePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStorePurchaseInput) => createStorePurchase(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storePurchaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
