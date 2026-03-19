import type { Database } from '@/lib/supabase/types';
import { createClient } from '@supabase/supabase-js';

// Lazy client — created inside each function to avoid SSR module-load crash
function getClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
}

const PO_ITEM_FULL = `
    id,
    purchase_order_id,
    item_id,
    quantity_ordered,
    unit_price_before,
    total_price_before,
    pieces_per_box,
    cartons,
    cbm,
    cbm_share,
    allocated_office_fee,
    allocated_shipping_fee,
    total_cost_after,
    unit_cost_after,
    quantity_received
` as const;

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPurchaseOrders(organizationId: string) {
    const { data, error } = await getClient()
        .from('purchase_orders')
        .select(`
            *,
            purchase_order_items (
                id,
                item_id,
                quantity_ordered,
                unit_cost_after,
                total_cost_after,
                quantity_received,
                pieces_per_box
            )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function getPurchaseOrderById(id: string) {
    const { data, error } = await getClient()
        .from('purchase_orders')
        .select(`
            *,
            purchase_order_items ( ${PO_ITEM_FULL} )
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function getItemCostHistory(organizationId: string, itemId?: number) {
    let query = getClient()
        .from('item_cost_history')
        .select(`
            *,
            purchase_orders ( id, po_number, order_date )
        `)
        .eq('organization_id', organizationId)
        .order('effective_date', { ascending: false });

    if (itemId) query = query.eq('item_id', itemId);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
}