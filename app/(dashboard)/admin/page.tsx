"use client";

import { useLocations } from '@/lib/hooks/queries/useLocations';
import { useItems } from '@/lib/hooks/queries/useItems';
import { useAlerts } from '@/lib/hooks/queries/useInventory';
import ActivityFeed from '@/components/admin/dashboard/ActivityFeed';
import ImmediateActions from '@/components/admin/dashboard/ImmediateActions';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import { useOrganizationUsers } from '@/lib/hooks/queries/useUsers';
import { useAdminStore } from '@/lib/stores/adminStore';

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    accent?: "default" | "red" | "orange" | "yellow" | "green" | "indigo";
    loading?: boolean;
}

function StatCard({ label, value, icon, accent = "default", loading }: StatCardProps) {
    const accentStyles = {
        default: {
            bg: "bg-white",
            iconBg: "bg-gray-50",
            iconColor: "text-gray-500",
            valueColor: "text-gray-900",
            border: "border-gray-200",
        },
        red: {
            bg: "bg-red-50",
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
            valueColor: "text-red-700",
            border: "border-red-200",
        },
        orange: {
            bg: "bg-orange-50",
            iconBg: "bg-orange-100",
            iconColor: "text-orange-600",
            valueColor: "text-orange-700",
            border: "border-orange-200",
        },
        yellow: {
            bg: "bg-yellow-50",
            iconBg: "bg-yellow-100",
            iconColor: "text-yellow-600",
            valueColor: "text-yellow-700",
            border: "border-yellow-200",
        },
        green: {
            bg: "bg-green-50",
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
            valueColor: "text-green-700",
            border: "border-green-200",
        },
        indigo: {
            bg: "bg-white",
            iconBg: "bg-indigo-50",
            iconColor: "text-indigo-600",
            valueColor: "text-gray-900",
            border: "border-gray-200",
        },
    };

    const styles = accentStyles[accent];

    return (
        <div className={`${styles.bg} ${styles.border} h-28 border rounded-xl p-5 transition-all duration-150`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 mb-1">{label}</p>
                    {loading ? (
                        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                    ) : (
                        <p className={`text-2xl font-bold ${styles.valueColor}`}>{value}</p>
                    )}
                </div>
                <div className={`${styles.iconBg} ${styles.iconColor} p-2.5 rounded-lg`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
    locations: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    employees: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    items: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    ),
    alerts: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    ),
    spend: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
    ),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const { selectedLocationId } = useAdminStore();
    const { data: userInfo } = useUserInfo();
    const { data: locations, isLoading: locationsLoading } = useLocations();
    const { data: employees, isLoading: employeesLoading } = useOrganizationUsers(userInfo?.members?.organization_id);
    const { data: items, isLoading: itemsLoading } = useItems();
    const { data: alerts, isLoading: alertsLoading } = useAlerts({ resolved: false, locationId: selectedLocationId ?? undefined });
    const assignedLocationId = userInfo?.assigned_location_id ?? null;

    const alertCount = alerts?.length ?? 0;

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard
                    label="Total Locations"
                    value={locations?.length ?? 0}
                    icon={Icons.locations}
                    loading={locationsLoading}
                />
                <StatCard
                    label="Employees"
                    value={employees?.length ?? 0}
                    icon={Icons.employees}
                    loading={employeesLoading}
                />
                <StatCard
                    label="Items"
                    value={items?.length ?? 0}
                    icon={Icons.items}
                    loading={itemsLoading}
                />
                <StatCard
                    label="Low Stock Alerts"
                    value={alertCount}
                    icon={Icons.alerts}
                    loading={alertsLoading}
                    accent={alertCount > 0 ? "red" : "default"}
                />
            </div>

            {/* Immediate Actions */}
            <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">Immediate Actions</h2>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                    <ImmediateActions />
                </div>
            </div>

            {/* Activity Feed */}
            <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">Recent Activity</h2>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                    <ActivityFeed />
                </div>
            </div>
        </div>
    );
}
