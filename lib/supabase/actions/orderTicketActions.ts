/**
 * lib/supabase/actions/orderTicketActions.ts
 *
 * Server actions for order ticket reads.
 * Mirrors the pattern in lib/supabase/actions/palletActions.ts.
 */

"use server";

import {
	getTicketsByLocation,
	getAllTickets,
	getTicketById,
	getPendingTicketCount,
	getRemainderTickets,
	getAutoApprovedTickets,
	getTicketsWithDiscrepancies,
	getTicketItemCosts,
	type TicketFilters,
} from "@/lib/supabase/queries/orderTickets";

export async function getTicketsByLocationAction(
	locationId: string,
	filters?: TicketFilters,
) {
	return getTicketsByLocation(locationId, filters);
}

export async function getAllTicketsAction(
	organizationId: string,
	filters?: TicketFilters,
) {
	return getAllTickets(organizationId, filters);
}

export async function getTicketByIdAction(id: string) {
	return getTicketById(id);
}

export async function getPendingTicketCountAction(organizationId: string) {
	return getPendingTicketCount(organizationId);
}

export async function getRemainderTicketsAction(parentTicketId: string) {
	return getRemainderTickets(parentTicketId);
}

export async function getAutoApprovedTicketsAction(
	organizationId: string,
	daysBack = 30,
) {
	return getAutoApprovedTickets(organizationId, daysBack);
}

export async function getTicketsWithDiscrepanciesAction(organizationId: string) {
	return getTicketsWithDiscrepancies(organizationId);
}

export async function getTicketItemCostsAction(itemIds: number[]) {
	return getTicketItemCosts(itemIds);
}