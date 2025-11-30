"use server";

import React from 'react';
import { getNotificationPreferences, getDailySummaryPreferences } from '../supabase/queries/notificationPreferences';
import { sendEmail, getRecipients } from './emailService';
import { buildDailySummaryData, DailySummaryData } from '../utils/emailDataBuilders';
import { createServerSupabaseClient } from '../supabase/server';
import DailyLocationSummary from '../../email/DailyLocationSummary';

/**
 * Generate and send daily summary email
 */
export async function sendDailySummary(
    organizationId: string,
    locationId?: string,
    date?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check if daily summary is enabled
        const preferences = await getNotificationPreferences(organizationId);
        if (!preferences || !preferences.notifications_enabled || !preferences.daily_summary_enabled) {
            return { success: false, error: 'Daily summary disabled' };
        }

        // Get summary preferences
        const summaryPrefs = await getDailySummaryPreferences(organizationId);
        if (!summaryPrefs) {
            return { success: false, error: 'Summary preferences not configured' };
        }

        // Check if today is a scheduled day
        const summaryDate = date ? new Date(date) : new Date();
        const dayOfWeek = summaryDate.getDay();
        if (!preferences.daily_summary_days.includes(dayOfWeek)) {
            return { success: false, error: 'Not a scheduled day' };
        }

        // Build summary data
        const summaryData = await buildDailySummaryData(organizationId, locationId, date);

        // Get recipients
        const recipients = await getRecipients(organizationId);
        if (recipients.length === 0) {
            return { success: false, error: 'No recipients configured' };
        }

        // Determine subject
        const locationText = summaryData.locationName ? ` - ${summaryData.locationName}` : '';
        const subject = `📊 Daily Inventory Summary${locationText} - ${new Date(summaryData.date).toLocaleDateString()}`;

        // Send email
        const result = await sendEmail(organizationId, 'daily_summary', {
            to: recipients,
            subject,
            react: React.createElement(DailyLocationSummary, { summaryData }),
            metadata: {
                locationId: summaryData.locationId,
                date: summaryData.date,
            },
        });

        return result;
    } catch (error: any) {
        console.error('Error sending daily summary:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * Get inventory value for a location
 */
export async function getInventoryValue(locationId: string, date?: string): Promise<number> {
    const supabase = await createServerSupabaseClient();
    // This is a placeholder - implement actual calculation based on item costs
    // For now, return 0
    return 0;
}

/**
 * Get items updated today
 */
export async function getUpdatedItemsToday(locationId: string, date?: string): Promise<any[]> {
    const supabase = await createServerSupabaseClient();
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('inventory_logs')
        .select(`
            *,
            items (*),
            users (*)
        `)
        .eq('location_id', locationId)
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

