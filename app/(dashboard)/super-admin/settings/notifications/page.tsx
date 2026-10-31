"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import GeneralNotificationPreferences from "@/components/admin/settings/GeneralNotificationPreferences";
import LowStockAlertPreferences from "@/components/admin/settings/LowStockAlertPreferences";
import LowStockThresholdManager from "@/components/admin/settings/LowStockThresholdManager";
import DailySummaryPreferences from "@/components/admin/settings/DailySummaryPreferences";
import EmailDeliveryLogs from "@/components/admin/settings/EmailDeliveryLogs";
import { Bell, Mail, AlertTriangle, BarChart3, History } from "lucide-react";

type TabId = "general" | "low-stock" | "thresholds" | "daily-summary" | "logs";

const tabs: { id: TabId; label: string; icon: React.ReactNode; description: string }[] = [
    {
        id: "general",
        label: "General",
        icon: <Bell className="w-4 h-4" />,
        description: "Email addresses, timezone, and master toggle",
    },
    {
        id: "low-stock",
        label: "Low Stock",
        icon: <AlertTriangle className="w-4 h-4" />,
        description: "Alert delivery for low stock events",
    },
    {
        id: "thresholds",
        label: "Thresholds",
        icon: <BarChart3 className="w-4 h-4" />,
        description: "Per-item reorder threshold settings",
    },
    {
        id: "daily-summary",
        label: "Daily Summary",
        icon: <Mail className="w-4 h-4" />,
        description: "Morning digest schedule and content",
    },
    {
        id: "logs",
        label: "Logs",
        icon: <History className="w-4 h-4" />,
        description: "Email delivery history and status",
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.26, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
    }),
};

export default function NotificationSettingsPage() {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    const [activeTab, setActiveTab] = useState<TabId>("general");

    if (!organizationId) {
        return <LoadingSkeleton />;
    }

    const activeTabMeta = tabs.find((t) => t.id === activeTab)!;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <motion.div
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="show"
            >
                <h1 className="text-xl font-semibold text-gray-900">Notification Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Configure email alerts, delivery preferences, and notification thresholds
                </p>
            </motion.div>

            <div className="flex gap-6">
                {/* Sidebar tab nav */}
                <motion.nav
                    custom={1}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="w-52 shrink-0 flex flex-col gap-1"
                >
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
                                activeTab === tab.id
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                            }`}
                        >
                            <span
                                className={`mt-0.5 shrink-0 transition-colors ${
                                    activeTab === tab.id ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
                                }`}
                            >
                                {tab.icon}
                            </span>
                            <div className="min-w-0">
                                <p className={`text-sm font-medium ${activeTab === tab.id ? "text-indigo-700" : ""}`}>
                                    {tab.label}
                                </p>
                                <p className={`text-xs mt-0.5 leading-tight ${activeTab === tab.id ? "text-indigo-500" : "text-gray-400"}`}>
                                    {tab.description}
                                </p>
                            </div>
                        </button>
                    ))}
                </motion.nav>

                {/* Tab content */}
                <motion.div
                    custom={2}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="flex-1 min-w-0"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0, transition: { duration: 0.2 } }}
                            exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
                        >
                            {activeTab === "general" && (
                                <GeneralNotificationPreferences organizationId={organizationId} />
                            )}
                            {activeTab === "low-stock" && (
                                <LowStockAlertPreferences organizationId={organizationId} />
                            )}
                            {activeTab === "thresholds" && (
                                <LowStockThresholdManager organizationId={organizationId} />
                            )}
                            {activeTab === "daily-summary" && (
                                <DailySummaryPreferences organizationId={organizationId} />
                            )}
                            {activeTab === "logs" && (
                                <EmailDeliveryLogs organizationId={organizationId} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
