/**
 * lib/supabase/queries/orderTickets.ts
 *
 * Order ticket query functions for the Laza warehouse supply chain system.
 * Follows the pattern in lib/supabase/queries/pallets.ts — uses a lazy
 * getClient() factory instead of @/lib/supabase/client.
 */
"use server";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createServerSupabaseClient, createServiceRoleClient } from "../server";
import { sendOrderNotification } from "@/lib/services/orderNotifications";

function getClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = Database["public"]["Enums"]["ticket_status"];
type DeliveryType = "company" | "self";

export interface CreateTicketInput {
    organizationId: string;
    requestingLocationId: string;
    warehouseLocationId: string;
    requestedBy: string;
    title?: string;
    notes?: string;
    initialStatus: "draft" | "submitted";
    items: Array<{
        itemId: number;
        quantityBoxes: number;
        quantityUnits: number;
    }>;
    deliveryType?: DeliveryType;
}

export interface TicketFilters {
    status?: TicketStatus | TicketStatus[];
    storeLocationId?: string;
    dateFrom?: string;
    dateTo?: string;
    isAutoApproved?: boolean;
    hasDiscrepancy?: boolean;
    excludeCancelled?: boolean;
    limit?: number;
    offset?: number;
}

export interface ReceivedItem {
    itemId: number;
    /** The count the employee physically counted — may differ from fulfilled_boxes */
    actualBoxesReceived: number;
    storageSpaceId?: string;
}

export interface ConfirmResult {
    ticket: { id: string; status: string };
    discrepancies: Array<{
        itemId: number;
        itemName: string;
        expectedBoxes: number;
        actualBoxes: number;
    }>;
    hasDiscrepancy: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function insertTicketLog(
    supabase: ReturnType<typeof getClient>,
    ticketId: string,
    previousStatus: TicketStatus | null,
    newStatus: TicketStatus,
    changedBy: string,
    notes?: string,
) {
    const { error } = await supabase.from("order_ticket_logs").insert({
        ticket_id: ticketId,
        previous_status: previousStatus,
        new_status: newStatus,
        changed_by: changedBy,
        notes: notes ?? null,
    });
    if (error) throw error;
}

// ─── createTicket ─────────────────────────────────────────────────────────────

export async function createTicket(input: CreateTicketInput) {
    const supabase = createServerSupabaseClient();

    const { data: ticket, error: ticketError } = await supabase
        .from("order_tickets")
        .insert({
            organization_id: input.organizationId,
            requesting_location_id: input.requestingLocationId,
            warehouse_location_id: input.warehouseLocationId,
            status: input.initialStatus,
            requested_by: input.requestedBy,
            title: input.title ?? null,
            notes: input.notes ?? null,
            delivery_type: input.deliveryType ?? null,
            submitted_at:
                input.initialStatus === "submitted"
                    ? new Date().toISOString()
                    : null,
        })
        .select("id, status")
        .single();

    if (ticketError) throw ticketError;

    // Snapshot warehouse-to-store transfer price at creation time.
    // Source is item_warehouse_pricing (set by super admin), same as the
    // trg_snapshot_transfer_prices_on_submit trigger. The trigger only fires
    // on draft→submitted UPDATE; direct-as-submitted inserts bypass it.
    const srClient = createServiceRoleClient();
    const { data: pricingRows } = await srClient
        .from("item_warehouse_pricing")
        .select("item_id, warehouse_transfer_price")
        .in("item_id", input.items.map((i) => i.itemId));
    const priceMap = new Map<number, number>(
        (pricingRows ?? []).map((r) => [r.item_id, r.warehouse_transfer_price]),
    );
    const now = new Date().toISOString();

    const lineItems = input.items.map((item) => {
        const price = priceMap.get(item.itemId);
        return {
            ticket_id: ticket.id,
            item_id: item.itemId,
            quantity_boxes: item.quantityBoxes,
            quantity_units: item.quantityUnits,
            unit_price_at_time: price ?? null,
            price_locked_at: price != null ? now : null,
        };
    });

    console.log(lineItems);
    

    const { error: itemsError, status, data } = await supabase
        .from("order_ticket_items")
        .insert(lineItems);

    console.log(itemsError, status, data);
    
    if (itemsError) throw itemsError;

    await insertTicketLog(
        supabase,
        ticket.id,
        null,
        input.initialStatus,
        input.requestedBy,
        input.initialStatus === "submitted"
            ? "Order submitted to warehouse"
            : "Draft created",
    );

    if (input.initialStatus === "submitted") {
        await sendOrderNotification(
            "order_submitted",
            ticket.id,
            input.organizationId,
        );
    }

    return ticket;
}

// ─── getTicketsByLocation ─────────────────────────────────────────────────────

export async function getTicketsByLocation(
    locationId: string,
    filters?: TicketFilters,
) {
    const supabase = createServerSupabaseClient();

    let query = supabase
        .from("order_tickets")
        .select(
            `
      *,
      order_ticket_items (
        *,
        items ( id, name, sku, category_id, box_quantity )
      )
    `,
        )
        .eq("requesting_location_id", locationId)
        .order("created_at", { ascending: false });

    if (filters?.status) {
        const statuses = Array.isArray(filters.status)
            ? filters.status
            : [filters.status];
        query = query.in("status", statuses);
    }

    if (filters?.excludeCancelled) {
        query = query.neq("status", "cancelled");
    }
    if (filters?.hasDiscrepancy !== undefined)
        query = query.eq("has_discrepancy", filters.hasDiscrepancy);
    if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("created_at", filters.dateTo);
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset)
        query = query.range(
            filters.offset,
            filters.offset + (filters.limit ?? 20) - 1,
        );

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ─── getAllTickets ─────────────────────────────────────────────────────────────

export async function getAllTickets(
    organizationId: string,
    filters?: TicketFilters,
) {
    const supabase = createServerSupabaseClient();

    let query = supabase
        .from("order_tickets")
        .select(
            `
      *,
      requesting_location:locations!requesting_location_id ( id, name, address ),
      order_ticket_items (
        *,
        items ( id, name, sku, category_id, box_quantity, short_label )
      )
    `,
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

    if (filters?.status) {
        const statuses = Array.isArray(filters.status)
            ? filters.status
            : [filters.status];
        query = query.in("status", statuses);
    }

    if (filters?.excludeCancelled) {
        query = query.neq("status", "cancelled");
    }
    if (filters?.storeLocationId)
        query = query.eq("requesting_location_id", filters.storeLocationId);
    if (filters?.hasDiscrepancy !== undefined)
        query = query.eq("has_discrepancy", filters.hasDiscrepancy);
    if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("created_at", filters.dateTo);
    if (filters?.isAutoApproved !== undefined)
        query = query.eq("is_auto_approved", filters.isAutoApproved);
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset)
        query = query.range(
            filters.offset,
            filters.offset + (filters.limit ?? 50) - 1,
        );

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// ─── getTicketById ─────────────────────────────────────────────────────────────

export async function getTicketById(id: string) {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from("order_tickets")
        .select(
            `
      *,
      requesting_location:locations!requesting_location_id ( id, name, address ),
      warehouse_location:locations!warehouse_location_id ( id, name ),
      order_ticket_items (
        *,
        items ( id, name, sku, category_id, box_quantity, short_label, unit_of_measure )
      ),
      order_ticket_logs (
        id, previous_status, new_status, changed_by, notes, created_at
      ),
      ticket_deliveries (
        id, delivery_type, delivered_by, estimated_pallet_count,
        actual_pallet_count, delivery_rate_at_time, estimated_cost,
        actual_cost, payment_status, dispatched_at, delivered_at, notes
      )
    `,
        )
        .eq("id", id)
        .order("created_at", {
            referencedTable: "order_ticket_logs",
            ascending: true,
        })
        .single();

    console.log(id);

    if (error) throw error;
    return data;
}

// ─── getTicketItems ───────────────────────────────────────────────────────────

export async function getTicketItems(ticketId: string) {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from("order_ticket_items")
        .select(
            `
      *,
      items (
        id, name, sku, category_id, box_quantity, short_label, unit_of_measure,
        category ( id, name )
      )
    `,
        )
        .eq("ticket_id", ticketId);

    if (error) throw error;
    return data;
}

// ─── getTicketLogs ────────────────────────────────────────────────────────────

export async function getTicketLogs(ticketId: string) {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from("order_ticket_logs")
        .select(
            "id, ticket_id, previous_status, new_status, changed_by, notes, created_at",
        )
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
}

// ─── updateTicketStatus ───────────────────────────────────────────────────────

export async function updateTicketStatus(
    ticketId: string,
    newStatus: TicketStatus,
    userId: string,
    options?: {
        notes?: string;
        rejectionReason?: string;
        deliveryType?: DeliveryType;
    },
) {
    const supabase = createServerSupabaseClient();

    const { data: current, error: fetchError } = await supabase
        .from("order_tickets")
        .select("id, status, organization_id")
        .eq("id", ticketId)
        .single();

    if (fetchError) throw fetchError;

    const terminalStatuses: TicketStatus[] = [
        "confirmed",
        "cancelled",
        "rejected",
    ];
    if (terminalStatuses.includes(current.status as TicketStatus)) {
        throw new Error(
            `Cannot transition ticket from '${current.status}' to '${newStatus}'. Status is terminal.`,
        );
    }

    const updatePayload: Record<string, unknown> = {
        status: newStatus,
        ...(newStatus === "processing" || newStatus === "fulfilled"
            ? { processed_by: userId }
            : {}),
        ...(newStatus === "fulfilled"
            ? { fulfilled_at: new Date().toISOString() }
            : {}),
        ...(newStatus === "submitted"
            ? { submitted_at: new Date().toISOString() }
            : {}),
        ...(options?.rejectionReason
            ? { rejection_reason: options.rejectionReason }
            : {}),
        ...(options?.deliveryType
            ? { delivery_type: options.deliveryType }
            : {}),
    };

    const { data: updated, error: updateError } = await supabase
        .from("order_tickets")
        .update(updatePayload)
        .eq("id", ticketId)
        .select("id, status")
        .single();

    if (updateError) throw updateError;

    await insertTicketLog(
        supabase,
        ticketId,
        current.status as TicketStatus,
        newStatus,
        userId,
        options?.rejectionReason
            ? `Rejected: ${options.rejectionReason}`
            : options?.notes,
    );

    if (newStatus === "fulfilled") {
        await sendOrderNotification(
            "order_fulfilled",
            ticketId,
            current.organization_id,
        );
    }
    if (newStatus === "rejected") {
        await sendOrderNotification(
            "order_rejected",
            ticketId,
            current.organization_id,
        );
    }

    return updated;
}

// ─── rejectTicket ─────────────────────────────────────────────────────────────

export async function rejectTicket(
    ticketId: string,
    userId: string,
    rejectionReason: string,
) {
    if (!rejectionReason?.trim()) {
        throw new Error("A rejection reason is required.");
    }
    return updateTicketStatus(ticketId, "rejected", userId, {
        rejectionReason: rejectionReason.trim(),
    });
    // Phase 6: release payment hold here.
    // await releasePaymentHold(ticketId);
}

// ─── cancelTicket ─────────────────────────────────────────────────────────────

export async function cancelTicket(ticketId: string, userId: string) {
    const supabase = createServerSupabaseClient();

    const { data: ticket, error: fetchError } = await supabase
        .from("order_tickets")
        .select("id, status")
        .eq("id", ticketId)
        .single();

    if (fetchError) throw fetchError;

    if (ticket.status !== "submitted") {
        throw new Error(
            `Cannot cancel ticket with status '${ticket.status}'. Cancellation is only allowed when status is 'submitted'.`,
        );
    }

    const { data: cancelled, error: cancelError } = await supabase
        .from("order_tickets")
        .update({ status: "cancelled" })
        .eq("id", ticketId)
        .select("id, status")
        .single();

    if (cancelError) throw cancelError;

    await insertTicketLog(
        supabase,
        ticketId,
        "submitted",
        "cancelled",
        userId,
        "Cancelled by store admin",
    );

    // Phase 6: release payment hold here.
    // await releasePaymentHold(ticketId);

    return cancelled;
}

// ─── confirmTicket ────────────────────────────────────────────────────────────

export async function confirmTicket(
    ticketId: string,
    userId: string,
    receivedItems: ReceivedItem[],
): Promise<ConfirmResult> {
    console.log("[confirmTicket] Starting:", { ticketId, userId, receivedItems });

    const supabase = createServerSupabaseClient();

    const { data: ticket, error: ticketError } = await supabase
        .from("order_tickets")
        .select(
            `
      id, status, requesting_location_id, organization_id,
      order_ticket_items (
        id, item_id, fulfilled_boxes, fulfilled_units,
        items ( id, name, box_quantity ),
        order_ticket_fulfillment_lines (
          id, boxes_deducted, pieces_per_box_at_time, total_pieces
        )
      )
    `,
        )
        .eq("id", ticketId)
        .single();

    if (ticketError) {
        console.error("[confirmTicket] Failed to fetch ticket:", ticketError);
        throw ticketError;
    }

    console.log("[confirmTicket] Ticket fetched:", {
        id: ticket.id,
        status: ticket.status,
        requesting_location_id: ticket.requesting_location_id,
        itemCount: ticket.order_ticket_items?.length,
    });

    const confirmableStatuses: TicketStatus[] = ["delivered", "fulfilled"];
    if (!confirmableStatuses.includes(ticket.status as TicketStatus)) {
        throw new Error(
            `Cannot confirm ticket with status '${ticket.status}'. Expected 'delivered' or 'fulfilled'.`,
        );
    }

    const storeLocationId = ticket.requesting_location_id;
    const storeOrgId = ticket.organization_id;
    const discrepancies: ConfirmResult["discrepancies"] = [];

    // Pre-fetch storage space names for all assigned space IDs (single query)
    const assignedSpaceIds = [
        ...new Set(receivedItems.map((r) => r.storageSpaceId).filter(Boolean)),
    ] as string[];
    const spaceNameMap: Record<string, string> = {};
    if (assignedSpaceIds.length > 0) {
        const { data: spaces } = await supabase
            .from("storage_spaces")
            .select("id, name")
            .in("id", assignedSpaceIds);
        for (const s of spaces ?? []) {
            spaceNameMap[s.id] = s.name;
        }
    }

    // item assignments for the log note: "Item name → Space name"
    const itemSpaceLines: string[] = [];

    for (const received of receivedItems) {
        const ticketItem = ticket.order_ticket_items?.find(
            (ti) => ti.item_id === received.itemId,
        );

        if (!ticketItem) continue;

        const expectedBoxes = ticketItem.fulfilled_boxes ?? 0;
        const actualBoxes = received.actualBoxesReceived;
        const rawItem = Array.isArray(ticketItem.items)
            ? ticketItem.items[0]
            : ticketItem.items;
        const itemName: string = rawItem?.name ?? `Item ${received.itemId}`;
        const fulfillmentLines =
            ticketItem.order_ticket_fulfillment_lines ?? [];

        // Record storage space assignment for the log note
        if (received.storageSpaceId) {
            const spaceName = spaceNameMap[received.storageSpaceId] ?? received.storageSpaceId;
            itemSpaceLines.push(`${itemName} → ${spaceName}`);
        }

        // Calculate pieces to add using ACTUAL count with per-source pieces_per_box_at_time
        let totalPiecesToAdd = 0;
        if (fulfillmentLines.length > 0 && expectedBoxes > 0) {
            const ratio = actualBoxes / expectedBoxes;
            totalPiecesToAdd = fulfillmentLines.reduce((sum, line) => {
                const proRatedBoxes = Math.round(line.boxes_deducted * ratio);
                return sum + proRatedBoxes * line.pieces_per_box_at_time;
            }, 0);
        } else {
            const ppb = (rawItem as any)?.box_quantity ?? 1;
            totalPiecesToAdd = actualBoxes * ppb;
        }

        // Update store item_locations with ACTUAL pieces received.
        // When a storageSpaceId is provided, target that specific storage-space row.
        // Without one, target any row for this item+location (no storage space filter).
        let itemLocQuery = supabase
            .from("item_locations")
            .select("id, current_quantity")
            .eq("item_id", received.itemId)
            .eq("location_id", storeLocationId);

        if (received.storageSpaceId) {
            itemLocQuery = itemLocQuery.eq("storage_space_id", received.storageSpaceId);
        } else {
            itemLocQuery = itemLocQuery.is("storage_space_id", null);
        }

        const { data: itemLoc, error: locError } = await itemLocQuery.maybeSingle();

        if (locError) {
            console.error("[confirmTicket] item_locations query error:", locError, {
                itemId: received.itemId,
                locationId: storeLocationId,
                storageSpaceId: received.storageSpaceId,
            });
            throw locError;
        }

        console.log("[confirmTicket] item_locations lookup:", {
            itemId: received.itemId,
            storageSpaceId: received.storageSpaceId ?? null,
            found: !!itemLoc,
            currentQty: itemLoc?.current_quantity,
            piecesToAdd: totalPiecesToAdd,
        });

        const previousQty = itemLoc?.current_quantity ?? 0;
        const newQty = previousQty + totalPiecesToAdd;

        if (itemLoc) {
            const { error } = await supabase
                .from("item_locations")
                .update({
                    current_quantity: newQty,
                    last_updated: new Date().toISOString(),
                })
                .eq("id", itemLoc.id);
            if (error) {
                console.error("[confirmTicket] item_locations update error:", error);
                throw error;
            }
            console.log("[confirmTicket] item_locations updated:", { id: itemLoc.id, newQty });
        } else {
            const insertData: Record<string, unknown> = {
                item_id: received.itemId,
                location_id: storeLocationId,
                organization_id: storeOrgId,
                current_quantity: totalPiecesToAdd,
            };
            if (received.storageSpaceId) {
                insertData.storage_space_id = received.storageSpaceId;
            }
            const { error } = await supabase.from("item_locations").insert(insertData);
            if (error) {
                console.error("[confirmTicket] item_locations insert error:", error, insertData);
                throw error;
            }
            console.log("[confirmTicket] item_locations inserted:", insertData);
        }

        // Inventory log — note includes discrepancy detail when counts differ
        const { error: logError } = await supabase
            .from("inventory_logs")
            .insert({
                item_id: received.itemId,
                location_id: storeLocationId,
                ...(received.storageSpaceId ? { storage_space_id: received.storageSpaceId } : {}),
                organization_id: storeOrgId,
                user_id: userId,
                previous_quantity: previousQty,
                new_quantity: newQty,
                quantity_change: totalPiecesToAdd,
                action_type: "received",
                notes: `Order ticket #${ticketId}${
                    actualBoxes !== expectedBoxes
                        ? ` (discrepancy: expected ${expectedBoxes} boxes, received ${actualBoxes} boxes)`
                        : ""
                }`,
            });
        if (logError) {
            console.error("[confirmTicket] inventory_logs insert error:", logError);
            throw logError;
        }

        // Track discrepancy
        if (actualBoxes !== expectedBoxes) {
            discrepancies.push({
                itemId: received.itemId,
                itemName,
                expectedBoxes,
                actualBoxes,
            });
        }
    }

    const hasDiscrepancy = discrepancies.length > 0;

    // Build human-readable note for the ticket log
    const storageSuffix =
        itemSpaceLines.length > 0
            ? ` Storage: ${itemSpaceLines.join(", ")}.`
            : "";

    const logNote = hasDiscrepancy
        ? `Confirmed with discrepancies — ${discrepancies
              .map(
                  (d) =>
                      `${d.itemName}: expected ${d.expectedBoxes} boxes, received ${d.actualBoxes} boxes`,
              )
              .join(" | ")}${storageSuffix}`
        : `Order confirmed — all quantities match.${storageSuffix}`;

    // Mark ticket confirmed + write has_discrepancy flag for super admin filtering
    const { data: confirmed, error: confirmError } = await supabase
        .from("order_tickets")
        .update({
            status: "confirmed",
            confirmed_by: userId,
            confirmed_at: new Date().toISOString(),
            has_discrepancy: hasDiscrepancy,
        })
        .eq("id", ticketId)
        .select("id, status")
        .single();

    if (confirmError) {
        console.error("[confirmTicket] order_tickets update error:", confirmError);
        throw confirmError;
    }

    console.log("[confirmTicket] Ticket status updated to confirmed:", confirmed);

    await insertTicketLog(
        supabase,
        ticketId,
        ticket.status as TicketStatus,
        "confirmed",
        userId,
        logNote,
    );

    // Phase 6: capture payment here.
    // await capturePaymentHold(ticketId, actualReceivedValue);

    await sendOrderNotification("order_confirmed", ticketId, storeOrgId);

    return { ticket: confirmed, discrepancies, hasDiscrepancy };
}

// ─── getPendingTicketCount ────────────────────────────────────────────────────

export async function getPendingTicketCount(
    organizationId: string,
): Promise<number> {
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
        .from("order_tickets")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "submitted");

    if (error) throw error;
    return count ?? 0;
}

// ─── getTicketsWithDiscrepancies ──────────────────────────────────────────────

export async function getTicketsWithDiscrepancies(organizationId: string) {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from("order_tickets")
        .select(
            `
      id, status, confirmed_at, has_discrepancy,
      requesting_location:locations!requesting_location_id ( id, name ),
      order_ticket_logs ( notes, created_at ),
      order_ticket_items (
        item_id, fulfilled_boxes,
        items ( id, name )
      )
    `,
        )
        .eq("organization_id", organizationId)
        .eq("has_discrepancy", true)
        .eq("status", "confirmed")
        .order("confirmed_at", { ascending: false });

    if (error) throw error;
    return data;
}

// ─── getRemainderTickets ──────────────────────────────────────────────────────

export async function getRemainderTickets(parentTicketId: string) {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
        .from("order_tickets")
        .select(
            `
      id, status, is_auto_approved, created_at,
      order_ticket_items (
        id, item_id, quantity_boxes, quantity_units, fulfilled_boxes, fulfilled_units,
        items ( id, name, sku )
      )
    `,
        )
        .eq("parent_ticket_id", parentTicketId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
}

// ─── getAutoApprovedTickets ───────────────────────────────────────────────────

export async function getAutoApprovedTickets(
    organizationId: string,
    daysBack = 30,
) {
    const supabase = createServerSupabaseClient();

    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const { data, error } = await supabase
        .from("order_tickets")
        .select(
            `
      id, status, fulfilled_at, created_at, requesting_location_id,
      requesting_location:locations!requesting_location_id ( id, name ),
      order_ticket_items (
        id, item_id, quantity_boxes, fulfilled_boxes,
        items ( id, name, sku )
      )
    `,
        )
        .eq("organization_id", organizationId)
        .eq("is_auto_approved", true)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
}

// ─── getTicketItemCosts — super admin only ────────────────────────────────────
// Reads current_unit_cost from items_with_costs view, which enforces
// is_super_admin() via RLS — returns empty rows for any non-super-admin caller.

export async function getTicketItemCosts(itemIds: number[]) {
    if (!itemIds.length) return [];
    // Use service role to bypass is_super_admin() RLS on items_with_costs.
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from("items_with_costs")
        .select("id, current_unit_cost")
        .in("id", itemIds);
    if (error || !data) return [];
    return data as { id: number; current_unit_cost: number | null }[];
}

// ─── getActiveTicketCountForLocation ─────────────────────────────────────────

export async function getActiveTicketCountForLocation(
    locationId: string,
): Promise<number> {
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
        .from("order_tickets")
        .select("id", { count: "exact", head: true })
        .eq("requesting_location_id", locationId)
        .in("status", ["fulfilled"]);

    if (error) throw error;
    return count ?? 0;
}

// ─── getActiveTicketCount ─────────────────────────────────────────────────────

export async function getActiveTicketCount(
    organizationId: string,
): Promise<number> {
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
        .from("order_tickets")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["submitted"]);

    if (error) throw error;
    return count ?? 0;
}
