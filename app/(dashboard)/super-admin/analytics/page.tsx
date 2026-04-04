"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRangePreset = "this_week" | "this_month" | "last_3_months" | "custom";
interface DateRange {
    from?: string;
    to?: string;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.35,
            delay: i * 0.07,
            ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
        },
    }),
};

const cardVariants = {
    hidden: { opacity: 0, y: 12, scale: 0.98 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.3,
            delay: i * 0.06,
            ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
        },
    }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPresetRange(preset: DateRangePreset): DateRange {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    switch (preset) {
        case "this_week": {
            const f = new Date(now);
            f.setDate(now.getDate() - 7);
            return { from: f.toISOString().split("T")[0], to };
        }
        case "this_month": {
            const f = new Date(now);
            f.setDate(now.getDate() - 30);
            return { from: f.toISOString().split("T")[0], to };
        }
        case "last_3_months": {
            const f = new Date(now);
            f.setDate(now.getDate() - 90);
            return { from: f.toISOString().split("T")[0], to };
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

const TOOLTIP_STYLE = {
    fontSize: 12,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
};

const BAR_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#14b8a6",
];

// ─── Shared skeleton ──────────────────────────────────────────────────────────

function Skeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="h-11 bg-gray-100 rounded-lg animate-pulse"
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
                    className="w-5 h-5 text-gray-300"
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
            <p className="text-sm text-gray-400">{message}</p>
        </div>
    );
}

// ─── Date Range Selector ──────────────────────────────────────────────────────

function DateRangeSelector({
    preset,
    customRange,
    onPresetChange,
    onCustomChange,
}: {
    preset: DateRangePreset;
    customRange: DateRange;
    onPresetChange: (p: DateRangePreset) => void;
    onCustomChange: (r: DateRange) => void;
}) {
    const presets: { value: DateRangePreset; label: string }[] = [
        { value: "this_week", label: "Week" },
        { value: "this_month", label: "Month" },
        { value: "last_3_months", label: "3 Months" },
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
                                : "text-gray-500 hover:text-gray-800"
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>
            {preset === "custom" && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2"
                >
                    <input
                        type="date"
                        value={customRange.from ?? ""}
                        onChange={(e) =>
                            onCustomChange({
                                ...customRange,
                                from: e.target.value,
                            })
                        }
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-gray-300 text-sm">→</span>
                    <input
                        type="date"
                        value={customRange.to ?? ""}
                        onChange={(e) =>
                            onCustomChange({
                                ...customRange,
                                to: e.target.value,
                            })
                        }
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </motion.div>
            )}
        </div>
    );
}

// ─── Summary stats ────────────────────────────────────────────────────────────

function SummaryStats({ orgId }: { orgId: string }) {
    const { data: alerts } = useReorderAlerts(orgId);
    const { data: burnRates } = useBurnRates(orgId);

    const criticalCount = (alerts ?? []).filter(
        (a: any) => a.urgency === "critical",
    ).length;
    const totalAlerts = (alerts ?? []).length;
    const avgWeeks = (burnRates ?? [])
        .filter((b: any) => b.weeks_remaining != null)
        .reduce(
            (acc: number, b: any, _: any, arr: any[]) =>
                acc + Number(b.weeks_remaining) / arr.length,
            0,
        );

    const stats = [
        {
            label: "Critical Alerts",
            value: criticalCount,
            color: criticalCount > 0 ? "text-red-600" : "text-gray-900",
            bg:
                criticalCount > 0
                    ? "bg-red-50 ring-1 ring-red-100"
                    : "bg-gray-50",
        },
        {
            label: "Total Alerts",
            value: totalAlerts,
            color: "text-gray-900",
            bg: "bg-gray-50",
        },
        {
            label: "Avg Weeks Left",
            value: isNaN(avgWeeks) ? "—" : avgWeeks.toFixed(1),
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
            {stats.map((s, i) => (
                <motion.div
                    key={s.label}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                    className={`${s.bg} rounded-xl p-4 transition-shadow hover:shadow-sm`}
                >
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold tabular-nums ${s.color}`}>
                        {s.value}
                    </p>
                </motion.div>
            ))}
        </div>
    );
}

// ─── Urgency badge ────────────────────────────────────────────────────────────

function UrgencyBadge({
    urgency,
}: {
    urgency: "critical" | "warning" | "watch";
}) {
    const cfg = {
        critical: {
            cls: "bg-red-100 text-red-700 border-red-200",
            label: "Critical",
        },
        warning: {
            cls: "bg-orange-100 text-orange-700 border-orange-200",
            label: "Warning",
        },
        watch: {
            cls: "bg-yellow-100 text-yellow-700 border-yellow-200",
            label: "Watch",
        },
    };
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg[urgency].cls}`}
        >
            {cfg[urgency].label}
        </span>
    );
}

// ─── Reorder alerts ───────────────────────────────────────────────────────────

function ReorderAlertsSection({ orgId }: { orgId: string }) {
    const { data: alerts, isLoading } = useReorderAlerts(orgId);

    const sorted = useMemo(
        () =>
            [...(alerts ?? [])].sort((a, b) => {
                const o = { critical: 0, warning: 1, watch: 2 };
                return (o as any)[a.urgency] - (o as any)[b.urgency];
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
        <motion.div
            variants={fadeUp}
            custom={0}
            initial="hidden"
            animate="show"
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-gray-900">
                        Reorder Alerts
                    </h2>
                    {!isLoading && sorted.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            {counts.critical > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                                    {/* pulsing dot for critical */}
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                                    </span>
                                    {counts.critical} critical
                                </span>
                            )}
                            {counts.warning > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                                    {counts.warning} warning
                                </span>
                            )}
                            {counts.watch > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 text-xs font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
                                    {counts.watch} watch
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="px-6">
                {isLoading ? (
                    <div className="py-4">
                        <Skeleton rows={4} />
                    </div>
                ) : sorted.length === 0 ? (
                    <EmptyState message="No items below reorder threshold. Warehouse is well-stocked." />
                ) : (
                    <div className="divide-y divide-gray-50">
                        {sorted.map((alert, i) => (
                            <motion.div
                                key={alert.item_id}
                                custom={i}
                                variants={fadeUp}
                                initial="hidden"
                                animate="show"
                                className={`flex items-center justify-between py-3.5 first:pt-4 last:pb-4 ${
                                    alert.urgency === "critical"
                                        ? "relative"
                                        : ""
                                }`}
                            >
                                {/* Red left accent for critical */}
                                {alert.urgency === "critical" && (
                                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-red-400" />
                                )}
                                <div className="flex items-center gap-3 min-w-0 pl-2">
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
                                <div className="flex items-center gap-5 shrink-0 ml-4">
                                    <div className="text-right">
                                        <p
                                            className={`text-sm font-bold tabular-nums ${
                                                alert.urgency === "critical"
                                                    ? "text-red-600"
                                                    : alert.urgency ===
                                                        "warning"
                                                      ? "text-orange-600"
                                                      : "text-yellow-600"
                                            }`}
                                        >
                                            {alert.weeks_remaining != null
                                                ? `${Number(alert.weeks_remaining).toFixed(1)} wks`
                                                : "—"}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            remaining
                                        </p>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-semibold text-gray-900 tabular-nums">
                                            {Number(
                                                alert.avg_weekly_units,
                                            ).toFixed(1)}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            units/wk
                                        </p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-semibold text-gray-900 tabular-nums">
                                            {Number(
                                                alert.current_warehouse_stock,
                                            ).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            in stock
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ─── Warehouse depletion ──────────────────────────────────────────────────────

function WarehouseDepletionChart({
    orgId,
    dateRange,
}: {
    orgId: string;
    dateRange: DateRange;
}) {
    const { data: logs, isLoading } = useWarehouseDepletion(orgId, dateRange);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    const { chartData, itemOptions } = useMemo(() => {
        if (!logs?.length) return { chartData: [], itemOptions: [] };
        const itemMap = new Map<string, { id: string; name: string }>();
        logs.forEach((log: any) => {
            if (log.items?.id)
                itemMap.set(log.items.id, {
                    id: log.items.id,
                    name: log.items.name,
                });
        });
        const options = Array.from(itemMap.values());
        const targetId = selectedItem ?? options[0]?.id;
        const byDate = new Map<string, number>();
        logs.filter((l: any) => l.items?.id === targetId).forEach(
            (log: any) => {
                byDate.set(log.created_at.split("T")[0], log.new_quantity);
            },
        );
        return {
            chartData: Array.from(byDate.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, quantity]) => ({
                    date: formatDate(date),
                    quantity,
                })),
            itemOptions: options,
        };
    }, [logs, selectedItem]);

    return (
        <motion.div
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="show"
            className="bg-white rounded-xl border border-gray-200 p-6"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">
                        Warehouse Depletion
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Stock level trend over selected period
                    </p>
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
                <div className="h-52 bg-gray-50 rounded-lg animate-pulse" />
            ) : chartData.length === 0 ? (
                <EmptyState message="No inventory log data for the selected period." />
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                        data={chartData}
                        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    >
                        <defs>
                            <linearGradient
                                id="depletionGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="#6366f1"
                                    stopOpacity={0.12}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="#6366f1"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
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
                            contentStyle={TOOLTIP_STYLE}
                            formatter={(v: number) => [
                                v.toLocaleString(),
                                "Stock",
                            ]}
                        />
                        <Line
                            type="monotone"
                            dataKey="quantity"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{
                                r: 4,
                                fill: "#6366f1",
                                strokeWidth: 0,
                            }}
                            isAnimationActive
                            animationDuration={1000}
                            animationEasing="ease-out"
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </motion.div>
    );
}

// ─── Store comparison ─────────────────────────────────────────────────────────

function StoreComparisonChart({
    orgId,
    dateRange,
}: {
    orgId: string;
    dateRange: DateRange;
}) {
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
            })),
        [stores],
    );

    return (
        <motion.div
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
            className="bg-white rounded-xl border border-gray-200 p-6"
        >
            <h2 className="text-base font-semibold text-gray-900 mb-1">
                Store Comparison
            </h2>
            <p className="text-sm text-gray-500 mb-4">
                Units fulfilled per store
            </p>
            {isLoading ? (
                <div className="h-52 bg-gray-50 rounded-lg animate-pulse" />
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
                            stroke="#f3f4f6"
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
                            contentStyle={TOOLTIP_STYLE}
                            cursor={{ fill: "rgba(99,102,241,0.04)" }}
                            labelFormatter={(_, p) =>
                                p?.[0]?.payload?.fullName ?? ""
                            }
                            formatter={(v: number) => [
                                v.toLocaleString(),
                                "Units Fulfilled",
                            ]}
                        />
                        <Bar
                            dataKey="units"
                            radius={[5, 5, 0, 0]}
                            isAnimationActive
                            animationDuration={900}
                            animationEasing="ease-out"
                        >
                            {chartData.map((_: any, i: number) => (
                                <Cell
                                    key={i}
                                    fill={BAR_COLORS[i % BAR_COLORS.length]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </motion.div>
    );
}

// ─── Most ordered items ───────────────────────────────────────────────────────

function MostOrderedItems({
    orgId,
    dateRange,
}: {
    orgId: string;
    dateRange: DateRange;
}) {
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
        <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="show"
            className="bg-white rounded-xl border border-gray-200 p-6"
        >
            <h2 className="text-base font-semibold text-gray-900 mb-1">
                Most Ordered Items
            </h2>
            <p className="text-sm text-gray-500 mb-5">
                Top 10 items by fulfilled volume
            </p>
            {isLoading ? (
                <Skeleton rows={6} />
            ) : topItems.length === 0 ? (
                <EmptyState message="No order data for the selected period." />
            ) : (
                <div className="space-y-3">
                    {topItems.map((item: any, i: number) => {
                        const units = Number(item.total_units_fulfilled);
                        const pct = (units / maxUnits) * 100;
                        return (
                            <motion.div
                                key={item.item_id}
                                custom={i}
                                variants={fadeUp}
                                initial="hidden"
                                animate="show"
                                className="flex items-center gap-3"
                            >
                                <span className="text-xs font-mono text-gray-300 w-5 shrink-0 text-right">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-sm font-medium text-gray-800 truncate">
                                                {item.item_name}
                                            </span>
                                            <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
                                                {item.item_sku}
                                            </span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 ml-3 shrink-0 tabular-nums">
                                            {units.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{
                                                duration: 0.6,
                                                delay: i * 0.04,
                                                ease: "easeOut",
                                            }}
                                            style={{
                                                backgroundColor:
                                                    BAR_COLORS[
                                                        i % BAR_COLORS.length
                                                    ],
                                            }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
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
            {/* Header */}
            <motion.div
                variants={fadeUp}
                custom={0}
                initial="hidden"
                animate="show"
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
            >
                <div>
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
            </motion.div>

            {orgId && <SummaryStats orgId={orgId} />}
            {orgId && <ReorderAlertsSection orgId={orgId} />}

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

            {orgId && <MostOrderedItems orgId={orgId} dateRange={dateRange} />}
        </div>
    );
}
