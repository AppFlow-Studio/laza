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
import { Bell, Mail, AlertTriangle, BarChart3, History, Building2, Info } from 'lucide-react';
import {
    useNotificationPreferences,
    useUpdateNotificationPreferences,
} from '@/lib/hooks/queries/useNotificationPreferences';

// ─── "Inheriting from org defaults" banner ────────────────────────────────────

function OrgDefaultBanner() {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 mb-6">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            <p>
                Your store is using{' '}
                <span className="font-medium">organisation-wide defaults</span> for this
                section. Any changes you save here will only apply to your store and
                won't affect other locations.
            </p>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationSettingsPage() {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id as string | undefined;
    const locationId     = userInfo?.assigned_location_id     as string | undefined;
    const locationName   = userInfo?.location?.name           as string | undefined;

    // Does a location-specific override row exist yet?
    const { data: locationPrefs } = useNotificationPreferences(
        organizationId ?? null,
        locationId,
    );
    const isInheriting = !locationPrefs; // true until the admin saves their first override

    if (!organizationId) {
        return <LoadingSkeleton />;
    }

    if (!locationId) {
        return (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <p>
                    Your account isn't assigned to a location. Ask a Super Admin to
                    assign you to a store before configuring notifications.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900">
                    Notification Settings
                </h1>
                <p className="text-sm text-zinc-600 mt-1 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                    {locationName ?? 'Your store'} — changes here only affect this location
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

                {/* All sub-components receive organizationId (unchanged) PLUS the
                    new locationId prop so they can scope their queries and mutations.
                    The isInheriting banner lets the admin know they're seeing defaults. */}

                <TabsContent value="general" className="mt-6">
                    {isInheriting && <OrgDefaultBanner />}
                    <GeneralNotificationPreferences
                        organizationId={organizationId}
                        locationId={locationId}
                    />
                </TabsContent>

                <TabsContent value="low-stock" className="mt-6">
                    {isInheriting && <OrgDefaultBanner />}
                    <LowStockAlertPreferences
                        organizationId={organizationId}
                        locationId={locationId}
                    />
                </TabsContent>

                <TabsContent value="thresholds" className="mt-6">
                    <LowStockThresholdManager
                        organizationId={organizationId}
                        locationId={locationId}
                    />
                </TabsContent>

                <TabsContent value="daily-summary" className="mt-6">
                    {isInheriting && <OrgDefaultBanner />}
                    <DailySummaryPreferences
                        organizationId={organizationId}
                        locationId={locationId}
                    />
                </TabsContent>

                <TabsContent value="logs" className="mt-6">
                    <EmailDeliveryLogs organizationId={organizationId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}