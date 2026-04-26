/**
 * lib/hooks/queries/useOrderTickets.ts
 *
 * React Query hooks for the order ticket system.
 * Follows the pattern in lib/hooks/queries/usePallets.ts:
 *   - Reads  → server actions
 *   - Writes → direct query functions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
	getTicketsByLocationAction,
	getAllTicketsAction,
	getTicketByIdAction,
	getPendingTicketCountAction,
	getRemainderTicketsAction,
	getAutoApprovedTicketsAction,
	getTicketsWithDiscrepanciesAction,
	getTicketItemCostsAction,
} from "@/lib/supabase/actions/orderTicketActions";
import {
	createTicket,
	cancelTicket,
	confirmTicket,
	rejectTicket,
	updateTicketStatus,
	type CreateTicketInput,
	type TicketFilters,
	type ReceivedItem,
} from "@/lib/supabase/queries/orderTickets";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { checkWarehouseLowStockAfterFulfillment } from "@/lib/supabase/actions/warehouseLowStockActions";

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const ticketKeys = {
	all:            ["tickets"] as const,
	lists:          ()                                             => [...ticketKeys.all, "list"] as const,
	byLocation:     (locationId: string, filters?: TicketFilters) => [...ticketKeys.lists(), "location", locationId, filters] as const,
	allTickets:     (orgId: string, filters?: TicketFilters)      => [...ticketKeys.lists(), "all", orgId, filters] as const,
	detail:         (id: string)                                  => [...ticketKeys.all, "detail", id] as const,
	pendingCount:   (orgId: string)                               => [...ticketKeys.all, "pending-count", orgId] as const,
	remainder:      (parentId: string)                            => [...ticketKeys.all, "remainder", parentId] as const,
	autoApproved:   (orgId: string, daysBack: number)             => [...ticketKeys.all, "auto-approved", orgId, daysBack] as const,
	discrepancies:  (orgId: string)                               => [...ticketKeys.all, "discrepancies", orgId] as const,
};

// ─── useCreateTicket ──────────────────────────────────────────────────────────

export function useCreateTicket() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateTicketInput) => createTicket(input),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: ticketKeys.pendingCount(variables.organizationId),
			});
		},
	});
}

// ─── useTickets ───────────────────────────────────────────────────────────────

export function useTickets(locationId: string | undefined, filters?: TicketFilters) {
	return useQuery({
		queryKey:  ticketKeys.byLocation(locationId ?? "", filters),
		queryFn:   () => getTicketsByLocationAction(locationId!, filters),
		enabled:   !!locationId,
		staleTime: 30_000,
	});
}

// ─── useAllTickets ────────────────────────────────────────────────────────────

export function useAllTickets(orgId: string | undefined, filters?: TicketFilters) {
	return useQuery({
		queryKey:  ticketKeys.allTickets(orgId ?? "", filters),
		queryFn:   () => getAllTicketsAction(orgId!, filters),
		enabled:   !!orgId,
		staleTime: 30_000,
	});
}

// ─── useTicketItemCosts — super admin only ────────────────────────────────────

export function useTicketItemCosts(itemIds: number[], enabled: boolean) {
	return useQuery({
		queryKey:  ["ticket-item-costs", itemIds],
		queryFn:   () => getTicketItemCostsAction(itemIds),
		enabled:   enabled && itemIds.length > 0,
		staleTime: 5 * 60_000,
	});
}

// ─── useTicket ────────────────────────────────────────────────────────────────

export function useTicket(id: string | undefined) {
	return useQuery({
		queryKey:  ticketKeys.detail(id ?? ""),
		queryFn:   () => getTicketByIdAction(id!),
		enabled:   !!id,
		staleTime: 15_000,
	});
}

// --- useSubmitTicket ----------------------------------------------------------

export function useSubmitTicket() {
	const queryClient        = useQueryClient();
	const { data: userInfo } = useUserInfo();
  
	return useMutation({
	  mutationFn: (ticketId: string) =>
		updateTicketStatus(ticketId, "submitted", userInfo?.id ?? "", {
		  notes: "Order submitted to warehouse",
		}),
	  onSuccess: (_, ticketId) => {
		queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
		queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
	  },
	});
  }

// ─── useCancelTicket ──────────────────────────────────────────────────────────

export function useCancelTicket() {
	const queryClient        = useQueryClient();
	const { data: userInfo } = useUserInfo();

	return useMutation({
		mutationFn: (ticketId: string) =>
			cancelTicket(ticketId, userInfo?.id ?? ""),
		onSuccess: (_, ticketId) => {
			queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
			queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
			queryClient.invalidateQueries({ queryKey: ticketKeys.all });
		},
	});
}

// ─── useRejectTicket ──────────────────────────────────────────────────────────

export function useRejectTicket() {
	const queryClient        = useQueryClient();
	const { data: userInfo } = useUserInfo();

	return useMutation({
		mutationFn: ({
						 ticketId,
						 rejectionReason,
					 }: {
			ticketId: string;
			rejectionReason: string;
		}) => rejectTicket(ticketId, userInfo?.id ?? "", rejectionReason),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
			queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
			queryClient.invalidateQueries({ queryKey: ticketKeys.all });
		},
	});
}

// ─── useFulfillTicket ─────────────────────────────────────────────────────────

export function useFulfillTicket() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
							   ticketId,
							   adminUserId,
							   allowPartial = false,
							   deliveryType = "company",
						   }: {
			ticketId: string;
			adminUserId: string;
			allowPartial?: boolean;
			deliveryType?: "company" | "self";
		}) => {
			const supabase = createClient<Database>(
				process.env.NEXT_PUBLIC_SUPABASE_URL!,
				process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
			);

			// 4-param overload: fulfill_order_ticket(uuid, text, boolean, text)
			// The old 3-param overload (uuid, text, text DEFAULT 'company') was dropped in
			// migration 20260419_drop_fulfill_order_ticket_3param.sql (FIX-A3).
			const { data, error } = await supabase.rpc("fulfill_order_ticket", {
				p_ticket_id:     ticketId,
				p_admin_user_id: adminUserId,
				p_allow_partial: allowPartial,
				p_delivery_type: deliveryType,
			});

			console.log(data, error)
			console.log(adminUserId)

			if (error) throw error;
			return data as {
				ticket_id:           string;
				fulfillment_type:    "full" | "partial";
				remainder_ticket_id: string | null;
				items_fulfilled:     Array<{
					item_id:        number;
					boxes_deducted: number;
					pallets_used:   string[];
				}>;
			};
		},
		onSuccess: (data, variables) => {
			queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
			queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
			queryClient.invalidateQueries({ queryKey: ticketKeys.all });
			queryClient.invalidateQueries({ queryKey: ["pallets"] });
			queryClient.invalidateQueries({ queryKey: ["warehouse", "inventory"] });
			queryClient.invalidateQueries({ queryKey: ["alerts"] });

			// Fire-and-forget: check warehouse low stock for each fulfilled item.
			// Errors are logged inside the action and never surface to the user.
			const fulfilledItemIds = data.items_fulfilled.map((i) => i.item_id);

			checkWarehouseLowStockAfterFulfillment(variables.ticketId, fulfilledItemIds).catch(
				(err) => console.error("[warehouseLowStock] Unexpected error:", err),
			);
		},
	});
}

// ─── usePartialFulfillTicket ──────────────────────────────────────────────────

export function usePartialFulfillTicket() {
	const inner = useFulfillTicket();

	return {
		...inner,
		mutate: (
			args: { ticketId: string; adminUserId: string; deliveryType?: "company" | "self" },
			options?: Parameters<typeof inner.mutate>[1],
		) => inner.mutate({ ...args, allowPartial: true }, options),
		mutateAsync: (
			args: { ticketId: string; adminUserId: string; deliveryType?: "company" | "self" },
			options?: Parameters<typeof inner.mutateAsync>[1],
		) => inner.mutateAsync({ ...args, allowPartial: true }, options),
	};
}

// ─── useConfirmTicket ─────────────────────────────────────────────────────────

export function useConfirmTicket() {
	const queryClient        = useQueryClient();
	const { data: userInfo } = useUserInfo();

	return useMutation({
		mutationFn: ({
						 ticketId,
						 receivedItems,
					 }: {
			ticketId: string;
			receivedItems: ReceivedItem[];
		}) => confirmTicket(ticketId, userInfo?.id ?? "", receivedItems),
		onSuccess: (result, variables) => {
			queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
			queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
			queryClient.invalidateQueries({ queryKey: ["alerts"] });
			// If a discrepancy was logged, refresh the discrepancy list for super admin
			if (result.hasDiscrepancy) {
				queryClient.invalidateQueries({ queryKey: ["tickets", "discrepancies"] });
			}
		},
	});
}

// ─── usePendingTicketCount ────────────────────────────────────────────────────

export function usePendingTicketCount(orgId: string | undefined) {
	return useQuery({
		queryKey:             ticketKeys.pendingCount(orgId ?? ""),
		queryFn:              () => getPendingTicketCountAction(orgId!),
		enabled:              !!orgId,
		staleTime:            30_000,
		refetchOnWindowFocus: true,
	});
}

// ─── useTicketsWithDiscrepancies ──────────────────────────────────────────────

/**
 * Super admin view: all confirmed tickets that had a count discrepancy.
 * Used to drive the discrepancy review tab on the orders page.
 */
export function useTicketsWithDiscrepancies(orgId: string | undefined) {
	return useQuery({
		queryKey:  ticketKeys.discrepancies(orgId ?? ""),
		queryFn:   () => getTicketsWithDiscrepanciesAction(orgId!),
		enabled:   !!orgId,
		staleTime: 60_000,
	});
}

// ─── useRemainderTickets ──────────────────────────────────────────────────────

export function useRemainderTickets(parentTicketId: string | undefined) {
	return useQuery({
		queryKey:  ticketKeys.remainder(parentTicketId ?? ""),
		queryFn:   () => getRemainderTicketsAction(parentTicketId!),
		enabled:   !!parentTicketId,
		staleTime: 60_000,
	});
}

// ─── useAutoApprovedTickets ───────────────────────────────────────────────────

export function useAutoApprovedTickets(orgId: string | undefined, daysBack = 30) {
	return useQuery({
		queryKey:  ticketKeys.autoApproved(orgId ?? "", daysBack),
		queryFn:   () => getAutoApprovedTicketsAction(orgId!, daysBack),
		enabled:   !!orgId,
		staleTime: 5 * 60_000,
	});
}