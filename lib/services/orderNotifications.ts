/**
 * lib/services/orderNotifications.ts
 *
 * Thin wrapper that fires the send-order-notification edge function.
 * Called from lib/supabase/queries/orderTickets.ts after status changes.
 *
 * Usage:
 *   await sendOrderNotification("order_submitted", ticketId, organizationId);
 *   await sendOrderNotification("order_fulfilled", ticketId, organizationId);
 *   await sendOrderNotification("order_rejected",  ticketId, organizationId);
 *
 * Failures are logged but never throw — a failed email must never
 * block the actual ticket operation.
 */

"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

type NotificationType = "order_submitted" | "order_fulfilled" | "order_rejected";

export async function sendOrderNotification(
    type: NotificationType,
    ticketId: string,
    organizationId: string,
): Promise<void> {
    try {
        // Use the service role client to invoke the edge function
        // so it bypasses RLS and has the service key available
        const supabase = createServiceRoleClient();

        const { error } = await supabase.functions.invoke(
            "send-order-notification",
            {
                body: {
                    type,
                    ticket_id:       ticketId,
                    organization_id: organizationId,
                },
            },
        );

        if (error) {
            // Log but don't throw — email failure never blocks the ticket op
            console.error(
                `[orderNotifications] Failed to send ${type} for ticket ${ticketId}:`,
                error,
            );
        }
    } catch (err) {
        console.error(
            `[orderNotifications] Unexpected error sending ${type} for ticket ${ticketId}:`,
            err,
        );
    }
}