'use server';

import { createServiceRoleClient } from '../server';

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPalletsForReorganizationAction(warehouseLocationId?: string) {
    const supabase = createServiceRoleClient();

    let query = supabase
        .from('warehouse_pallets')
        .select(`
            id,
            pallet_label,
            status,
            storage_space_id,
            storage_spaces ( id, name, temperature_type ),
            warehouse:locations(name),
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
        .neq('status', 'retired')
        .order('pallet_label');

    if (warehouseLocationId) {
        query = query.eq('warehouse_location_id', warehouseLocationId);
    }

    const { data, error } = await query;
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
    sourcePalletId:       string;
    targetPalletId:       string | null;
    targetStorageSpaceId: string;
    itemsToMove: {
        item_id:             number;
        pallet_inventory_id: string;
        box_count:           number;
    }[];
    newPalletLabel?: string;
    userId:          string;
};

export async function moveBoxesBetweenPalletsAction(payload: MoveBoxesPayload) {
    // Use service role to bypass RLS — RLS policies cast auth.uid() to uuid
    // which fails for Clerk text IDs like "user_3ARZei..."
    const supabase = createServiceRoleClient();

    if (!payload.userId) {
        throw new Error('User ID is required to move boxes.');
    }

    let targetId = payload.targetPalletId;

    // ── Create new pallet if requested ───────────────────────────────────────
    if (!targetId) {
        if (!payload.newPalletLabel) {
            throw new Error('New pallet label is required when no target pallet is selected.');
        }

        const { data: sourcePallet, error: srcErr } = await supabase
            .from('warehouse_pallets')
            .select('organization_id, warehouse_location_id')
            .eq('id', payload.sourcePalletId)
            .single();

        if (srcErr || !sourcePallet) throw new Error('Source pallet not found.');

        const { data: newPallet, error: createErr } = await supabase
            .from('warehouse_pallets')
            .insert({
                organization_id:       sourcePallet.organization_id,
                warehouse_location_id: sourcePallet.warehouse_location_id,
                storage_space_id:      payload.targetStorageSpaceId,
                pallet_label:          payload.newPalletLabel,
                status:                'active',
                received_at:           new Date().toISOString(),
            })
            .select('id')
            .single();

        if (createErr || !newPallet) throw new Error(createErr?.message ?? 'Failed to create new pallet.');
        targetId = newPallet.id;
    } else {
        const { error: moveErr } = await supabase
            .from('warehouse_pallets')
            .update({ storage_space_id: payload.targetStorageSpaceId })
            .eq('id', targetId);

        if (moveErr) throw new Error(moveErr.message);
    }

    // ── Get org_id for logging ────────────────────────────────────────────────
    const { data: sourcePalletMeta } = await supabase
        .from('warehouse_pallets')
        .select('organization_id')
        .eq('id', payload.sourcePalletId)
        .single();

    const organizationId = sourcePalletMeta?.organization_id ?? '';

    // ── Call RPC per item ─────────────────────────────────────────────────────
    const errors: string[] = [];

    for (const item of payload.itemsToMove) {
        const { error } = await supabase.rpc('move_boxes_between_pallets', {
            p_source_pallet_id: payload.sourcePalletId,
            p_target_pallet_id: targetId,
            p_item_id:          item.item_id,
            p_box_count:        item.box_count,
            p_user_id:          payload.userId,
        });

        if (error) {
            errors.push(`Item ${item.item_id}: ${error.message}`);
            continue;
        }

        await supabase.from('pallet_operations_log').insert({
            organization_id:   organizationId,
            pallet_id:         payload.sourcePalletId,
            related_pallet_id: targetId,
            item_id:           item.item_id,
            operation_type:    'moved',
            box_count_change:  -item.box_count,
            performed_by:      payload.userId,
            notes:             `Moved ${item.box_count} box${item.box_count !== 1 ? 'es' : ''} to pallet ${targetId}`,
        });
    }

    if (errors.length > 0) {
        throw new Error(`Some items failed to move:\n${errors.join('\n')}`);
    }

    return { targetPalletId: targetId };
}