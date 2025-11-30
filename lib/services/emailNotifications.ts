"use server";

import React from 'react';
import { getNotificationPreferences } from '../supabase/queries/notificationPreferences';
import { sendEmail, shouldSendInQuietHours, getRecipients } from './emailService';
import { buildLowStockAlertData, buildLowStockDigestData, LowStockAlertData } from '../utils/emailDataBuilders';
import { createServerSupabaseClient } from '../supabase/server';
import LowStockAlert from '../../email/LowStockAlert';
import LowStockDigest from '../../email/LowStockDigest';

/**
 * Send immediate low stock alert email
 */
export async function sendLowStockAlert(
    alertId: string,
    organizationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if notifications are enabled
        const preferences = await getNotificationPreferences(organizationId);
        if (!preferences || !preferences.notifications_enabled || !preferences.low_stock_alerts_enabled) {
            return { success: false, error: 'Notifications disabled' };
        }

        // Check quiet hours
        if (!(await shouldSendInQuietHours(organizationId))) {
            return { success: false, error: 'Quiet hours - email queued for later' };
        }

        // Build alert data
        const alertData = await buildLowStockAlertData(alertId);

        // Get recipients
        const recipients = await getRecipients(organizationId);
        if (recipients.length === 0) {
            return { success: false, error: 'No recipients configured' };
        }

        // Determine urgency emoji and color
        const urgencyInfo = {
            low: { emoji: '⚠️', label: 'Low Stock' },
            critical: { emoji: '🔴', label: 'Critical Stock' },
            out_of_stock: { emoji: '🚨', label: 'Out of Stock' },
        }[alertData.urgencyLevel];

        // Send email
        const result = await sendEmail(organizationId, 'low_stock_alert', {
            to: recipients,
            subject: `${urgencyInfo.emoji} ${urgencyInfo.label}: ${alertData.item.name} at ${alertData.location.name}`,
            react: React.createElement(LowStockAlert, { alertData }),
            metadata: {
                alertId,
                itemId: alertData.item.id,
                locationId: alertData.location.id,
                urgencyLevel: alertData.urgencyLevel,
            },
        });

        return result;
    } catch (error: any) {
        console.error('Error sending low stock alert:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * Queue low stock alert for digest
 */
export async function queueLowStockAlert(
    alertId: string,
    organizationId: string,
    urgencyLevel: 'low' | 'critical' | 'out_of_stock'
): Promise<void> {
    const supabase = await createServerSupabaseClient();

    // Get alert details
    const { data: alert } = await supabase
        .from('alerts')
        .select('item_id, location_id, storage_space_id')
        .eq('id', alertId)
        .single();

    if (!alert) return;

    // Check if already queued
    const { data: existing } = await supabase
        .from('low_stock_notification_queue')
        .select('id')
        .eq('alert_id', alertId)
        .eq('notification_sent', false)
        .is('processed_at', null)
        .single();

    if (existing) return; // Already queued

    // Queue the alert
    await supabase.from('low_stock_notification_queue').insert({
        organization_id: organizationId,
        alert_id: alertId,
        item_id: alert.item_id,
        location_id: alert.location_id,
        storage_space_id: alert.storage_space_id,
        urgency_level: urgencyLevel,
    });
}

/**
 * Send low stock digest email
 */
export async function sendLowStockDigest(organizationId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createServerSupabaseClient();

        // Check if notifications are enabled
        const preferences = await getNotificationPreferences(organizationId);
        if (!preferences || !preferences.notifications_enabled || !preferences.low_stock_alerts_enabled) {
            return { success: false, error: 'Notifications disabled' };
        }

        // Get queued alerts that haven't been processed
        const { data: queuedAlerts, error: queueError } = await supabase
            .from('low_stock_notification_queue')
            .select('alert_id')
            .eq('organization_id', organizationId)
            .eq('notification_sent', false)
            .is('processed_at', null)
            .order('queued_at', { ascending: true });

        if (queueError) throw queueError;
        if (!queuedAlerts || queuedAlerts.length === 0) {
            return { success: true }; // No alerts to send
        }

        // Build digest data
        const alertIds = queuedAlerts.map((q) => q.alert_id);
        const digestData = await buildLowStockDigestData(organizationId, alertIds, 'location');

        // Get recipients
        const recipients = await getRecipients(organizationId);
        if (recipients.length === 0) {
            return { success: false, error: 'No recipients configured' };
        }

        // Send email
        const result = await sendEmail(organizationId, 'low_stock_digest', {
            to: recipients,
            subject: `📦 Low Stock Digest: ${digestData.alerts.length} item${digestData.alerts.length !== 1 ? 's' : ''} need attention`,
            react: React.createElement(LowStockDigest, { digestData }),
            metadata: {
                alertIds,
                alertCount: digestData.alerts.length,
            },
        });

        // Mark alerts as processed
        if (result.success) {
            await supabase
                .from('low_stock_notification_queue')
                .update({
                    processed_at: new Date().toISOString(),
                    notification_sent: true,
                })
                .in('alert_id', alertIds);
        }

        return result;
    } catch (error: any) {
        console.error('Error sending low stock digest:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * Calculate urgency level for an alert
 */
export async function calculateUrgencyLevel(
    itemId: string,
    locationId: string,
    currentQuantity: number,
    organizationId: string
): Promise<'low' | 'critical' | 'out_of_stock'> {
    const { getEffectiveThreshold, calculateUrgencyLevel: calcUrgency } = await import('../utils/thresholds');

    const threshold = await getEffectiveThreshold(itemId, locationId, organizationId);
    return calcUrgency(currentQuantity, threshold.lowThreshold, threshold.criticalThreshold);
}

