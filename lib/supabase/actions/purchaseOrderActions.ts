'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '../server';
import type { Database } from '@/lib/supabase/types';

type PurchaseOrderInsert = Database['public']['Tables']['purchase_orders']['Insert'];
type PurchaseOrderUpdate = Database['public']['Tables']['purchase_orders']['Update'];
type PurchaseOrderItemInsert = Database['public']['Tables']['purchase_order_items']['Insert'];

const PO_ITEM_FULL = `
    id,
    purchase_order_id,
    item_id,
    items (
        id,
        name,
        sku,
        short_label
    ),
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

// ─── Reads (service role — bypasses RLS, safe for SELECT) ─────────────────────

export async function getPurchaseOrdersAction(organizationId: string, warehouseLocationId?: string | null) {
	const supabase = createServiceRoleClient();
	let query = supabase
		.from('purchase_orders')
		.select(`
            *,
            warehouse:locations(id, name),
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

	if (warehouseLocationId) {
		query = query.eq('warehouse_location_id', warehouseLocationId);
	}

	const { data, error } = await query;

	if (error) throw new Error(error.message);
	return data ?? [];
}

export async function getPurchaseOrderByIdAction(id: string) {
	const supabase = createServiceRoleClient();
	const { data, error } = await supabase
		.from('purchase_orders')
		.select(`
            *,
            warehouse:locations(id, name),
            purchase_order_items ( ${PO_ITEM_FULL} )
        `)
		.eq('id', id)
		.single();

	if (error) throw new Error(error.message);
	return data;
}

export async function getItemCostHistoryAction(organizationId: string, itemId?: number) {
	const supabase = createServiceRoleClient();
	let query = supabase
		.from('item_cost_history')
		.select(`*, purchase_orders ( id, po_number, order_date )`)
		.eq('organization_id', organizationId)
		.order('effective_date', { ascending: false });

	if (itemId) query = query.eq('item_id', itemId);

	const { data, error } = await query;
	if (error) throw new Error(error.message);
	return data ?? [];
}

// ─── NEW: fetch warehouse locations for dropdown ──────────────────────────────

export async function getWarehouseLocationsAction(organizationId: string) {
	const supabase = createServiceRoleClient();
	const { data, error } = await supabase
		.from('locations')
		.select('id, name')
		.eq('organization_id', organizationId)
		.eq('location_type', 'warehouse')
		.eq('is_active', true)
		.order('name', { ascending: true });

	if (error) throw new Error(error.message);
	return data ?? [];
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function createPurchaseOrderAction(
	payload: Omit<PurchaseOrderInsert, 'id' | 'created_at' | 'updated_at'>
) {
	const supabase = createServerSupabaseClient();
	const { data, error } = await supabase
		.from('purchase_orders')
		.insert(payload)
		.select()
		.single();

	if (error) throw new Error(error.message);
	return data;
}

export async function updatePurchaseOrderAction(
	id: string,
	updates: PurchaseOrderUpdate
) {
	const supabase = createServerSupabaseClient();
	const { data, error } = await supabase
		.from('purchase_orders')
		.update(updates)
		.eq('id', id)
		.select()
		.single();

	if (error) throw new Error(error.message);
	return data;
}

export async function updatePurchaseOrderStatusAction(
	id: string,
	status: Database['public']['Tables']['purchase_orders']['Row']['status']
) {
	return updatePurchaseOrderAction(id, { status });
}

export async function deletePurchaseOrderAction(id: string) {
	const supabase = createServerSupabaseClient();
	const { error } = await supabase
		.from('purchase_orders')
		.delete()
		.eq('id', id);

	if (error) throw new Error(error.message);
}

// ─── Purchase Order Items ─────────────────────────────────────────────────────

export async function upsertPurchaseOrderItemsAction(
	items: PurchaseOrderItemInsert[]
) {
	const supabase = createServerSupabaseClient();
	const { data, error } = await supabase
		.from('purchase_order_items')
		.upsert(items, { onConflict: 'purchase_order_id,item_id' })
		.select();

	if (error) throw new Error(error.message);
	return data ?? [];
}

export async function deletePurchaseOrderItemAction(id: string) {
	const supabase = createServerSupabaseClient();
	const { error } = await supabase
		.from('purchase_order_items')
		.delete()
		.eq('id', id);

	if (error) throw new Error(error.message);
}

// ─── RPCs ─────────────────────────────────────────────────────────────────────

export async function recalculatePoCostsAction(purchaseOrderId: string) {
	const supabase = createServerSupabaseClient();
	const { error } = await supabase.rpc('recalculate_po_costs', {
		p_purchase_order_id: purchaseOrderId,
	});

	if (error) throw new Error(error.message);
}

export async function receivePurchaseOrderAction(
	purchaseOrderId: string,
	userId: string,
	receivedItems: { item_id: number; quantity_received: number }[]
) {
	const supabase = createServerSupabaseClient();
	const { data, error } = await supabase.rpc('receive_purchase_order', {
		p_purchase_order_id: purchaseOrderId,
		p_user_id:           userId,
		p_received_items:    receivedItems,
	});

	if (error) throw new Error(error.message);
	return data;
}