"use client";

import { useState } from 'react';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import GeneralNotificationPreferences from '@/components/admin/settings/GeneralNotificationPreferences';
import LowStockAlertPreferences from '@/components/admin/settings/LowStockAlertPreferences';
import LowStockThresholdManager from '@/components/admin/settings/LowStockThresholdManager';
import DailySummaryPreferences from '@/components/admin/settings/DailySummaryPreferences';
import EmailDeliveryLogs from '@/components/admin/settings/EmailDeliveryLogs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Mail, AlertTriangle, BarChart3, History } from 'lucide-react';

export default function NotificationSettingsPage() {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;

    if (!organizationId) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900">Notification Settings</h1>
                <p className="text-sm text-zinc-600 mt-1">
                    Configure email notifications for low stock alerts and daily summaries
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span className="hidden sm:inline">General</span>
                    </TabsTrigger>
                    <TabsTrigger value="low-stock" className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="hidden sm:inline">Low Stock</span>
                    </TabsTrigger>
                    <TabsTrigger value="thresholds" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        <span className="hidden sm:inline">Thresholds</span>
                    </TabsTrigger>
                    <TabsTrigger value="daily-summary" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="hidden sm:inline">Daily Summary</span>
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        <span className="hidden sm:inline">Logs</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-6">
                    <GeneralNotificationPreferences organizationId={organizationId} />
                </TabsContent>

                <TabsContent value="low-stock" className="mt-6">
                    <LowStockAlertPreferences organizationId={organizationId} />
                </TabsContent>

                <TabsContent value="thresholds" className="mt-6">
                    <LowStockThresholdManager organizationId={organizationId} />
                </TabsContent>

                <TabsContent value="daily-summary" className="mt-6">
                    <DailySummaryPreferences organizationId={organizationId} />
                </TabsContent>

                <TabsContent value="logs" className="mt-6">
                    <EmailDeliveryLogs organizationId={organizationId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

