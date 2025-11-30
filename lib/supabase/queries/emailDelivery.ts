"use server";

import { createServerSupabaseClient } from '../server';

// Types
export interface EmailDeliveryLog {
    id: string;
    organization_id: string;
    email_type: 'low_stock_alert' | 'low_stock_digest' | 'daily_summary';
    recipient_email: string;
    subject: string;
    resend_email_id: string | null;
    status: 'sent' | 'failed' | 'pending';
    error_message: string | null;
    metadata: Record<string, any> | null;
    sent_at: string | null;
    created_at: string;
}

export interface EmailDeliveryLogFilters {
    emailType?: 'low_stock_alert' | 'low_stock_digest' | 'daily_summary';
    status?: 'sent' | 'failed' | 'pending';
    dateFrom?: string;
    dateTo?: string;
    recipientEmail?: string;
    limit?: number;
    offset?: number;
}

// Log email delivery
export async function logEmailDelivery(
    data: Omit<EmailDeliveryLog, 'id' | 'created_at'>
): Promise<EmailDeliveryLog> {
    const supabase = await createServerSupabaseClient();
    const { data: log, error } = await supabase
        .from('email_delivery_logs')
        .insert({
            organization_id: data.organization_id,
            email_type: data.email_type,
            recipient_email: data.recipient_email,
            subject: data.subject,
            resend_email_id: data.resend_email_id || null,
            status: data.status || 'pending',
            error_message: data.error_message || null,
            metadata: data.metadata || null,
            sent_at: data.sent_at || null,
        })
        .select()
        .single();

    if (error) throw error;
    return log as EmailDeliveryLog;
}

// Get email delivery logs
export async function getEmailDeliveryLogs(
    organizationId: string,
    filters?: EmailDeliveryLogFilters
): Promise<{ logs: EmailDeliveryLog[]; total: number }> {
    const supabase = await createServerSupabaseClient();
    let query = supabase
        .from('email_delivery_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId);

    if (filters?.emailType) {
        query = query.eq('email_type', filters.emailType);
    }
    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
    }
    if (filters?.recipientEmail) {
        query = query.eq('recipient_email', filters.recipientEmail);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
        query = query.limit(filters.limit);
    }
    if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return {
        logs: (data || []) as EmailDeliveryLog[],
        total: count || 0,
    };
}

// Update email delivery status
export async function updateEmailDeliveryStatus(
    id: string,
    status: 'sent' | 'failed' | 'pending',
    error?: string | null,
    resendEmailId?: string | null
): Promise<EmailDeliveryLog> {
    const supabase = await createServerSupabaseClient();
    const updateData: any = {
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
    };

    if (error !== undefined) {
        updateData.error_message = error;
    }
    if (resendEmailId !== undefined) {
        updateData.resend_email_id = resendEmailId;
    }

    const { data: log, error: updateError } = await supabase
        .from('email_delivery_logs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (updateError) throw updateError;
    return log as EmailDeliveryLog;
}

// Get failed emails for retry
export async function getFailedEmails(organizationId: string, limit = 50): Promise<EmailDeliveryLog[]> {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from('email_delivery_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return (data || []) as EmailDeliveryLog[];
}

