/**
 * supabase/functions/send-order-notification/index.ts
 *
 * Thin email delivery function — receives pre-rendered HTML from Next.js
 * and sends it via Resend. No template rendering happens here.
 *
 * All business logic (quiet hours, notification prefs, template rendering)
 * lives in lib/services/orderNotifications.ts on the Next.js side.
 *
 * Payload:
 *   {
 *     subject:         string
 *     html:            string          — pre-rendered by @react-email/render in Next.js
 *     recipients:      string[]
 *     email_type:      string          — for logging
 *     organization_id: string          — for logging
 *     ticket_id:       string          — for logging metadata
 *     store_name:      string          — for logging metadata
 *   }
 */

// @ts-nocheck

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2";

interface Payload {
    subject:         string;
    html:            string;
    recipients:      string[];
    email_type:      string;
    organization_id: string;
    ticket_id:       string;
    store_name?:     string;
}

serve(async (req: Request) => {
    try {
        const payload: Payload = await req.json();
        const {
            subject,
            html,
            recipients,
            email_type,
            organization_id,
            ticket_id,
            store_name,
        } = payload;

        // Basic validation
        if (!subject || !html || !recipients?.length || !organization_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { "Content-Type": "application/json" } },
            );
        }

        const resend   = new Resend(Deno.env.get("RESEND_API_KEY")!);
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // Send via Resend
        const { data: sendResult, error: sendError } = await resend.emails.send({
            from:    "Laza Warehouse <warehouse@lazadessert.cafe>",
            to:      recipients,
            subject,
            html,
        });

        // Log one row per recipient
        await supabase.from("email_delivery_logs").insert(
            recipients.map((email) => ({
                organization_id,
                email_type,
                recipient:       email,
                status:          sendError ? "failed" : "sent",
                error:           sendError?.message ?? null,
                resend_email_id: sendResult?.id ?? null,
                metadata: {
                    ticket_id,
                    store_name,
                },
            })),
        );

        if (sendError) {
            throw new Error(`Resend error: ${sendError.message}`);
        }

        return new Response(
            JSON.stringify({ success: true, resend_id: sendResult?.id, recipients }),
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