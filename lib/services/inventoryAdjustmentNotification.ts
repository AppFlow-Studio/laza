"use server";

import React from 'react';
import { createServiceRoleClient } from '../supabase/server';
import { sendEmail, getRecipients } from './emailService';
import { getNotificationPreferences } from '../supabase/queries/notificationPreferences';
import InventoryAdjustmentRequest from '../../email/InventoryAdjustmentRequest';

const appUrl = 'https://lazadessert.cafe';

export async function sendInventoryAdjustmentNotification(requestId: string): Promise<void> {
    try {
        const supabase = createServiceRoleClient();

        const { data: req, error } = await supabase
            .from('inventory_update_requests')
            .select(`
                id,
                org_id,
                location_id,
                storage_space_id,
                item_id,
                requested_by,
                action_type,
                new_quantity,
                previous_quantity,
                notes,
                items ( name, unit_of_measure ),
                storage_spaces ( name ),
                locations ( name ),
                users!inventory_update_requests_requested_by_fkey ( first_name, last_name )
            `)
            .eq('id', requestId)
            .single();

        if (error || !req) {
            console.error('[sendInventoryAdjustmentNotification] fetch error:', error);
            return;
        }

        // B3: check notification preferences — skip if master switch is off
        const prefs =
            (await getNotificationPreferences(req.org_id, req.location_id)) ??
            (await getNotificationPreferences(req.org_id));
        if (!prefs?.notifications_enabled) return;

        const recipients = await getRecipients(req.org_id, req.location_id);
        if (recipients.length === 0) return;

        const userRow = Array.isArray(req.users) ? req.users[0] : req.users;
        const employeeName =
            [(userRow as any)?.first_name, (userRow as any)?.last_name].filter(Boolean).join(' ') ||
            'An employee';
        const itemName = (req.items as any)?.name ?? 'Unknown item';
        const itemUnit = (req.items as any)?.unit_of_measure ?? '';
        const locationName = (req.locations as any)?.name ?? '';
        const storageSpaceName = (req.storage_spaces as any)?.name ?? null;

        await sendEmail(req.org_id, 'inventory_adjustment_request', {
            to: recipients,
            subject: `[Laza] ${employeeName} requested an inventory adjustment — ${itemName}`,
            react: React.createElement(InventoryAdjustmentRequest, {
                employeeName,
                itemName,
                itemUnit,
                locationName,
                storageSpaceName,
                actionType: req.action_type as 'count' | 'adjustment' | 'used',
                previousQuantity: req.previous_quantity,
                newQuantity: req.new_quantity,
                notes: req.notes,
                approvalUrl: `${appUrl}/admin/inventory`,
            }),
            metadata: {
                requestId,
                itemId: req.item_id,
                locationId: req.location_id,
            },
        });
    } catch (error) {
        console.error('[sendInventoryAdjustmentNotification] unexpected error:', error);
    }
}
