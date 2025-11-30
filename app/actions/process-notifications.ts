"use server";

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendLowStockAlert, sendLowStockDigest } from '@/lib/services/emailNotifications';
import { calculateUrgencyLevel } from '@/lib/utils/thresholds';

/**
 * Process queued low stock alerts and send immediate notifications
 * This should be called after inventory updates or via a scheduled job
 */
export async function processLowStockNotifications(organizationId: string) {
    const supabase = await createServerSupabaseClient();

    try {
        // Get queued alerts that haven't been processed
        const { data: queuedAlerts, error: queueError } = await supabase
            .from('low_stock_notification_queue')
            .select(`
                *,
                alerts (*),
                items (*),
                locations (*)
            `)
            .eq('organization_id', organizationId)
            .eq('notification_sent', false)
            .is('processed_at', null)
            .order('queued_at', { ascending: true });

        if (queueError) {
            console.error('Error fetching queued alerts:', queueError);
            return { success: false, error: queueError.message };
        }

        if (!queuedAlerts || queuedAlerts.length === 0) {
            return { success: true, processed: 0 };
        }

        // Get notification preferences to check delivery mode
        const { data: preferences } = await supabase
            .from('notification_preferences')
            .select('low_stock_delivery_mode')
            .eq('organization_id', organizationId)
            .single();

        const deliveryMode = preferences?.low_stock_delivery_mode || 'immediate';

        // Process immediate alerts
        if (deliveryMode === 'immediate' || deliveryMode === 'both') {
            for (const queuedAlert of queuedAlerts) {
                const alert = queuedAlert.alerts as any;
                if (!alert) continue;

                try {
                    const result = await sendLowStockAlert(alert.id, organizationId);
                    if (result.success) {
                        // Mark as processed
                        await supabase
                            .from('low_stock_notification_queue')
                            .update({
                                processed_at: new Date().toISOString(),
                                notification_sent: true,
                            })
                            .eq('id', queuedAlert.id);
                    }
                } catch (error: any) {
                    console.error('Error sending immediate alert:', error);
                }
            }
        }

        return { success: true, processed: queuedAlerts.length };
    } catch (error: any) {
        console.error('Error processing notifications:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Process and send low stock digest for an organization
 */
export async function processLowStockDigest(organizationId: string) {
    try {
        const result = await sendLowStockDigest(organizationId);
        return result;
    } catch (error: any) {
        console.error('Error processing digest:', error);
        return { success: false, error: error.message };
    }
}

