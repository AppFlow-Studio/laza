'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '../server';
import type { Database } from '@/lib/supabase/types';

export type PalletAssignment = {
    pallet_label: string;
    // Items are assigned directly to pallets — no storage space involved
    items: {
        item_id:                number;
        purchase_order_item_id: string;
        box_configs: {
            pieces_per_box: number;
            box_count:      number;
        }[];
    }[];
};

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPOForReceivingAction(purchaseOrderId: string) {

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
            id, po_number, supplier_name, status,
            expected_arrival, actual_arrival, organization_id, warehouse_location_id, 
            purchase_order_items (
                id, item_id, quantity_ordered, quantity_received,
                pieces_per_box, unit_price_before, unit_cost_after, cbm, cartons,
                items ( id, name, short_label, sku, box_quantity )
            )
        `)
        .eq('id', purchaseOrderId)
        .single();

    if (error) throw new Error(error.message);
    return data;
}

// ─── Core pallet query ────────────────────────────────────────────────────────

async function queryPallets(
    warehouseLocationId: string | null,
    filters?: {
        status?: string;
        purchaseOrderId?: string;
        search?: string;
    }
) {
    const supabase = createServiceRoleClient();

    const clean = (v: string | undefined): string | undefined =>
        !v || v === '$undefined' ? undefined : v;

    const status          = clean(filters?.status);
    const purchaseOrderId = clean(filters?.purchaseOrderId);
    const search          = clean(filters?.search);

    let query = supabase
        .from('warehouse_pallets')
        .select(`
            *,
            purchase_orders ( po_number, supplier_name ),
            warehouse:locations(name),
            pallet_inventory (
                *,
                items ( name, short_label, sku ),
                purchase_order_items ( pieces_per_box, po_item_box_configs ( pieces_per_box, box_count, total_pieces ) )
            )
        `);

    if (warehouseLocationId) {
        query = query.eq('warehouse_location_id', warehouseLocationId);
    }

    if (status && status !== 'all') {
        query = query.eq('status', status);
    } else if (!status) {
        query = query.neq('status', 'retired');
    }

    if (purchaseOrderId) query = query.eq('purchase_order_id', purchaseOrderId);

    const { data, error } = await query.order('received_at', { ascending: false });
    if (error) throw new Error(error.message);

    let pallets = (data ?? []).map((pallet) => {
        const inventory   = pallet.pallet_inventory ?? [];
        const item_count  = inventory.length;
        const total_boxes = inventory.reduce((sum: number, row: any) => sum + (row.box_count ?? 0), 0);
        return { ...pallet, item_count, total_boxes };
    });

    if (search) {
        const term = search.toLowerCase();
        pallets = pallets.filter((p) => {
            const labelMatch = p.pallet_label.toLowerCase().includes(term);
            const itemMatch  = (p.pallet_inventory ?? []).some((inv: any) =>
                inv.items?.name?.toLowerCase().includes(term) ||
                inv.items?.short_label?.toLowerCase().includes(term) ||
                inv.items?.sku?.toLowerCase().includes(term)
            );
            return labelMatch || itemMatch;
        });
    }

    return pallets;
}

export async function getPalletsAction(
    warehouseLocationId: string,
    filters?: { status?: string; purchaseOrderId?: string; search?: string }
) {
    return queryPallets(warehouseLocationId, filters);
}

export async function getAllPalletsAction(
    filters?: { status?: string; purchaseOrderId?: string; search?: string }
) {
    return queryPallets(null, filters);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

async function queryPalletStats(warehouseLocationId: string | null) {
    const supabase = createServiceRoleClient();

    let query = supabase.from('warehouse_pallets').select('status');
    if (warehouseLocationId) {
        query = query.eq('warehouse_location_id', warehouseLocationId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    return {
        total:   rows.filter((r) => r.status !== 'retired').length,
        active:  rows.filter((r) => r.status === 'active').length,
        empty:   rows.filter((r) => r.status === 'empty').length,
        retired: rows.filter((r) => r.status === 'retired').length,
    };
}

export async function getPalletStatsAction(warehouseLocationId: string) {
    return queryPalletStats(warehouseLocationId);
}

export async function getAllPalletStatsAction() {
    return queryPalletStats(null);
}

export async function getPalletByIdAction(palletId: string) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('warehouse_pallets')
        .select(`
            *,
            purchase_orders ( po_number, supplier_name ),
            warehouse:locations(name),
            pallet_inventory (
                *,
                items ( name, short_label, sku, unit_of_measure, current_unit_cost ),
                purchase_order_items ( pieces_per_box, unit_cost_after, po_item_box_configs ( pieces_per_box, box_count, total_pieces ) )
            )
        `)
        .eq('id', palletId)
        .single();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const inventory   = data.pallet_inventory ?? [];
    const item_count  = inventory.length;
    const total_boxes = inventory.reduce((sum: number, row: any) => sum + (row.box_count ?? 0), 0);
    return { ...data, item_count, total_boxes };
}

export async function getPalletOperationsLogAction(palletId: string) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('pallet_operations_log')
        .select(`
            *,
            users ( first_name, last_name ),
            items ( name, short_label ),
            related_pallet:warehouse_pallets!pallet_operations_log_related_pallet_id_fkey ( pallet_label )
        `)
        .eq('pallet_id', palletId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
}

export async function getPurchaseOrdersForPalletFilterAction(organizationId: string) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, supplier_name')
        .eq('organization_id', organizationId)
        .in('status', ['received', 'arrived'])
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
}

// ─── Phase A: Confirm PO Receipt ──────────────────────────────────────────────

export type PartialBoxReason =
    | 'damaged_in_transit'
    | 'supplier_short_pack'
    | 'miscount_pending_recount'
    | 'sample_pulled_qc'
    | 'other';

export type ReceivedItemPayload = {
    item_id: number;
    quantity_received: number;
    /** Required when received pcs aren't a whole multiple of pieces_per_box. */
    partial_box_reason?: PartialBoxReason | null;
    partial_box_note?: string | null;
    /** Required when quantity_received > quantity_ordered. */
    overage_acknowledged?: boolean;
};

export async function confirmPOReceiptAction(
    purchaseOrderId: string,
    userId: string,
    receivedItems: ReceivedItemPayload[],
    actualArrivalDate: string,
) {
    const supabase = createServerSupabaseClient();
    const { error: dateError } = await supabase
        .from('purchase_orders')
        .update({ actual_arrival: actualArrivalDate })
        .eq('id', purchaseOrderId);
    if (dateError) throw new Error(dateError.message);

    const { data, error } = await supabase.rpc('receive_purchase_order', {
        p_purchase_order_id: purchaseOrderId,
        p_user_id:           userId,
        p_received_items:    receivedItems,
    });
    if (error) throw new Error(error.message);
    return data;
}

// ─── Phase B: Assign to Pallets ───────────────────────────────────────────────

export async function assignShipmentToPalletsAction(
    purchaseOrderId: string,
    userId: string,
    palletAssignments: PalletAssignment[],
) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('receive_shipment_to_pallets', {
        p_purchase_order_id:  purchaseOrderId,
        p_pallet_assignments: palletAssignments,
        p_user_id:            userId,
    });
    if (error) throw new Error(error.message);
    return data;
}

export async function retirePalletAction(
    palletId: string,
    userId: string,
): Promise<void> {
    const supabase = createServiceRoleClient();

    const { data: pallet, error: fetchError } = await supabase
        .from('warehouse_pallets')
        .select('status, organization_id')
        .eq('id', palletId)
        .single();

    if (fetchError) throw new Error(fetchError.message);
    if (pallet?.status !== 'empty') throw new Error('Only empty pallets can be retired.');

    const { error } = await supabase
        .from('warehouse_pallets')
        .update({
            status:     'retired',
            retired_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', palletId);

    if (error) throw new Error(error.message);

    await supabase.from('pallet_operations_log').insert({
        organization_id: pallet.organization_id,
        pallet_id:       palletId,
        operation_type:  'retired',
        performed_by:    userId,
        notes:           'Pallet retired via Pallet Management UI',
    });
}

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
    return data === null;
}