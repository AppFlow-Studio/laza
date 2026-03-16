'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '../server';
import type { Database } from '@/lib/supabase/types';

type PalletInsert = Database['public']['Tables']['warehouse_pallets']['Insert'];
type PalletInventoryInsert = Database['public']['Tables']['pallet_inventory']['Insert'];

// ─── Reads (service role) ─────────────────────────────────────────────────────

/** Fetch a PO with all line items, item details, and current warehouse quantities.
 *  Used to pre-populate Phase A of the receiving wizard. */
export async function getPOForReceivingAction(purchaseOrderId: string) {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
            id,
            po_number,
            supplier_name,
            status,
            expected_arrival,
            actual_arrival,
            organization_id,
            purchase_order_items (
                id,
                item_id,
                quantity_ordered,
                quantity_received,
                pieces_per_box,
                unit_price_before,
                unit_cost_after,
                cbm,
                cartons,
                items (
                    id,
                    name,
                    short_label,
                    sku,
                    box_quantity
                )
            )
        `)
        .eq('id', purchaseOrderId)
        .single();

    if (error) throw new Error(error.message);
    return data;
}

/** Fetch all warehouse storage spaces for the pallet assignment step. */
export async function getWarehouseStorageSpacesAction(warehouseLocationId: string) {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from('storage_spaces')
        .select('id, name, temperature_type')
        .eq('location_id', warehouseLocationId)
        .order('name');

    if (error) throw new Error(error.message);
    return data ?? [];
}

// ─── Phase A: Confirm PO Receipt ─────────────────────────────────────────────

/** Calls the receive_purchase_order RPC — atomic transaction.
 *  Updates warehouse item_locations, creates inventory logs,
 *  snapshots item_cost_history, sets PO status = 'received'. */
export async function confirmPOReceiptAction(
    purchaseOrderId: string,
    userId: string,
    receivedItems: { item_id: number; quantity_received: number }[],
    actualArrivalDate: string,
) {
    const supabase = createServerSupabaseClient();

    // First update actual_arrival date on the PO
    const { error: dateError } = await supabase
        .from('purchase_orders')
        .update({ actual_arrival: actualArrivalDate })
        .eq('id', purchaseOrderId);

    if (dateError) throw new Error(dateError.message);

    // Then call the atomic RPC for stock + cost updates
    const { data, error } = await supabase.rpc('receive_purchase_order', {
        p_purchase_order_id: purchaseOrderId,
        p_user_id:           userId,
        p_received_items:    receivedItems,
    });

    if (error) throw new Error(error.message);
    return data;
}

// ─── Phase B: Assign to Pallets ───────────────────────────────────────────────

export type PalletAssignment = {
    pallet_label: string;
    storage_space_id: string;
    items: {
        item_id: number;
        purchase_order_item_id: string;
        box_count: number;
        pieces_per_box_override?: number | null;
    }[];
};

/** Calls the receive_shipment_to_pallets RPC — creates all pallets
 *  and pallet_inventory rows in one atomic transaction. */
export async function assignShipmentToPalletsAction(
    purchaseOrderId: string,
    organizationId: string,
    warehouseLocationId: string,
    userId: string,
    palletAssignments: PalletAssignment[],
) {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase.rpc('receive_shipment_to_pallets', {
        p_purchase_order_id:  purchaseOrderId,
        p_pallet_assignments: palletAssignments,
        p_user_id:            userId,
    });

    if (error) throw new Error(error.message);
    return data;
}

/** Checks whether a pallet label is already taken in this org. */
export async function checkPalletLabelUniqueAction(
    organizationId: string,
    label: string,
): Promise<boolean> {
    const supabase = createServiceRoleClient();

    const { data } = await supabase
        .from('warehouse_pallets')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('pallet_label', label)
        .maybeSingle();

    return data === null; // true = unique
}
