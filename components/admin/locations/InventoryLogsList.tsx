"use client";

import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ArrowUp, ArrowDown, Minus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import SearchBar from '@/components/admin/shared/SearchBar';
import EmployeeFilter from '@/components/admin/locations/EmployeeFilter';
import ItemFilter from '@/components/admin/locations/ItemFilter';
import DateRangePicker from '@/components/admin/shared/DateRangePicker';
import { Button } from '@/components/ui/button';

interface InventoryLog {
    id: string;
    item_id: string;
    user_id?: string | null;
    previous_quantity: number;
    new_quantity: number;
    quantity_change: number;
    action_type: 'count' | 'adjustment' | 'received' | 'used';
    notes: string | null;
    created_at: string;
    items?: {
        id: string;
        name: string;
        sku?: string | null;
    } | null;
    users?: {
        id: string;
        first_name?: string | null;
        last_name?: string | null;
        email: string;
    } | null;
}

interface InventoryLogsListProps {
    logs: InventoryLog[];
    isLoading?: boolean;
    onRefresh?: () => void;
}

export default function InventoryLogsList({ logs, isLoading, onRefresh }: InventoryLogsListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [datePreset, setDatePreset] = useState<'today' | 'last7' | 'last30' | 'last90' | 'custom' | null>(null);

    // Extract unique employees and items from logs
    const uniqueEmployees = useMemo(() => {
        const employeeMap = new Map<string, InventoryLog['users']>();
        logs.forEach(log => {
            if (log.users && log.users.id) {
                employeeMap.set(log.users.id, log.users);
            }
        });
        return Array.from(employeeMap.values()).map(user => ({
            id: user!.id,
            first_name: user!.first_name,
            last_name: user!.last_name,
            email: user!.email,
        }));
    }, [logs]);

    const uniqueItems = useMemo(() => {
        const itemMap = new Map<string, InventoryLog['items']>();
        logs.forEach(log => {
            if (log.items && log.items.id) {
                itemMap.set(log.items.id, log.items);
            }
        });
        return Array.from(itemMap.values()).map(item => ({
            id: item!.id,
            name: item!.name,
            sku: item!.sku,
        }));
    }, [logs]);

    // Client-side filtering logic
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // Search filter
            if (searchQuery) {
                const searchLower = searchQuery.toLowerCase();
                const itemName = log.items?.name?.toLowerCase() || '';
                const itemSku = log.items?.sku?.toLowerCase() || '';
                const userName = getUserDisplayName(log.users).toLowerCase();
                const notes = log.notes?.toLowerCase() || '';
                const actionType = getActionTypeLabel(log.action_type).toLowerCase();
                const quantities = [
                    log.previous_quantity.toString(),
                    log.new_quantity.toString(),
                    log.quantity_change.toString(),
                ].join(' ');

                const matchesSearch =
                    itemName.includes(searchLower) ||
                    itemSku.includes(searchLower) ||
                    userName.includes(searchLower) ||
                    notes.includes(searchLower) ||
                    actionType.includes(searchLower) ||
                    quantities.includes(searchLower);

                if (!matchesSearch) return false;
            }

            // Employee filter
            if (selectedEmployee) {
                const logUserId = log.user_id || log.users?.id;
                if (logUserId !== selectedEmployee) return false;
            }

            // Item filter
            if (selectedItem) {
                const logItemId = log.item_id || log.items?.id;
                if (logItemId !== selectedItem) return false;
            }

            // Date range filter
            if (startDate || endDate) {
                const logDate = new Date(log.created_at);
                if (startDate && endDate) {
                    const range = { start: startOfDay(startDate), end: endOfDay(endDate) };
                    if (!isWithinInterval(logDate, range)) return false;
                } else if (startDate) {
                    if (logDate < startOfDay(startDate)) return false;
                } else if (endDate) {
                    if (logDate > endOfDay(endDate)) return false;
                }
            }

            return true;
        });
    }, [logs, searchQuery, selectedEmployee, selectedItem, startDate, endDate]);

    const handleDateRangeChange = (start: Date | null, end: Date | null, preset: typeof datePreset) => {
        setStartDate(start);
        setEndDate(end);
        setDatePreset(preset);
    };

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

    const getUserDisplayName = (user: InventoryLog['users']) => {
        if (!user) return 'Unknown User';
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        if (user.first_name) {
            return user.first_name;
        }
        return user.email || 'Unknown User';
    };

    const getUserInitials = (user: InventoryLog['users']) => {
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
            <div className="flex items-center justify-center py-12">
                <p className="text-zinc-500">Loading logs...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Sticky Header with Search and Filters */}
            <div className="sticky top-0 z-20 bg-white pb-4 border-b border-zinc-200 -mx-4 px-4 pt-0 shadow-sm">
                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex-1 w-full">
                            <SearchBar
                                placeholder="Search logs by item, user, notes, SKU..."
                                onSearch={setSearchQuery}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <EmployeeFilter
                                employees={uniqueEmployees}
                                value={selectedEmployee}
                                onChange={setSelectedEmployee}
                            />
                            <ItemFilter
                                items={uniqueItems}
                                value={selectedItem}
                                onChange={setSelectedItem}
                            />
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onChange={handleDateRangeChange}
                            />
                            {onRefresh && (
                                <Button
                                    onClick={onRefresh}
                                    size="sm"
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Refresh
                                </Button>
                            )}
                        </div>
                    </div>
                    {(searchQuery || selectedEmployee || selectedItem || startDate || endDate) && (
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                            <span>Showing {filteredLogs.length} of {logs.length} logs</span>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedEmployee(null);
                                    setSelectedItem(null);
                                    setStartDate(null);
                                    setEndDate(null);
                                    setDatePreset(null);
                                }}
                                className="text-indigo-600 hover:text-indigo-700 underline"
                            >
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Logs List - Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                        <p className="text-zinc-500">
                            {logs.length === 0
                                ? 'No inventory logs found'
                                : 'No logs match your filters'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 py-4">
                        {filteredLogs.map((log) => {
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
                )}
            </div>
        </div>
    );
}

