/**
 * supabase/functions/send-order-notification/index.ts
 *
 * Edge function for order ticket email notifications.
 * Follows the pattern of send-low-stock-alert.
 *
 * Supported notification types:
 *   "order_submitted" → sent to super admin(s)
 *   "order_fulfilled" → sent to store admin
 *   "order_rejected"  → sent to store admin
 *
 * Invoked from:
 *   - orderTickets.ts after createTicket() with status "submitted"
 *   - orderTickets.ts after updateTicketStatus() → "fulfilled" or "rejected"
 *
 * Payload shape:
 *   {
 *     type: "order_submitted" | "order_fulfilled" | "order_rejected",
 *     ticket_id: string,
 *     organization_id: string,
 *   }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2";
import { renderAsync } from "https://esm.sh/@react-email/render@0.0.12";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType = "order_submitted" | "order_fulfilled" | "order_rejected";

interface Payload {
    type: NotificationType;
    ticket_id: string;
    organization_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, timezone = "America/New_York"): string {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
    }).format(new Date(iso));
}

function isQuietHours(
    quietStart: string | null,
    quietEnd: string | null,
    timezone = "America/New_York",
): boolean {
    if (!quietStart || !quietEnd) return false;

    const now        = new Date();
    const timeString = new Intl.DateTimeFormat("en-US", {
        hour:     "2-digit",
        minute:   "2-digit",
        hour12:   false,
        timeZone: timezone,
    }).format(now);

    const [currentHour, currentMin] = timeString.split(":").map(Number);
    const currentMinutes = currentHour * 60 + currentMin;

    const [startHour, startMin] = quietStart.split(":").map(Number);
    const [endHour, endMin]     = quietEnd.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes   = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g. 22:00 → 08:00)
    if (startMinutes > endMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    try {
        const payload: Payload = await req.json();
        const { type, ticket_id, organization_id } = payload;

        if (!type || !ticket_id || !organization_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: type, ticket_id, organization_id" }),
                { status: 400, headers: { "Content-Type": "application/json" } },
            );
        }

        // ── Supabase (service role for cross-table reads) ──────────────────
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
        const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "https://app.lazadessert.com";

        // ── Fetch notification preferences ─────────────────────────────────
        const { data: prefs } = await supabase
            .from("notification_preferences")
            .select("*")
            .eq("organization_id", organization_id)
            .single();

        // Global kill switch
        if (prefs && !prefs.notifications_enabled) {
            return new Response(
                JSON.stringify({ skipped: true, reason: "notifications_disabled" }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }

        // Quiet hours check
        if (
            prefs &&
            isQuietHours(
                prefs.quiet_hours_start,
                prefs.quiet_hours_end,
                prefs.timezone ?? "America/New_York",
            )
        ) {
            return new Response(
                JSON.stringify({ skipped: true, reason: "quiet_hours" }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }

        // ── Fetch ticket with full context ─────────────────────────────────
        const { data: ticket, error: ticketError } = await supabase
            .from("order_tickets")
            .select(`
                id, status, notes, delivery_type,
                submitted_at, fulfilled_at, rejection_reason,
                is_auto_approved, parent_ticket_id,
                requesting_location:locations!requesting_location_id (
                    id, name, address
                ),
                order_ticket_items (
                    quantity_boxes, quantity_units, fulfilled_boxes,
                    items ( id, name, unit_of_measure )
                )
            `)
            .eq("id", ticket_id)
            .single();

        if (ticketError || !ticket) {
            throw new Error(`Ticket not found: ${ticket_id}`);
        }

        // ── Fetch recipients ───────────────────────────────────────────────
        // super admin email(s) — from notification_preferences primary/secondary
        // store admin email  — from users table via requesting_location_id
        const { data: superAdmins } = await supabase
            .from("users")
            .select("id, email, first_name, last_name")
            .eq("organization_id", organization_id)
            .eq("role", "super_admin")
            .eq("is_active", true);

        const { data: storeAdmin } = await supabase
            .from("users")
            .select("id, email, first_name, last_name")
            .eq("assigned_location_id", ticket.requesting_location?.id)
            .eq("role", "admin")
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();

        const storeName    = ticket.requesting_location?.name ?? "Unknown Store";
        const storeAddress = (() => {
            const a = ticket.requesting_location?.address as Record<string, string> | null;
            if (!a) return undefined;
            return [a.street, a.city, a.state].filter(Boolean).join(", ");
        })();
        const timezone = prefs?.timezone ?? "America/New_York";

        const itemCount  = ticket.order_ticket_items?.length ?? 0;
        const totalBoxes = ticket.order_ticket_items?.reduce(
            (s: number, i: { quantity_boxes: number }) => s + i.quantity_boxes,
            0,
        ) ?? 0;

        let emailHtml    = "";
        let subject      = "";
        let recipients:  string[] = [];
        let emailType    = type;

        // ── Build email by type ────────────────────────────────────────────
        if (type === "order_submitted") {
            // Skip if auto-approved — no manual review needed
            if (ticket.is_auto_approved) {
                return new Response(
                    JSON.stringify({ skipped: true, reason: "auto_approved" }),
                    { status: 200, headers: { "Content-Type": "application/json" } },
                );
            }

            // Import template dynamically (Deno edge function pattern)
            const { OrderSubmitted } = await import("../../../email/OrderSubmitted.tsx");

            emailHtml = await renderAsync(
                OrderSubmitted({
                    storeName,
                    storeAddress,
                    submittedByName:  storeAdmin
                        ? `${storeAdmin.first_name ?? ""} ${storeAdmin.last_name ?? ""}`.trim() || "Store Admin"
                        : "Store Admin",
                    ticketId:         ticket.id,
                    itemCount,
                    totalBoxes,
                    deliveryType:     ticket.delivery_type ?? "company",
                    notes:            ticket.notes ?? undefined,
                    items:            (ticket.order_ticket_items ?? []).map((line: any) => ({
                        name:           line.items?.name ?? "Unknown",
                        quantityBoxes:  line.quantity_boxes,
                        quantityUnits:  line.quantity_units,
                        unitOfMeasure:  line.items?.unit_of_measure ?? "pcs",
                    })),
                    dashboardUrl: `${appUrl}/super-admin/orders/${ticket.id}`,
                    submittedAt:  ticket.submitted_at
                        ? formatDate(ticket.submitted_at, timezone)
                        : formatDate(new Date().toISOString(), timezone),
                }),
            );

            subject    = `[Action Required] New order from ${storeName} — ${itemCount} items`;
            recipients = [
                ...(prefs?.primary_email ? [prefs.primary_email] : []),
                ...(prefs?.secondary_emails ?? []),
                ...(superAdmins?.map((u: any) => u.email).filter(Boolean) ?? []),
            ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate

        } else if (type === "order_fulfilled") {
            if (!storeAdmin?.email) {
                throw new Error("No store admin email found for location");
            }

            const fulfillmentType = ticket.order_ticket_items?.some(
                (i: any) => i.fulfilled_boxes !== null && i.fulfilled_boxes < i.quantity_boxes,
            )
                ? "partial"
                : "full";

            const fulfilledTotalBoxes = ticket.order_ticket_items?.reduce(
                (s: number, i: any) => s + (i.fulfilled_boxes ?? i.quantity_boxes),
                0,
            ) ?? 0;

            const { OrderFulfilled } = await import("../../../email/OrderFulfilled.tsx");

            emailHtml = await renderAsync(
                OrderFulfilled({
                    storeName,
                    ticketId:         ticket.id,
                    fulfillmentType,
                    itemCount,
                    totalBoxes:       fulfilledTotalBoxes,
                    deliveryType:     ticket.delivery_type ?? "company",
                    remainderTicketId: ticket.parent_ticket_id ?? undefined,
                    items:            (ticket.order_ticket_items ?? []).map((line: any) => ({
                        name:           line.items?.name ?? "Unknown",
                        requestedBoxes: line.quantity_boxes,
                        fulfilledBoxes: line.fulfilled_boxes ?? line.quantity_boxes,
                    })),
                    dashboardUrl: `${appUrl}/admin/orders/${ticket.id}`,
                    remainderUrl: ticket.parent_ticket_id
                        ? `${appUrl}/admin/orders/${ticket.parent_ticket_id}`
                        : undefined,
                    fulfilledAt: ticket.fulfilled_at
                        ? formatDate(ticket.fulfilled_at, timezone)
                        : formatDate(new Date().toISOString(), timezone),
                }),
            );

            subject    = fulfillmentType === "partial"
                ? `Your order was partially fulfilled — remainder ticket created`
                : `Your order has been fulfilled and is on its way`;
            recipients = [storeAdmin.email];

        } else if (type === "order_rejected") {
            if (!storeAdmin?.email) {
                throw new Error("No store admin email found for location");
            }
            if (!ticket.rejection_reason) {
                throw new Error("Cannot send rejection email — no rejection_reason on ticket");
            }

            const { OrderRejected } = await import("../../../email/OrderRejected.tsx");

            emailHtml = await renderAsync(
                OrderRejected({
                    storeName,
                    ticketId:         ticket.id,
                    rejectionReason:  ticket.rejection_reason,
                    itemCount,
                    totalBoxes,
                    items:            (ticket.order_ticket_items ?? []).map((line: any) => ({
                        name:          line.items?.name ?? "Unknown",
                        quantityBoxes: line.quantity_boxes,
                    })),
                    dashboardUrl: `${appUrl}/admin/orders/${ticket.id}`,
                    newOrderUrl:  `${appUrl}/admin/orders/new`,
                    rejectedAt:   formatDate(new Date().toISOString(), timezone),
                }),
            );

            subject    = `Your order #${ticket.id.slice(-8).toUpperCase()} was rejected`;
            recipients = [storeAdmin.email];

        } else {
            return new Response(
                JSON.stringify({ error: `Unknown notification type: ${type}` }),
                { status: 400, headers: { "Content-Type": "application/json" } },
            );
        }

        if (recipients.length === 0) {
            return new Response(
                JSON.stringify({ skipped: true, reason: "no_recipients" }),
                { status: 200, headers: { "Content-Type": "application/json" } },
            );
        }

        // ── Send via Resend ────────────────────────────────────────────────
        const { data: sendResult, error: sendError } = await resend.emails.send({
            from:    "Laza Warehouse <warehouse@lazadessert.com>",
            to:      recipients,
            subject,
            html:    emailHtml,
        });

        // ── Log delivery ───────────────────────────────────────────────────
        // Log one row per recipient for fine-grained tracking
        const logRows = recipients.map((email) => ({
            organization_id,
            email_type:     emailType,
            recipient:      email,
            status:         sendError ? "failed" : "sent",
            error:          sendError?.message ?? null,
            resend_email_id: sendResult?.id ?? null,
            metadata: {
                ticket_id,
                store_name:   storeName,
                item_count:   itemCount,
                total_boxes:  totalBoxes,
            },
        }));

        await supabase.from("email_delivery_logs").insert(logRows);

        if (sendError) {
            throw new Error(`Resend error: ${sendError.message}`);
        }

        return new Response(
            JSON.stringify({
                success:      true,
                type,
                recipients,
                resend_id:    sendResult?.id,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        );

    } catch (err) {
        console.error("[send-order-notification]", err);
        return new Response(
            JSON.stringify({ error: String(err) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        );
    }
});