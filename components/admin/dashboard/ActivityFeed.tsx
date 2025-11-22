"use client";

import { useInventoryLogs } from '@/lib/hooks/queries/useInventory';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ActivityFeed() {
    const { data: logs, isLoading } = useInventoryLogs({ limit: 10 });

    const getActionTypeColor = (actionType: string) => {
        switch (actionType) {
            case 'received':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'used':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'adjustment':
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'count':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            default:
                return 'bg-zinc-50 text-zinc-700 border-zinc-200';
        }
    };

    const getActionTypeLabel = (actionType: string) => {
        switch (actionType) {
            case 'received':
                return 'Received';
            case 'used':
                return 'Used';
            case 'adjustment':
                return 'Adjustment';
            case 'count':
                return 'Count';
            default:
                return actionType;
        }
    };

    const getUserDisplayName = (user: any) => {
        if (!user) return 'Unknown User';
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        if (user.first_name) {
            return user.first_name;
        }
        return user.email || 'Unknown User';
    };

    const getUserInitials = (user: any) => {
        if (!user) return 'U';
        if (user.first_name) {
            return user.first_name[0].toUpperCase();
        }
        if (user.email) {
            return user.email[0].toUpperCase();
        }
        return 'U';
    };

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
        <div className="space-y-2">
            {logs.map((log: any) => {
                const isIncrease = log.quantity_change > 0;
                const isDecrease = log.quantity_change < 0;
                const isNoChange = log.quantity_change === 0;

                return (
                    <div
                        key={log.id}
                        className="bg-white rounded-lg border border-zinc-200 p-4 hover:shadow-sm transition-shadow"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-semibold">
                                        {getUserInitials(log.users)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-zinc-900 truncate">
                                            {log.items?.name || 'Unknown Item'}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {getUserDisplayName(log.users)} • {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                                        </p>
                                    </div>
                                    <span className={cn("px-2 py-1 rounded text-xs font-medium border", getActionTypeColor(log.action_type))}>
                                        {getActionTypeLabel(log.action_type)}
                                    </span>
                                </div>

                                {log.items?.sku && (
                                    <p className="text-xs text-zinc-500 mb-2">SKU: {log.items.sku}</p>
                                )}

                                {(log.locations || log.storage_spaces) && (
                                    <p className="text-xs text-zinc-500 mb-2">
                                        {log.locations?.name || 'Unknown Location'}
                                        {log.storage_spaces && ` • ${log.storage_spaces.name}`}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-500">Previous:</span>
                                        <span className="font-medium">{log.previous_quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isIncrease && <ArrowUp className="w-4 h-4 text-green-600" />}
                                        {isDecrease && <ArrowDown className="w-4 h-4 text-red-600" />}
                                        {isNoChange && <Minus className="w-4 h-4 text-zinc-400" />}
                                        <span className={cn(
                                            "font-semibold",
                                            isIncrease && "text-green-600",
                                            isDecrease && "text-red-600",
                                            isNoChange && "text-zinc-500"
                                        )}>
                                            {isIncrease ? '+' : ''}{log.quantity_change}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-500">New:</span>
                                        <span className="font-medium">{log.new_quantity}</span>
                                    </div>
                                </div>

                                {log.notes && (
                                    <div className="mt-2 pt-2 border-t border-zinc-100">
                                        <p className="text-sm text-zinc-600 italic">"{log.notes}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

