"use client";

import { useUser } from '@clerk/nextjs';
import { useEmployeeLocation, useEmployeeStorageSpaces, useEmployeeStats } from '@/lib/hooks/queries/useEmployee';
import { motion } from 'framer-motion';
import { Package, AlertTriangle, Clock, Warehouse } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { LoadingSkeleton, CardSkeleton } from '@/components/admin/shared/LoadingSkeleton';

export default function EmployeeDashboard() {
    const { user } = useUser();
    const router = useRouter();
    const { data: location, isLoading: locationLoading } = useEmployeeLocation();
    const { data: storageSpaces, isLoading: spacesLoading } = useEmployeeStorageSpaces(location?.id || null);
    const { data: stats } = useEmployeeStats(user?.id || null, location?.id || null);
    if (locationLoading || spacesLoading) {
        return (
            <div className="p-4 space-y-4">
                <div className="h-24 bg-white rounded-xl animate-pulse" />
                <div className="grid grid-cols-2 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        );
    }

    if (!location) {
        return (
            <div className="p-4 text-center">
                <p className="text-zinc-500">No location assigned</p>
            </div>
        );
    }

    const address = typeof location.address === 'string'
        ? JSON.parse(location.address)
        : location.address;

    const getTemperatureIcon = (type: string) => {
        switch (type) {
            case 'frozen':
                return '🧊';
            case 'refrigerated':
                return '❄️';
            case 'dry':
                return '📦';
            default:
                return '📦';
        }
    };

    const getTemperatureColor = (type: string) => {
        switch (type) {
            case 'frozen':
                return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'refrigerated':
                return 'bg-cyan-50 text-cyan-600 border-cyan-200';
            case 'dry':
                return 'bg-amber-50 text-amber-600 border-amber-200';
            default:
                return 'bg-zinc-50 text-zinc-600 border-zinc-200';
        }
    };

    const handleStorageSpaceClick = (spaceId: string) => {
        router.push(`/employee/storage-spaces/${spaceId}`);
    };
    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <h1 className="text-3xl font-bold text-zinc-900 mb-1">{location.name}</h1>
                <p className="text-zinc-600 text-sm">
                    {address?.street}, {address?.city}, {address?.state} {address?.zip}
                </p>
            </motion.div>

            {/* Quick Stats */}
            <div className="gap-3 sm:grid sm:grid-cols-3 grid-cols-2 grid pb-2 -mx-4 px-4 scrollbar-hide">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex-shrink-0 w-40 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white"
                >
                    <Warehouse className="w-6 h-6 mb-2 opacity-90" />
                    <p className="text-xs opacity-90 mb-1">Storage Spaces</p>
                    <p className="text-2xl font-bold">{storageSpaces?.length || 0}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="flex-shrink-0 w-40 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white"
                >
                    <Package className="w-6 h-6 mb-2 opacity-90" />
                    <p className="text-xs opacity-90 mb-1">Items Managed</p>
                    <p className="text-2xl font-bold">{stats?.itemsManaged || 0}</p>
                </motion.div>
                {/* <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex-shrink-0 w-40 bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white sm:col-span-1 col-span-2 "
                >
                    <Clock className="w-6 h-6 mb-2 opacity-90" />
                    <p className="text-xs opacity-90 mb-1">This Week</p>
                    <p className="text-2xl font-bold">{stats?.weeklyUpdates || 0}</p>
                </motion.div> */}
            </div>

            {/* Storage Spaces Grid */}
            <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">Storage Spaces</h2>
                {!storageSpaces || storageSpaces.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                        <Warehouse className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-500">No storage spaces in this location yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {storageSpaces.map((space, index) => (
                            <motion.div
                                key={space.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleStorageSpaceClick(space.id)}
                                className={cn(
                                    "bg-white rounded-xl p-4 border-2 border-zinc-200",
                                    "cursor-pointer transition-all",
                                    "hover:border-indigo-300 hover:shadow-md active:scale-95"
                                )}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-zinc-900 mb-1">{space.name}</h3>
                                        <span className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                                            getTemperatureColor(space.temperature_type)
                                        )}>
                                            <span>{getTemperatureIcon(space.temperature_type)}</span>
                                            {space.temperature_type.charAt(0).toUpperCase() + space.temperature_type.slice(1)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-zinc-600">
                                    <Package className="w-4 h-4" />
                                    <span>View items</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

