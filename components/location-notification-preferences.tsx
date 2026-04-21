"use client";

import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import GeneralNotificationPreferences from "@/components/admin/settings/GeneralNotificationPreferences";
import LowStockAlertPreferences from "@/components/admin/settings/LowStockAlertPreferences";
import LowStockThresholdManager from "@/components/admin/settings/LowStockThresholdManager";
import DailySummaryPreferences from "@/components/admin/settings/DailySummaryPreferences";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Mail, AlertTriangle, BarChart3 } from "lucide-react";

interface LocationNotificationPreferencesProps {
    locationId: string;
}

export function LocationNotificationPreferences({
    locationId,
}: LocationNotificationPreferencesProps) {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;

    if (!organizationId) {
        return <LoadingSkeleton />;
    }

    return (
        <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
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
            </TabsList>

            <TabsContent value="general" className="mt-6">
                <GeneralNotificationPreferences
                    organizationId={organizationId}
                    locationId={locationId}
                />
            </TabsContent>

            <TabsContent value="low-stock" className="mt-6">
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
                <DailySummaryPreferences
                    organizationId={organizationId}
                    locationId={locationId}
                />
            </TabsContent>
        </Tabs>
    );
}
