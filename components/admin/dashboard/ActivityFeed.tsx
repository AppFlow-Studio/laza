"use client";

import { useInventoryLogs } from '@/lib/hooks/queries/useInventory';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { formatDistanceToNow } from 'date-fns';
import { Package, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ActivityFeed() {
    const { data: logs, isLoading } = useInventoryLogs({ limit: 10 });

    if (isLoading) {
        return (
            <div className="space-y-3">
                <LoadingSkeleton className="h-16" count={5} />
            </div>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-8 text-zinc-500">
                <p>No recent activity</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {logs.map((log: any) => {
                const isIncrease = log.quantity_change > 0;
                const isDecrease = log.quantity_change < 0;

                return (
                    <div
                        key={log.id}
                        className="flex items-start gap-3 p-4 bg-white rounded-lg border border-zinc-200 hover:shadow-sm transition-shadow"
                    >
                        <div className={cn(
                            "p-2 rounded-lg",
                            isIncrease && "bg-emerald-50",
                            isDecrease && "bg-red-50",
                            !isIncrease && !isDecrease && "bg-zinc-50"
                        )}>
                            {isIncrease && <ArrowUp className="w-4 h-4 text-emerald-600" />}
                            {isDecrease && <ArrowDown className="w-4 h-4 text-red-600" />}
                            {!isIncrease && !isDecrease && <Minus className="w-4 h-4 text-zinc-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900">
                                {log.items?.name || 'Unknown Item'}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {log.locations?.name || 'Unknown Location'}
                                {log.storage_spaces && ` • ${log.storage_spaces.name}`}
                            </p>
                            <p className="text-xs text-zinc-400 mt-1">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className={cn(
                                "text-sm font-semibold",
                                isIncrease && "text-emerald-600",
                                isDecrease && "text-red-600",
                                !isIncrease && !isDecrease && "text-zinc-600"
                            )}>
                                {isIncrease ? '+' : ''}{log.quantity_change}
                            </p>
                            <p className="text-xs text-zinc-400">
                                {log.action_type}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

