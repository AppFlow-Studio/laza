"use client";

import { useState } from 'react';
import { useEmailDeliveryLogs } from '@/lib/hooks/queries/useEmailDelivery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Mail } from 'lucide-react';

interface EmailDeliveryLogsProps {
    organizationId: string;
}

export default function EmailDeliveryLogs({ organizationId }: EmailDeliveryLogsProps) {
    const [filters, setFilters] = useState({
        emailType: undefined as 'low_stock_alert' | 'low_stock_digest' | 'daily_summary' | undefined,
        status: undefined as 'sent' | 'failed' | 'pending' | undefined,
        dateFrom: '',
        dateTo: '',
        limit: 50,
    });

    const { data, isLoading } = useEmailDeliveryLogs(organizationId, filters);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent':
                return <CheckCircle2 className="w-4 h-4 text-green-600" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-600" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-yellow-600" />;
            default:
                return <Mail className="w-4 h-4 text-zinc-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'sent':
                return 'text-green-600 bg-green-50';
            case 'failed':
                return 'text-red-600 bg-red-50';
            case 'pending':
                return 'text-yellow-600 bg-yellow-50';
            default:
                return 'text-zinc-600 bg-zinc-50';
        }
    };

    if (isLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Email Delivery Logs</CardTitle>
                <CardDescription>
                    View history of all email notifications sent
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-zinc-50 rounded-lg">
                    <div className="space-y-2">
                        <Label>Email Type</Label>
                        <select
                            value={filters.emailType || ''}
                            onChange={(e) => setFilters({ ...filters, emailType: e.target.value as any || undefined })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        >
                            <option value="">All Types</option>
                            <option value="low_stock_alert">Low Stock Alert</option>
                            <option value="low_stock_digest">Low Stock Digest</option>
                            <option value="daily_summary">Daily Summary</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <select
                            value={filters.status || ''}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="sent">Sent</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>From Date</Label>
                        <Input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>To Date</Label>
                        <Input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        />
                    </div>
                </div>

                {/* Logs Table */}
                {data?.logs && data.logs.length > 0 ? (
                    <div className="space-y-2">
                        <div className="text-sm text-zinc-600">
                            Showing {data.logs.length} of {data.total} emails
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-zinc-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Recipient</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Subject</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase">Sent At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.logs.map((log: any) => (
                                            <tr key={log.id} className="hover:bg-zinc-50">
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="capitalize">
                                                        {log.email_type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{log.recipient_email}</td>
                                                <td className="px-4 py-3 text-sm max-w-md truncate" title={log.subject}>
                                                    {log.subject}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                                                        {getStatusIcon(log.status)}
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-zinc-600">
                                                    {log.sent_at
                                                        ? format(new Date(log.sent_at), 'MMM d, yyyy h:mm a')
                                                        : log.created_at
                                                            ? format(new Date(log.created_at), 'MMM d, yyyy h:mm a')
                                                            : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        {data.total > data.logs.length && (
                            <div className="text-center text-sm text-zinc-600">
                                Showing first {data.logs.length} results. Use filters to narrow down.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-zinc-500">
                        <Mail className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
                        <p>No email logs found</p>
                        <p className="text-sm mt-2">Emails will appear here once notifications are sent</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

