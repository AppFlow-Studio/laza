"use client";

import { useUser } from '@clerk/nextjs';
import { useEmployeeLocation, useEmployeeStats } from '@/lib/hooks/queries/useEmployee';
import { motion } from 'framer-motion';
import { User, Mail, MapPin, Package, Clock, TrendingUp, Warehouse } from 'lucide-react';
import { format } from 'date-fns';
import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const { user } = useUser();
    const router = useRouter();
    const { data: location, isLoading: locationLoading } = useEmployeeLocation();
    const { data: stats, isLoading: statsLoading } = useEmployeeStats(user?.id || null, location?.id || null);

    if (locationLoading || statsLoading) {
        return (
            <div className="p-4">
                <LoadingSkeleton />
            </div>
        );
    }

    const address = location && typeof location.address === 'string'
        ? JSON.parse(location.address)
        : location?.address;

    const statCards = [
        {
            icon: TrendingUp,
            label: 'Total Updates',
            value: stats?.totalUpdates || 0,
            color: 'from-indigo-500 to-indigo-600',
        },
        {
            icon: Clock,
            label: 'This Week',
            value: stats?.weeklyUpdates || 0,
            color: 'from-purple-500 to-purple-600',
        },
        {
            icon: Package,
            label: 'Items Managed',
            value: stats?.itemsManaged || 0,
            color: 'from-green-500 to-green-600',
        },
        {
            icon: Warehouse,
            label: 'Storage Spaces',
            value: location ? 'Active' : 'N/A',
            color: 'from-blue-500 to-blue-600',
        },
    ];

    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Profile Card */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white"
            >
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                        {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0] || 'U'}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold mb-1">
                            {user?.firstName && user?.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user?.emailAddresses[0]?.emailAddress || 'Employee'}
                        </h1>
                        <p className="text-indigo-100 text-sm">{user?.emailAddresses[0]?.emailAddress}</p>
                    </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Employee</span>
                </div>
            </motion.div>

            {/* Assigned Location Card */}
            {location && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl p-4 border border-zinc-200"
                >
                    <h2 className="text-lg font-semibold text-zinc-900 mb-4">Your Location</h2>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-indigo-600 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-zinc-900 mb-1">{location.name}</h3>
                                {address && (
                                    <p className="text-sm text-zinc-600">
                                        {address.street}, {address.city}, {address.state} {address.zip}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={() => router.push('/employee/dashboard')}
                            className="w-full"
                            variant="outline"
                        >
                            View Dashboard
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">Your Activity</h2>
                <div className="grid grid-cols-2 gap-4">
                    {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + (index * 0.05) }}
                                className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 text-white`}
                            >
                                <Icon className="w-6 h-6 mb-2 opacity-90" />
                                <p className="text-xs opacity-90 mb-1">{stat.label}</p>
                                <p className="text-2xl font-bold">{stat.value}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Last Activity */}
            {stats?.lastActivity && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl p-4 border border-zinc-200"
                >
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-zinc-400" />
                        <div>
                            <p className="text-sm font-medium text-zinc-900">Last Activity</p>
                            <p className="text-xs text-zinc-500">
                                {format(new Date(stats.lastActivity), 'MMM d, yyyy h:mm a')}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Sign Out */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <SignOutButton>
                    <Button variant="outline" className="w-full" size="lg">
                        Sign Out
                    </Button>
                </SignOutButton>
            </motion.div>
        </div>
    );
}

