"use client";

import { useState, useMemo } from "react";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import {
    useBurnRates,
    useReorderAlerts,
    useStoreComparison,
    useMostOrderedItems,
    useWarehouseDepletion,
} from "@/lib/hooks/queries/useAnalytics";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";

// ─── Types ───────────────────────────────────────────────────────────────────

type DateRangePreset = "this_week" | "this_month" | "last_3_months" | "custom";

interface DateRange {
    from?: string;
    to?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPresetRange(preset: DateRangePreset): DateRange {
    const now = new Date();
    const to = now.toISOString().split("T")[0];

    switch (preset) {
        case "this_week": {
            const from = new Date(now);
            from.setDate(now.getDate() - 7);
            return { from: from.toISOString().split("T")[0], to };
        }
        case "this_month": {
            const from = new Date(now);
            from.setDate(now.getDate() - 30);
            return { from: from.toISOString().split("T")[0], to };
        }
        case "last_3_months": {
            const from = new Date(now);
            from.setDate(now.getDate() - 90);
            return { from: from.toISOString().split("T")[0], to };
        }
        default:
            return {};
    }
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function UrgencyBadge({
    urgency,
}: {
    urgency: "critical" | "warning" | "watch";
}) {
    const config = {
        critical: {
            label: "Critical",
            className: "bg-red-100 text-red-700 border border-red-200",
        },
        warning: {
            label: "Warning",
            className: "bg-orange-100 text-orange-700 border border-orange-200",
        },
        watch: {
            label: "Watch",
            className: "bg-yellow-100 text-yellow-700 border border-yellow-200",
        },
    };
    const { label, className } = config[urgency];
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
        >
            {label}
        </span>
    );
}

function SectionHeader({
    title,
    subtitle,
}: {
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
        </div>
    );
}

function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="h-12 bg-gray-100 rounded-lg animate-pulse"
                />
            ))}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                </svg>
            </div>
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );
}

// ─── Date Range Selector ─────────────────────────────────────────────────────

interface DateRangeSelectorProps {
    preset: DateRangePreset;
    customRange: DateRange;
    onPresetChange: (p: DateRangePreset) => void;
    onCustomChange: (r: DateRange) => void;
}

function DateRangeSelector({
    preset,
    customRange,
    onPresetChange,
    onCustomChange,
}: DateRangeSelectorProps) {
    const presets: { value: DateRangePreset; label: string }[] = [
        { value: "this_week", label: "This Week" },
        { value: "this_month", label: "This Month" },
        { value: "last_3_months", label: "Last 3 Months" },
        { value: "custom", label: "Custom" },
    ];

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                {presets.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => onPresetChange(p.value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                            preset === p.value
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {preset === "custom" && (
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={customRange.from ?? ""}
                        onChange={(e) =>
                            onCustomChange({
                                ...customRange,
                                from: e.target.value,
                            })
                        }
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <span className="text-gray-400 text-sm">→</span>
                    <input
                        type="date"
                        value={customRange.to ?? ""}
                        onChange={(e) =>
                            onCustomChange({
                                ...customRange,
                                to: e.target.value,
                            })
                        }
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            )}
        </div>
    );
}

// ─── Section: Reorder Alerts ─────────────────────────────────────────────────

function ReorderAlertsSection({ orgId }: { orgId: string }) {
    const { data: alerts, isLoading } = useReorderAlerts(orgId);
    // @ts-ignore
    const sorted = useMemo(
        () =>
            [...(alerts ?? [])].sort((a, b) => {
                const order = { critical: 0, warning: 1, watch: 2 };
                // @ts-ignore
                return order[a.urgency] - order[b.urgency];
            }),
        [alerts],
    );

    const counts = useMemo(
        () => ({
            critical: sorted.filter((a) => a.urgency === "critical").length,
            warning: sorted.filter((a) => a.urgency === "warning").length,
            watch: sorted.filter((a) => a.urgency === "watch").length,
        }),
        [sorted],
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">
                        Reorder Alerts
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Items approaching reorder threshold
                    </p>
                </div>
                {!isLoading && sorted.length > 0 && (
                    <div className="flex items-center gap-2">
                        {counts.critical > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                                {counts.critical} critical
                            </span>
                        )}
                        {counts.warning > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-600 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                                {counts.warning} warning
                            </span>
                        )}
                        {counts.watch > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-50 text-yellow-600 text-xs font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block" />
                                {counts.watch} watch
                            </span>
                        )}
                    </div>
                )}
            </div>

            {isLoading ? (
                <LoadingSkeleton rows={4} />
            ) : sorted.length === 0 ? (
                <EmptyState message="No items below reorder threshold. Warehouse is well-stocked." />
            ) : (
                <div className="divide-y divide-gray-100">
                    {sorted.map((alert) => (
                        <div
                            key={alert.item_id}
                            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <UrgencyBadge urgency={alert.urgency} />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {alert.item_name}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {alert.item_sku}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0 ml-4">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {alert.weeks_remaining != null
                                            ? `${Number(alert.weeks_remaining).toFixed(1)} wks`
                                            : "—"}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        remaining
                                    </p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {Number(alert.avg_weekly_units).toFixed(
                                            1,
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        units/wk
                                    </p>
                                </div>
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-semibold text-gray-900">
                                        {Number(
                                            alert.current_warehouse_stock,
                                        ).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        in stock
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Section: Warehouse Depletion Chart ──────────────────────────────────────

interface DepletionChartProps {
    orgId: string;
    dateRange: DateRange;
}

function WarehouseDepletionChart({ orgId, dateRange }: DepletionChartProps) {
    const { data: logs, isLoading } = useWarehouseDepletion(orgId, dateRange);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    const { chartData, itemOptions } = useMemo(() => {
        if (!logs || logs.length === 0)
            return { chartData: [], itemOptions: [] };

        // Group by item, then by date
        const itemMap = new Map<string, { id: string; name: string }>();
        logs.forEach((log: any) => {
            if (log.items?.id && log.items?.name) {
                itemMap.set(log.items.id, {
                    id: log.items.id,
                    name: log.items.name,
                });
            }
        });

        const options = Array.from(itemMap.values());
        const targetItemId = selectedItem ?? options[0]?.id;

        const filtered = logs.filter((l: any) => l.items?.id === targetItemId);

        const byDate = new Map<string, number>();
        filtered.forEach((log: any) => {
            const date = log.created_at.split("T")[0];
            // Use the last known quantity for that day
            byDate.set(date, log.new_quantity);
        });

        const sorted = Array.from(byDate.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, quantity]) => ({ date: formatDate(date), quantity }));

        return { chartData: sorted, itemOptions: options };
    }, [logs, selectedItem]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <SectionHeader
                        title="Warehouse Depletion"
                        subtitle="Stock level trend over selected period"
                    />
                </div>
                {itemOptions.length > 1 && (
                    <select
                        value={selectedItem ?? itemOptions[0]?.id ?? ""}
                        onChange={(e) => setSelectedItem(e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                        {itemOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {isLoading ? (
                <div className="h-56 bg-gray-50 rounded-lg animate-pulse" />
            ) : chartData.length === 0 ? (
                <EmptyState message="No inventory log data for the selected period." />
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                        data={chartData}
                        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                            width={45}
                        />
                        <Tooltip
                            contentStyle={{
                                fontSize: 12,
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                            }}
                            formatter={(value: number) => [
                                value.toLocaleString(),
                                "Stock",
                            ]}
                        />
                        <Line
                            type="monotone"
                            dataKey="quantity"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: "#6366f1" }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

// ─── Section: Store Comparison ───────────────────────────────────────────────

interface StoreComparisonProps {
    orgId: string;
    dateRange: DateRange;
}

const STORE_BAR_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#14b8a6",
];

function StoreComparisonChart({ orgId, dateRange }: StoreComparisonProps) {
    const { data: stores, isLoading } = useStoreComparison(orgId, dateRange);

    const chartData = useMemo(
        () =>
            (stores ?? []).map((s: any) => ({
                name:
                    s.location_name.length > 16
                        ? s.location_name.slice(0, 16) + "…"
                        : s.location_name,
                fullName: s.location_name,
                units: Number(s.total_units_fulfilled),
                tickets: Number(s.ticket_count),
            })),
        [stores],
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <SectionHeader
                title="Store Comparison"
                subtitle="Units fulfilled per store in selected period"
            />

            {isLoading ? (
                <div className="h-56 bg-gray-50 rounded-lg animate-pulse" />
            ) : chartData.length === 0 ? (
                <EmptyState message="No store order data for the selected period." />
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 4, right: 8, bottom: 20, left: 0 }}
                        barSize={28}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f0f0f0"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                            angle={-25}
                            textAnchor="end"
                            interval={0}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: "#9ca3af" }}
                            axisLine={false}
                            tickLine={false}
                            width={45}
                        />
                        <Tooltip
                            cursor={{ fill: "rgba(99,102,241,0.04)" }}
                            contentStyle={{
                                fontSize: 12,
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                            }}
                            formatter={(value: number, name: string) => [
                                value.toLocaleString(),
                                name === "units"
                                    ? "Units Fulfilled"
                                    : "Order Tickets",
                            ]}
                            labelFormatter={(label, payload) =>
                                payload?.[0]?.payload?.fullName ?? label
                            }
                        />
                        <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                            {chartData.map((_: any, index: number) => (
                                <Cell
                                    key={index}
                                    fill={
                                        STORE_BAR_COLORS[
                                            index % STORE_BAR_COLORS.length
                                        ]
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

// ─── Section: Most Ordered Items ─────────────────────────────────────────────

interface MostOrderedProps {
    orgId: string;
    dateRange: DateRange;
}

function MostOrderedItems({ orgId, dateRange }: MostOrderedProps) {
    const { data: items, isLoading } = useMostOrderedItems(orgId, dateRange);

    const topItems = useMemo(() => (items ?? []).slice(0, 10), [items]);

    const maxUnits = useMemo(
        () =>
            Math.max(
                ...topItems.map((i: any) => Number(i.total_units_fulfilled)),
                1,
            ),
        [topItems],
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <SectionHeader
                title="Most Ordered Items"
                subtitle="Top 10 items by fulfilled volume"
            />

            {isLoading ? (
                <LoadingSkeleton rows={6} />
            ) : topItems.length === 0 ? (
                <EmptyState message="No order data for the selected period." />
            ) : (
                <div className="space-y-2.5">
                    {topItems.map((item: any, index: number) => {
                        const units = Number(item.total_units_fulfilled);
                        const pct = (units / maxUnits) * 100;
                        return (
                            <div
                                key={item.item_id}
                                className="flex items-center gap-3"
                            >
                                <span className="text-xs font-mono text-gray-400 w-5 shrink-0 text-right">
                                    {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm font-medium text-gray-800 truncate">
                                                {item.item_name}
                                            </span>
                                            <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
                                                {item.item_sku}
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 ml-3 shrink-0">
                                            {units.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor:
                                                    STORE_BAR_COLORS[
                                                        index %
                                                            STORE_BAR_COLORS.length
                                                    ],
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Summary Stats Row ────────────────────────────────────────────────────────

function SummaryStats({ orgId }: { orgId: string }) {
    const { data: alerts } = useReorderAlerts(orgId);
    const { data: burnRates } = useBurnRates(orgId);

    const criticalCount = (alerts ?? []).filter(
        (a: any) => a.urgency === "critical",
    ).length;
    const totalAlerts = (alerts ?? []).length;
    const avgWeeksRemaining = (burnRates ?? [])
        .filter((b: any) => b.weeks_remaining != null)
        .reduce(
            (acc: any, b: any, _: any, arr: any) =>
                acc + Number(b.weeks_remaining) / arr.length,
            0,
        );

    const stats = [
        {
            label: "Critical Alerts",
            value: criticalCount,
            color: criticalCount > 0 ? "text-red-600" : "text-gray-900",
            bg: criticalCount > 0 ? "bg-red-50" : "bg-gray-50",
        },
        {
            label: "Total Alerts",
            value: totalAlerts,
            color: "text-gray-900",
            bg: "bg-gray-50",
        },
        {
            label: "Avg Weeks Remaining",
            value: isNaN(avgWeeksRemaining)
                ? "—"
                : avgWeeksRemaining.toFixed(1),
            color: "text-gray-900",
            bg: "bg-gray-50",
        },
        {
            label: "Items Tracked",
            value: (burnRates ?? []).length,
            color: "text-gray-900",
            bg: "bg-gray-50",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
            ))}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage() {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.organizationId ?? "";

    const [preset, setPreset] = useState<DateRangePreset>("this_month");
    const [customRange, setCustomRange] = useState<DateRange>({});

    const dateRange = useMemo<DateRange>(
        () => (preset === "custom" ? customRange : getPresetRange(preset)),
        [preset, customRange],
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="w-[40%]">
                    <h1 className="text-xl font-semibold text-gray-900">
                        Analytics
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Supply chain overview — burn rates, alerts, and store
                        performance
                    </p>
                </div>
                <DateRangeSelector
                    preset={preset}
                    customRange={customRange}
                    onPresetChange={setPreset}
                    onCustomChange={setCustomRange}
                />
            </div>

            {/* Summary stats */}
            {orgId && <SummaryStats orgId={orgId} />}

            {/* Reorder alerts — top priority, full width */}
            {orgId && <ReorderAlertsSection orgId={orgId} />}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {orgId && (
                    <WarehouseDepletionChart
                        orgId={orgId}
                        dateRange={dateRange}
                    />
                )}
                {orgId && (
                    <StoreComparisonChart orgId={orgId} dateRange={dateRange} />
                )}
            </div>

            {/* Most ordered items */}
            {orgId && <MostOrderedItems orgId={orgId} dateRange={dateRange} />}
        </div>
    );
}
