/**
 * lib/supabase/actions/warehouseLowStockActions.ts
 *
 * Server action: after a warehouse order ticket is fulfilled, check each
 * fulfilled item's current warehouse quantity against low_stock_thresholds
 * and fire send-low-stock-alert for items that are below threshold and have
 * no existing unresolved alert.
 */
"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

type UrgencyLevel = "low" | "critical" | "out_of_stock";

export async function checkWarehouseLowStockAfterFulfillment(
    ticketId: string,
    fulfilledItemIds: number[],
): Promise<void> {
    if (!fulfilledItemIds.length) return;

    const supabase = createServiceRoleClient();

    // ── 1. Fetch ticket for warehouse + org context ──────────────────────────
    const { data: ticket, error: ticketError } = await supabase
        .from("order_tickets")
        .select("warehouse_location_id, organization_id")
        .eq("id", ticketId)
        .single();

    if (ticketError || !ticket) {
        console.error("[warehouseLowStock] Failed to fetch ticket:", ticketError);
        return;
    }

    const warehouseLocationId = ticket.warehouse_location_id;
    const organizationId = ticket.organization_id;
    console.log('2')

    // ── 2. Current warehouse quantities for fulfilled items ──────────────────
    const { data: itemLocations, error: itemLocError } = await supabase
        .from("item_locations")
        .select("item_id, current_quantity")
        .eq("location_id", warehouseLocationId)
        .in("item_id", fulfilledItemIds);
    console.log(itemLocations, fulfilledItemIds)

    if (itemLocError) {
        console.error("[warehouseLowStock] Failed to fetch item_locations:", itemLocError);
        return;
    }

    if (!itemLocations?.length) return;
    console.log('3')

    // ── 3. Thresholds — location-specific and org-wide in one query ──────────
    const { data: thresholds, error: thresholdError } = await supabase
        .from("low_stock_thresholds")
        .select("item_id, location_id, low_threshold, critical_threshold")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .in("item_id", fulfilledItemIds)
        .or(`location_id.eq.${warehouseLocationId},location_id.is.null`);

    if (thresholdError) {
        console.error("[warehouseLowStock] Failed to fetch thresholds:", thresholdError);
        return;
    }
    console.log('4')

    // ── 4. Build threshold map: item_id → best match ─────────────────────────
    // Location-specific row wins over org-wide (location_id IS NULL).
    const thresholdMap = new Map<
        number,
        { low_threshold: number; critical_threshold: number | null }
    >();

    for (const t of thresholds ?? []) {
        if (t.item_id === null) continue;
        const existing = thresholdMap.get(t.item_id);
        // Overwrite only if incoming row is location-specific, or if no entry yet
        if (!existing || t.location_id !== null) {
            thresholdMap.set(t.item_id, {
                low_threshold: t.low_threshold,
                critical_threshold: t.critical_threshold ?? null,
            });
        }
    }
    console.log('5')

    // ── 5. Evaluate each item ────────────────────────────────────────────────
    for (const loc of itemLocations) {
        const itemId = loc.item_id;
        const currentQty = loc.current_quantity;

        console.log(loc)

        if (itemId === null || currentQty === null) continue;
        const threshold = thresholdMap.get(itemId);
        console.log(threshold)

        if (!threshold) continue; // no threshold configured — skip

        // Determine urgency
        let urgencyLevel: UrgencyLevel | null = null;

        if (currentQty <= 0) {
            urgencyLevel = "out_of_stock";
        } else if (
            threshold.critical_threshold !== null &&
            currentQty <= threshold.critical_threshold
        ) {
            urgencyLevel = "critical";
        } else if (currentQty < threshold.low_threshold) {
            urgencyLevel = "low";
        }
        console.log('6')

        if (!urgencyLevel) continue; // stock is healthy — skip

        // ── 6. Deduplication: skip if unresolved alert already exists ────────
        const { data: existingAlert, error: alertCheckError } = await supabase
            .from("alerts")
            .select("id")
            .eq("item_id", itemId)
            .eq("location_id", warehouseLocationId)
            .eq("alert_type", "low_stock")
            .is("resolved_at", null)
            .maybeSingle();

        if (alertCheckError) {
            console.error(
                `[warehouseLowStock] Alert check failed for item ${itemId}:`,
                alertCheckError,
            );
            continue;
        }

        if (existingAlert) continue; // already alerting — skip
        console.log('7')


        // ── 7. Insert new alert row ──────────────────────────────────────────
        const { data: newAlert, error: insertError } = await supabase
            .from("alerts")
            .insert({
                item_id: itemId,
                location_id: warehouseLocationId,
                organization_id: organizationId,
                alert_type: "low_stock",
                triggered_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (insertError || !newAlert) {
            console.error(
                `[warehouseLowStock] Failed to insert alert for item ${itemId}:`,
                insertError,
            );
            continue;
        }

        console.log('8')

        // ── 8. Invoke send-low-stock-alert edge function ─────────────────────
        const { error: fnError } = await supabase.functions.invoke(
            "send-low-stock-alert",
            {
                body: {
                    alert_id: String(newAlert.id),
                    organization_id: organizationId,
                    item_id: itemId,
                    location_id: warehouseLocationId,
                    storage_space_id: null,
                    urgency_level: urgencyLevel,
                    current_quantity: currentQty,
                    previous_quantity: currentQty,
                    min_quantity: threshold.low_threshold,
                },
            },
        );

        if (fnError) {
            console.error(
                `[warehouseLowStock] Edge function failed for item ${itemId}:`,
                fnError,
            );
        }
    }
}
