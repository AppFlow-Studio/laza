"use server";

import { Resend } from 'resend';
import React from 'react';
import { getNotificationPreferences } from '../supabase/queries/notificationPreferences';
import { logEmailDelivery, updateEmailDeliveryStatus } from '../supabase/queries/emailDelivery';
import { isWithinQuietHours } from '../utils/timezone';

const resend = new Resend(process.env.RESEND_KEY);

export interface EmailOptions {
    to: string | string[];
    subject: string;
    react: React.ReactElement;
    metadata?: Record<string, any>;
}

/**
 * Generic email sending function with logging
 */
export async function sendEmail(
    organizationId: string,
    emailType: 'low_stock_alert' | 'low_stock_digest' | 'daily_summary' | 'inventory_adjustment_request',
    options: EmailOptions
): Promise<{ success: boolean; emailId?: string; error?: string }> {
    try {
        // Log email attempt

        // Send email via Resend
        const recipients = Array.isArray(options.to) ? options.to : [options.to];
        const { data, error } = await resend.emails.send({
            from: 'Laza Dessert Cafe <support@lazadessert.cafe>',
            to: recipients,
            subject: options.subject,
            react: options.react,
        });

        if (error) {
            // Update log with error
            // await updateEmailDeliveryStatus(logEntry.id, 'failed', error.message);
            return { success: false, error: error.message };
        }
        console.log('sendEmail: data', data)

        // Update log with success
        // await updateEmailDeliveryStatus(
        //     logEntry.id,
        //     'sent',
        //     null,
        //     data?.id || undefined
        // );
        const logEntry = await logEmailDelivery({
            resend_email_id: data?.id || null,
            error_message: error?.message || null,
            sent_at: new Date().toISOString(),
            organization_id: organizationId,
            email_type: emailType,
            recipient_email: Array.isArray(options.to) ? options.to[0] : options.to,
            subject: options.subject,
            status: 'sent',
            metadata: options.metadata || null,
        });


        return { success: true, emailId: data?.id };
    } catch (error: any) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message || 'Unknown error' };
    }
}

/**
 * Check if email should be sent based on quiet hours
 */
export async function shouldSendInQuietHours(
    organizationId: string,
    time: Date = new Date()
): Promise<boolean> {
    const preferences = await getNotificationPreferences(organizationId);
    if (!preferences) return true; // No preferences, allow sending

    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
        return true; // No quiet hours configured
    }

    return !isWithinQuietHours(
        time,
        preferences.quiet_hours_start,
        preferences.quiet_hours_end,
        preferences.timezone
    );
}

/**
 * Get all email recipients for an organization.
 * When locationId is provided, tries the location-specific row first,
 * then falls back to the org-wide row.
 */
export async function getRecipients(organizationId: string, locationId?: string | null): Promise<string[]> {
    let preferences = locationId
        ? await getNotificationPreferences(organizationId, locationId)
        : null;

    if (!preferences) {
        preferences = await getNotificationPreferences(organizationId);
    }

    if (!preferences) return [];

    const recipients = [preferences.primary_email];
    if (preferences.secondary_emails && Array.isArray(preferences.secondary_emails)) {
        recipients.push(...preferences.secondary_emails);
    }

    return recipients.filter(Boolean) as string[];
}

