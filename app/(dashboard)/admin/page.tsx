"use client";

import { useLocations } from '@/lib/hooks/queries/useLocations';
import { useItems } from '@/lib/hooks/queries/useItems';
import { useAlerts } from '@/lib/hooks/queries/useInventory';
import StatsCard from '@/components/admin/dashboard/StatsCard';
import QuickActions from '@/components/admin/dashboard/QuickActions';
import ActivityFeed from '@/components/admin/dashboard/ActivityFeed';
import { MapPin, Users, Package, AlertTriangle, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import toast from 'react-hot-toast';
import ImmediateActions from '@/components/admin/dashboard/ImmediateActions';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import { useOrganizationUsers } from '@/lib/hooks/queries/useUsers';
import { useAdminStore } from '@/lib/stores/adminStore';
import { useMonthlySpend } from '@/lib/hooks/queries/useWarehouseSpend';
// import { useInventoryLogsSubscription, useAlertsSubscription, useEmployeesSubscription } from '@/lib/supabase/subscriptions';

export default function AdminDashboard() {
    const { selectedLocationId } = useAdminStore();
    const { data: userInfo } = useUserInfo();
    const { data: locations, isLoading: locationsLoading } = useLocations();
    const { data: employees, isLoading: employeesLoading } = useOrganizationUsers(userInfo?.members?.organization_id);
    const { data: items, isLoading: itemsLoading } = useItems();
    const { data: alerts, isLoading: alertsLoading } = useAlerts({ resolved: false, locationId: selectedLocationId ?? undefined });
    const assignedLocationId = userInfo?.assigned_location_id ?? null;
    const { data: monthlySpend, isLoading: spendLoading } = useMonthlySpend(assignedLocationId);

    const [showAddLocation, setShowAddLocation] = useState(false);
    const [showAddEmployee, setShowAddEmployee] = useState(false);
    const [showAddItem, setShowAddItem] = useState(false);

    // Real-time subscriptions
    // useInventoryLogsSubscription();
    // useAlertsSubscription();
    // useEmployeesSubscription();

    const stats = [
        {
            title: 'Total Locations',
            value: locations?.length || 0,
            icon: MapPin,
            trend: undefined,
        },
        {
            title: 'Employees',
            value: employees?.length || 0,
            icon: Users,
            trend: undefined,
        },
        {
            title: 'Items',
            value: items?.length || 0,
            icon: Package,
            trend: undefined,
        },
        {
            title: 'Low Stock Alerts',
            value: alerts?.length || 0,
            icon: AlertTriangle,
            trend: undefined,
            className: alerts && alerts.length > 0 ? 'border-red-200 bg-red-50' : '',
        },
    ];

    const spendFormatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(monthlySpend ?? 0);

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <StatsCard key={stat.title} {...stat} />
                ))}
                {/* Warehouse spend this month */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-zinc-600 mb-2">Warehouse spend this month</p>
                            <div className="flex items-baseline gap-2">
                                {spendLoading ? (
                                    <span className="text-3xl font-semibold text-zinc-300 animate-pulse">—</span>
                                ) : (
                                    <span className="text-3xl font-semibold text-zinc-900">{spendFormatted}</span>
                                )}
                            </div>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-lg">
                            <ShoppingBag className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            {/* <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">Quick Actions</h2>
                <QuickActions
                    onAddLocation={() => {
                        toast.success('Add Location feature coming soon');
                        setShowAddLocation(true);
                    }}
                    onAddEmployee={() => {
                        toast.success('Add Employee feature coming soon');
                        setShowAddEmployee(true);
                    }}
                    onAddItem={() => {
                        toast.success('Add Item feature coming soon');
                        setShowAddItem(true);
                    }}
                />
            </div> */}

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
