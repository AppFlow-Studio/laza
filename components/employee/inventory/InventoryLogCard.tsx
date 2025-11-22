"use client";

import { format, formatDistanceToNow } from 'date-fns';
import { ArrowUp, ArrowDown, Minus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryLogCardProps {
    log: any;
}

export default function InventoryLogCard({ log }: InventoryLogCardProps) {
    const item = log.items;
    const storageSpace = log.storage_spaces;
    const user = log.users;

    const getActionTypeConfig = (actionType: string) => {
        switch (actionType) {
            case 'received':
                return {
                    icon: ArrowUp,
                    label: 'Received',
                    color: 'bg-green-50 text-green-600 border-green-200',
                    changeColor: 'text-green-600',
                };
            case 'used':
                return {
                    icon: ArrowDown,
                    label: 'Used',
                    color: 'bg-red-50 text-red-600 border-red-200',
                    changeColor: 'text-red-600',
                };
            case 'adjustment':
                return {
                    icon: Minus,
                    label: 'Adjustment',
                    color: 'bg-blue-50 text-blue-600 border-blue-200',
                    changeColor: 'text-blue-600',
                };
            case 'count':
                return {
                    icon: CheckCircle2,
                    label: 'Count',
                    color: 'bg-purple-50 text-purple-600 border-purple-200',
                    changeColor: 'text-purple-600',
                };
            default:
                return {
                    icon: CheckCircle2,
                    label: 'Update',
                    color: 'bg-zinc-50 text-zinc-600 border-zinc-200',
                    changeColor: 'text-zinc-600',
                };
        }
    };

    const config = getActionTypeConfig(log.action_type);
    const Icon = config.icon;
    const quantityChange = log.quantity_change || 0;
    const isPositive = quantityChange > 0;

    const getUserDisplayName = (user: any) => {
        if (user?.first_name && user?.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        if (user?.first_name) {
            return user.first_name;
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'Unknown';
    };

    return (
        <div className="bg-white rounded-xl p-4 border border-zinc-200">
            <div className="flex items-start gap-3">
                <div className={cn(
                    "p-2 rounded-lg border",
                    config.color
                )}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                            <h3 className="font-semibold text-zinc-900 mb-1">{item?.name || 'Unknown Item'}</h3>
                            {storageSpace && (
                                <p className="text-xs text-zinc-500 mb-1">{storageSpace.name}</p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className={cn(
                                "text-lg font-bold",
                                isPositive ? config.changeColor : config.changeColor
                            )}>
                                {isPositive ? '+' : ''}{quantityChange.toFixed(2)}
                            </p>
                            <p className="text-xs text-zinc-500">
                                {log.previous_quantity.toFixed(2)} → {log.new_quantity.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium border",
                            config.color
                        )}>
                            {config.label}
                        </span>
                        {user && (
                            <span className="text-xs text-zinc-500">
                                by {getUserDisplayName(user)}
                            </span>
                        )}
                    </div>
                    {log.notes && (
                        <p className="text-sm text-zinc-600 bg-zinc-50 rounded-lg p-2 mt-2">
                            {log.notes}
                        </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-2">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                </div>
            </div>
        </div>
    );
}

