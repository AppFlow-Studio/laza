'use server';

import { createServerSupabaseClient, createServiceRoleClient } from '../server';

// ─── Reads ────────────────────────────────────────────────────────────────────

/** All non-retired pallets with their contents — used to populate
 *  the source/destination selectors in the reorganization UI. */
export async function getPalletsForReorganizationAction(warehouseLocationId: string) {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
        .from('warehouse_pallets')
        .select(`
            id,
            pallet_label,
            status,
            storage_space_id,
            storage_spaces ( id, name, temperature_type ),
            pallet_inventory (
                id,
                item_id,
                box_count,
                initial_box_count,
                purchase_order_item_id,
                pieces_per_box_override,
                items ( id, name, short_label, sku ),
                purchase_order_items ( pieces_per_box )
            )
        `)
        .eq('warehouse_location_id', warehouseLocationId)
        .neq('status', 'retired')
        .order('pallet_label');

    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
        ...p,
        total_boxes: (p.pallet_inventory ?? []).reduce(
            (s: number, r: any) => s + (r.box_count ?? 0),
            0
        ),
    }));
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

export type MoveBoxesPayload = {
    sourcePalletId:           string;
    targetPalletId:           string | null;  // null = create new pallet
    targetStorageSpaceId:     string;
    itemsToMove: {
        item_id:                number;
        pallet_inventory_id:    string;        // source pallet_inventory row id
        box_count:              number;
    }[];
    newPalletLabel?:          string;         // required when targetPalletId = null
    userId:                   string;
};

/** Calls move_boxes_between_pallets RPC for each item.
 *  If targetPalletId is null, creates a new pallet first then moves into it. */
export async function moveBoxesBetweenPalletsAction(payload: MoveBoxesPayload) {
    const supabase = createServerSupabaseClient();

    let targetId = payload.targetPalletId;

    // ── If new pallet requested, create it first ──────────────────────────────
    if (!targetId) {
        if (!payload.newPalletLabel) {
            throw new Error('New pallet label is required when no target pallet is selected.');
        }

        // Get org from source pallet
        const { data: sourcePallet, error: srcErr } = await supabase
            .from('warehouse_pallets')
            .select('organization_id, warehouse_location_id')
            .eq('id', payload.sourcePalletId)
            .single();

        if (srcErr || !sourcePallet) throw new Error('Source pallet not found.');

        const { data: newPallet, error: createErr } = await supabase
            .from('warehouse_pallets')
            .insert({
                organization_id:      sourcePallet.organization_id,
                warehouse_location_id: sourcePallet.warehouse_location_id,
                storage_space_id:     payload.targetStorageSpaceId,
                pallet_label:         payload.newPalletLabel,
                status:               'active',
                received_at:          new Date().toISOString(),
            })
            .select('id')
            .single();

        if (createErr || !newPallet) throw new Error(createErr?.message ?? 'Failed to create new pallet.');
        targetId = newPallet.id;
    } else {
        // If moving to existing pallet, update its storage space if it changed
        const { error: moveErr } = await supabase
            .from('warehouse_pallets')
            .update({ storage_space_id: payload.targetStorageSpaceId, updated_at: new Date().toISOString() })
            .eq('id', targetId);

        if (moveErr) throw new Error(moveErr.message);
    }

    // ── Call RPC once per item ────────────────────────────────────────────────
    // The RPC handles: deducting from source, adding to target, preserving
    // purchase_order_item_id, logging to pallet_operations_log.
    const errors: string[] = [];

    for (const item of payload.itemsToMove) {
        const { error } = await supabase.rpc('move_boxes_between_pallets', {
            p_source_pallet_id: payload.sourcePalletId,
            p_target_pallet_id: targetId,
            p_item_id:          item.item_id,
            p_box_count:        item.box_count,
            p_user_id:          payload.userId,
        });

        if (error) errors.push(`${item.item_id}: ${error.message}`);
    }

    if (errors.length > 0) {
        throw new Error(`Some items failed to move:\n${errors.join('\n')}`);
    }

    return { targetPalletId: targetId };
}
