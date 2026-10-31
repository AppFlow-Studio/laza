/**
 * lib/services/orderNotifications.ts
 *
 * Thin wrapper that fires the send-order-notification edge function.
 * Called from lib/supabase/queries/orderTickets.ts after status changes.
 */

"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { render } from "@react-email/render";
import React from "react";

// Email Templates
import OrderRejected from "@/email/OrderRejected";
import OrderConfirmed from "@/email/OrderConfirmed";
// import OrderFulfilled from "@/email/OrderFulfilled"; 
// import OrderSubmitted from "@/email/OrderSubmitted"; 

type NotificationType =
    | "order_submitted"
    | "order_fulfilled"
    | "order_rejected"
    | "order_confirmed";

/**
 * Fetches all necessary data to render an email for a specific ticket.
 */
async function getNotificationContext(ticketId: string, type: NotificationType) {
    const supabase = createServiceRoleClient();

    // 1. Fetch ticket with location details
    const { data: ticket, error: ticketError } = await supabase
        .from("order_tickets")
        .select(`
            *,
            requesting_location:locations!requesting_location_id ( id, name )
        `)
        .eq("id", ticketId)
        .single();

    if (ticketError || !ticket) {
        console.error("[orderNotifications] Error fetching ticket details:", ticketError);
        return null;
    }

    // 2. Fetch ticket items with product names
    const { data: items, error: itemsError } = await supabase
        .from("order_ticket_items")
        .select(`
            quantity_boxes,
            items ( name )
        `)
        .eq("ticket_id", ticketId);

    if (itemsError) {
        console.error("[orderNotifications] Error fetching ticket items:", itemsError);
        return null;
    }

    // 3. Identify recipients
    let recipientEmails: string[] = [];
    
    if (type === "order_rejected" || type === "order_fulfilled") {
        // Notify Store Admins/Employees of the requesting location
        const { data: recipients } = await supabase
            .from("users")
            .select("email")
            .eq("assigned_location_id", ticket.requesting_location_id)
            .in("role", ["admin", "employee"]);
        recipientEmails = (recipients || []).map(r => r.email).filter(Boolean) as string[];
    } else if (type === "order_submitted" || type === "order_confirmed") {
        // Notify Warehouse Managers (Super Admins)
        const { data: recipients } = await supabase
            .from("users")
            .select("email")
            .eq("role", "super-admin");
        recipientEmails = (recipients || []).map(r => r.email).filter(Boolean) as string[];
    }

    return {
        ticket,
        items: items.map((i: any) => ({
            name: i.items?.name || "Unknown Item",
            quantityBoxes: i.quantity_boxes || 0,
        })),
        locationName: (ticket.requesting_location as any)?.name || "Store",
        recipientEmails,
    };
}

export async function sendOrderNotification(
    type: NotificationType,
    ticketId: string,
    organizationId: string,
): Promise<void> {
    try {
        const context = await getNotificationContext(ticketId, type);
        if (!context) return;

        const { ticket, items, locationName, recipientEmails } = context;

        // If no recipients, we can't send anything.
        if (recipientEmails.length === 0) {
            console.warn(`[orderNotifications] No recipients found for ${type} on ticket ${ticketId}`);
            return;
        }

        let subject = "";
        let html = "";

        // Prepare email based on type
        switch (type) {
            case "order_rejected": {
                subject = `Order Rejected - #${ticketId.slice(-8).toUpperCase()}`;
                const totalBoxes = items.reduce((sum, i) => sum + i.quantityBoxes, 0);
                
                const element = React.createElement(OrderRejected, {
                    storeName: locationName,
                    ticketId: ticket.id,
                    rejectionReason: ticket.rejection_reason || "No reason provided",
                    itemCount: items.length,
                    totalBoxes: totalBoxes,
                    items: items,
                    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${ticket.id}`,
                    newOrderUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/new`,
                    rejectedAt: new Date().toLocaleDateString(),
                });
                html = await render(element, { pretty: true });
                break;
            }

            case "order_confirmed": {
                subject = `Receipt Confirmed - #${ticketId.slice(-8).toUpperCase()}${ticket.has_discrepancy ? " (Discrepancy)" : ""}`;
                const totalBoxes = items.reduce((sum, i) => sum + i.quantityBoxes, 0);

                const element = React.createElement(OrderConfirmed, {
                    storeName: locationName,
                    ticketId: ticket.id,
                    confirmedAt: new Date().toLocaleDateString(),
                    hasDiscrepancy: ticket.has_discrepancy,
                    itemCount: items.length,
                    totalBoxes: totalBoxes,
                    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/super-admin/orders/${ticket.id}`,
                });
                html = await render(element, { pretty: true });
                break;
            }

            default:
                console.info(`[orderNotifications] Notification type ${type} is not yet fully implemented for rendering.`);
                break;
        }

        if (!html) {
            // Log but don't proceed
            return;
        }

        const supabase = createServiceRoleClient();
        const { error } = await supabase.functions.invoke(
            "send-order-notification",
            {
                body: {
                    email_type: type,
                    ticket_id: ticketId,
                    organization_id: organizationId,
                    subject,
                    html,
                    recipients: recipientEmails,
                    store_name: locationName,
                },
            },
        );

        if (error) {
            let errorDetails = error.message;
            // Attempt to extract the actual Edge Function error message from the response body
            if (error.context && typeof error.context.text === "function") {
                try {
                    const bodyText = await error.context.text();
                    errorDetails += ` | Details: ${bodyText}`;
                } catch (e) {
                    // Ignore parsing errors
                }
            }
            console.error(`[orderNotifications] Failed to send ${type} for ticket ${ticketId}:\n`, errorDetails);
        }
    } catch (err) {
        console.error(`[orderNotifications] Unexpected error sending ${type} for ticket ${ticketId}:`, err);
    }
}
