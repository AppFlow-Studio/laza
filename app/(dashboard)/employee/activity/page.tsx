"use client";

import { useEmployeeLocation, useEmployeeInventoryLogs } from '@/lib/hooks/queries/useEmployee';
import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, isToday, isYesterday, subDays, isWithinInterval } from 'date-fns';
import { motion } from 'motion/react';
import InventoryLogCard from '@/components/employee/inventory/InventoryLogCard';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type DateFilter = 'today' | 'week' | 'month' | 'all';

export default function ActivityPage() {
    const { data: location } = useEmployeeLocation();
    const { data: logs, isLoading: logsLoading } = useEmployeeInventoryLogs(location?.id || null, 100);
    const [dateFilter, setDateFilter] = useState<DateFilter>('today');

    const dateFilters = [
        { value: 'today' as DateFilter, label: 'Today' },
        { value: 'week' as DateFilter, label: 'This Week' },
        { value: 'month' as DateFilter, label: 'This Month' },
        { value: 'all' as DateFilter, label: 'All Time' },
    ];

    const filteredLogs = useMemo(() => {
        if (!logs) return [];

        let filtered = logs;

        // Apply date filter
        if (dateFilter !== 'all') {
            const now = new Date();
            let startDate: Date;

            switch (dateFilter) {
                case 'today':
                    startDate = startOfDay(now);
                    break;
                case 'week':
                    startDate = startOfDay(subDays(now, 7));
                    break;
                case 'month':
                    startDate = startOfDay(subDays(now, 30));
                    break;
                default:
                    return filtered;
            }

            filtered = filtered.filter((log: any) => {
                const logDate = new Date(log.created_at);
                return isWithinInterval(logDate, { start: startDate, end: endOfDay(now) });
            });
        }

        return filtered;
    }, [logs, dateFilter]);

    const groupedLogs = useMemo(() => {
        const groups: Record<string, any[]> = {};

        filteredLogs.forEach((log: any) => {
            const logDate = new Date(log.created_at);
            let groupKey: string;

            if (isToday(logDate)) {
                groupKey = 'Today';
            } else if (isYesterday(logDate)) {
                groupKey = 'Yesterday';
            } else {
                groupKey = format(logDate, 'MMM d, yyyy');
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(log);
        });

        return groups;
    }, [filteredLogs]);

    if (logsLoading) {
        return (
            <div className="p-4">
                <LoadingSkeleton />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 pb-24">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <h1 className="text-3xl font-bold text-zinc-900 mb-1">Activity</h1>
                <p className="text-zinc-600 text-sm">
                    {filteredLogs.length} update{filteredLogs.length !== 1 ? 's' : ''}
                    {dateFilter !== 'all' && (
                        <span className="text-zinc-400">
                            {dateFilter === 'today' && ' today'}
                            {dateFilter === 'week' && ' this week'}
                            {dateFilter === 'month' && ' this month'}
                        </span>
                    )}
                </p>
            </motion.div>

            {/* Date Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {dateFilters.map((filter) => (
                    <motion.button
                        key={filter.value}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDateFilter(filter.value)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                            dateFilter === filter.value
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                        )}
                    >
                        {filter.label}
                    </motion.button>
                ))}
            </div>

            {/* Activity List */}
            {filteredLogs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                    <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500">No recent activity</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedLogs).map(([dateGroup, groupLogs], groupIndex) => (
                        <motion.div
                            key={dateGroup}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: groupIndex * 0.1 }}
                        >
                            <h2 className="text-sm font-semibold text-zinc-600 mb-3 px-1">{dateGroup}</h2>
                            <div className="space-y-3">
                                {groupLogs.map((log: any, index: number) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                                    >
                                        <InventoryLogCard log={log} />
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

