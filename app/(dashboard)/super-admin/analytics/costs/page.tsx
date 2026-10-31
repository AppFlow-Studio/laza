"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
    useItemCostTrends, useStoreBilling,
    useExpenseBreakdown, useMarginIndicators,
} from "@/lib/hooks/queries/useAnalytics";
import { useItems } from "@/lib/hooks/queries/useItems";

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRangePreset = "this_month" | "last_3_months" | "last_6_months" | "this_year" | "custom";
interface DateRange { from?: string; to?: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6"];
const EXPENSE_LABELS: Record<string, string> = {
    pallet_delivery: "Pallet Delivery", container_unload: "Container Unload",
    delivery: "Delivery", pallet_rent: "Pallet Rent", other: "Other",
};
const TOOLTIP_STYLE = {
    fontSize: 12, borderRadius: 8,
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    backgroundColor: "#fff",
};

// ─── Animation ────────────────────────────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: (i: number) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.32, delay: i * 0.07, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
    }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPresetRange(preset: DateRangePreset): DateRange {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    switch (preset) {
        case "this_month": return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0], to };
        case "last_3_months": { const f = new Date(now); f.setMonth(f.getMonth()-3); return { from: f.toISOString().split("T")[0], to }; }
        case "last_6_months": { const f = new Date(now); f.setMonth(f.getMonth()-6); return { from: f.toISOString().split("T")[0], to }; }
        case "this_year": return { from: `${now.getFullYear()}-01-01`, to };
        default: return {};
    }
}

function formatMonth(yyyyMM: string) {
    const [y, m] = yyyyMM.split("-");
    return new Date(Number(y), Number(m)-1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function fmt(v: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v);
}

function fmtShort(v: number) {
    return v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v.toFixed(2)}`;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Card({ title, subtitle, children, action, index = 0 }: {
    title: string; subtitle?: string; children: React.ReactNode;
    action?: React.ReactNode; index?: number;
}) {
    return (
        <motion.div custom={index} variants={fadeUp} initial="hidden" animate="show"
            className="bg-white border border-gray-200 rounded-xl p-6"
        >
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0 ml-4">{action}</div>}
            </div>
            {children}
        </motion.div>
    );
}

function ChartSkeleton({ h = 240 }: { h?: number }) {
    return <div className="bg-gray-50 rounded-lg animate-pulse" style={{ height: h }} />;
}

function EmptyChart({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
            </div>
            <p className="text-sm text-gray-400">{message}</p>
        </div>
    );
}

// ─── Date range selector ──────────────────────────────────────────────────────

function DateRangeSelector({ preset, customRange, onPresetChange, onCustomChange }: {
    preset: DateRangePreset; customRange: DateRange;
    onPresetChange: (p: DateRangePreset) => void;
    onCustomChange: (r: DateRange) => void;
}) {
    const presets: { value: DateRangePreset; label: string }[] = [
        { value: "this_month", label: "Month" },
        { value: "last_3_months", label: "3 Mo" },
        { value: "last_6_months", label: "6 Mo" },
        { value: "this_year", label: "Year" },
        { value: "custom", label: "Custom" },
    ];
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                {presets.map((p) => (
                    <button key={p.value} onClick={() => onPresetChange(p.value)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                            preset === p.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                        }`}
                    >{p.label}</button>
                ))}
            </div>
            {preset === "custom" && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
                    <input type="date" value={customRange.from ?? ""} onChange={(e) => onCustomChange({ ...customRange, from: e.target.value })}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <span className="text-gray-300">→</span>
                    <input type="date" value={customRange.to ?? ""} onChange={(e) => onCustomChange({ ...customRange, to: e.target.value })}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </motion.div>
            )}
        </div>
    );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function CostSummaryStats({ dateRange }: { dateRange: DateRange }) {
    const { data: billing } = useStoreBilling(dateRange);
    const { data: expenses } = useExpenseBreakdown(dateRange);
    const { data: margins } = useMarginIndicators();

    const totalBilled = useMemo(() => (billing ?? []).reduce((s,r) => s + r.total_line_value, 0), [billing]);
    const totalExpenses = useMemo(() => (expenses ?? []).reduce((s,r) => s + r.total_amount, 0), [expenses]);
    const staleCount = useMemo(() => (margins ?? []).filter(m => m.is_stale).length, [margins]);
    const maxGap = useMemo(() => Math.max(0, ...(margins ?? []).filter(m => m.is_stale).map(m => m.price_gap)), [margins]);

    const stats = [
        { label: "Total Store Billings", value: fmtShort(totalBilled), sub: "fulfilled tickets", bg: "bg-indigo-50", color: "text-indigo-700" },
        { label: "Warehouse Expenses", value: fmtShort(totalExpenses), sub: "selected period", bg: "bg-violet-50", color: "text-violet-700" },
        { label: "Stale Pricing", value: staleCount, sub: staleCount > 0 ? "items undercharged" : "all current", bg: staleCount > 0 ? "bg-orange-50 ring-1 ring-orange-100" : "bg-green-50", color: staleCount > 0 ? "text-orange-700" : "text-green-700" },
        { label: "Largest Gap", value: maxGap > 0 ? fmt(maxGap) : "—", sub: "cost vs transfer", bg: maxGap > 0.01 ? "bg-red-50 ring-1 ring-red-100" : "bg-gray-50", color: maxGap > 0.01 ? "text-red-700" : "text-gray-700" },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((s, i) => (
                <motion.div key={s.label} custom={i} variants={fadeUp} initial="hidden" animate="show"
                    className={`${s.bg} rounded-xl p-4`}
                >
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </motion.div>
            ))}
        </div>
    );
}

// ─── Item Cost Trends ─────────────────────────────────────────────────────────

function ItemCostTrendsSection({ dateRange }: { dateRange: DateRange }) {
    const { data: allItems } = useItems();
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

    const itemIdsToFetch = useMemo(() => {
        if (selectedItemIds.length > 0) return selectedItemIds;
        return (allItems ?? []).slice(0, 5).map((i) => Number(i.id));
    }, [selectedItemIds, allItems]);

    const { data: trends, isLoading } = useItemCostTrends(itemIdsToFetch.length > 0 ? itemIdsToFetch : undefined, dateRange);

    const { chartData, itemLines } = useMemo(() => {
        if (!trends?.length) return { chartData: [], itemLines: [] };
        const itemSet = new Map<number, string>();
        trends.forEach(t => itemSet.set(t.item_id, t.item_name));
        const dateMap = new Map<string, Record<string, any>>();
        trends.forEach(t => {
            if (!dateMap.has(t.effective_date)) dateMap.set(t.effective_date, { date: t.effective_date });
            dateMap.get(t.effective_date)![t.item_name] = t.unit_cost_after;
        });
        const sorted = Array.from(dateMap.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([, row]) => ({
            ...row,
            dateLabel: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
        }));
        return { chartData: sorted, itemLines: Array.from(itemSet.values()) };
    }, [trends]);

    return (
        <Card title="Item Cost Trends" subtitle="Landed cost per unit over time — rising lines mean supplier prices are increasing" index={2}
            action={
                <div className="flex items-center gap-2">
                    <select multiple size={1}
                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[160px]"
                        onChange={(e) => setSelectedItemIds(Array.from(e.target.selectedOptions).map(o => Number(o.value)))}
                        value={selectedItemIds.map(String)}
                    >
                        {(allItems ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    {selectedItemIds.length > 0 && (
                        <button onClick={() => setSelectedItemIds([])} className="text-xs text-gray-400 hover:text-gray-600">Reset</button>
                    )}
                </div>
            }
        >
            {isLoading ? <ChartSkeleton h={260} /> : chartData.length === 0 ? (
                <EmptyChart message="No cost history data. Costs are recorded when purchase orders are received." />
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => `$${Number(v).toFixed(2)}`} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name: string) => [fmt(v), name]} />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                            {itemLines.map((name, idx) => (
                                <Line key={name} type="monotone" dataKey={name}
                                    stroke={COLORS[idx % COLORS.length]} strokeWidth={2.5}
                                    dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }}
                                    connectNulls isAnimationActive animationDuration={900} animationEasing="ease-out"
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-400 mt-3 text-center">Ctrl/Cmd+click to select multiple items</p>
                </>
            )}
        </Card>
    );
}

// ─── Store Billing ────────────────────────────────────────────────────────────

function StoreBillingSection({ dateRange }: { dateRange: DateRange }) {
    const { data: billing, isLoading } = useStoreBilling(dateRange);
    const chartData = useMemo(() =>
        (billing ?? []).map(row => ({
            name: row.location_name.length > 18 ? row.location_name.slice(0,18)+"…" : row.location_name,
            fullName: row.location_name,
            total: row.total_line_value,
            tickets: row.ticket_count,
            avg: row.avg_line_value_per_ticket,
        })),
    [billing]);
    const grandTotal = useMemo(() => (billing ?? []).reduce((s,r) => s + r.total_line_value, 0), [billing]);

    return (
        <Card title="Store Billing Summary" subtitle="Total order value per store — fulfilled_units × unit_cost_at_time" index={3}>
            {isLoading ? <ChartSkeleton /> : chartData.length === 0 ? (
                <EmptyChart message="No billing data. Billings are recorded when tickets are fulfilled with cost snapshots." />
            ) : (
                <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 20, left: 8 }} barSize={30}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" interval={0} />
                            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={56} tickFormatter={fmtShort} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(99,102,241,0.04)" }}
                                labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""}
                                formatter={(v: number) => [fmt(v), "Total Billed"]}
                            />
                            <Bar dataKey="total" radius={[5,5,0,0]} isAnimationActive animationDuration={900} animationEasing="ease-out">
                                {chartData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Store</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Billed</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Orders</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Avg</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Share</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(billing ?? []).map((row, i) => (
                                    <tr key={row.location_id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="font-medium text-gray-900">{row.location_name}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{fmt(row.total_line_value)}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell tabular-nums">{row.ticket_count}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell tabular-nums">{fmt(row.avg_line_value_per_ticket)}</td>
                                        <td className="px-4 py-3 text-right text-xs font-medium text-gray-400 tabular-nums">
                                            {grandTotal > 0 ? `${((row.total_line_value/grandTotal)*100).toFixed(1)}%` : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 border-t border-gray-200">
                                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-600">Total</td>
                                    <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900 tabular-nums">{fmt(grandTotal)}</td>
                                    <td className="px-4 py-2.5 text-right text-xs text-gray-400 hidden sm:table-cell tabular-nums">{(billing ?? []).reduce((s,r) => s+r.ticket_count,0)}</td>
                                    <td className="px-4 py-2.5 hidden md:table-cell" />
                                    <td className="px-4 py-2.5 text-right text-xs text-gray-400">100%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </Card>
    );
}

// ─── Expense Breakdown ────────────────────────────────────────────────────────

const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
    if (percent < 0.05) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    return (
        <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
            fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}
        >
            {`${(percent*100).toFixed(0)}%`}
        </text>
    );
}

function WarehouseExpenseSection({ dateRange }: { dateRange: DateRange }) {
    const { data: expenses, isLoading } = useExpenseBreakdown(dateRange);

    const pieData = useMemo(() => {
        if (!expenses) return [];
        const byType = new Map<string, number>();
        expenses.forEach(r => byType.set(r.expense_type, (byType.get(r.expense_type)??0) + r.total_amount));
        return Array.from(byType.entries()).map(([type, amount]) => ({ name: EXPENSE_LABELS[type]??type, value: Math.round(amount*100)/100, type })).sort((a,b) => b.value-a.value);
    }, [expenses]);

    const { barData, barKeys } = useMemo(() => {
        if (!expenses) return { barData: [], barKeys: [] };
        const months = [...new Set(expenses.map(r => r.month))].sort();
        const types = [...new Set(expenses.map(r => r.expense_type))];
        const mMap = new Map<string, Record<string,any>>();
        months.forEach(m => mMap.set(m, { month: m }));
        expenses.forEach(r => { mMap.get(r.month)![r.expense_type] = r.total_amount; });
        return {
            barData: Array.from(mMap.values()).map(row => ({ ...row, monthLabel: formatMonth(row.month) })),
            barKeys: types,
        };
    }, [expenses]);

    const total = useMemo(() => pieData.reduce((s,r) => s+r.value,0), [pieData]);

    return (
        <Card title="Warehouse Expense Breakdown" subtitle="Operating costs by type" index={4}>
            {isLoading ? <ChartSkeleton h={280} /> : pieData.length === 0 ? (
                <EmptyChart message="No warehouse expenses recorded for this period." />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">By Type — {fmt(total)}</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value"
                                    labelLine={false} label={PieLabel}
                                    isAnimationActive animationDuration={800} animationEasing="ease-out"
                                >
                                    {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v:number) => [fmt(v), "Amount"]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-3 space-y-1.5">
                            {pieData.map((e,i) => (
                                <div key={e.type} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i%COLORS.length] }} />
                                        <span className="text-gray-700">{e.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 text-xs">{total>0?`${((e.value/total)*100).toFixed(1)}%`:"—"}</span>
                                        <span className="font-semibold text-gray-900 w-20 text-right tabular-nums">{fmt(e.value)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">Monthly Trend</p>
                        {barData.length < 2 ? (
                            <div className="flex items-center justify-center h-40 text-sm text-gray-400">Need 2+ months of data</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={230}>
                                <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }} barSize={18}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52} tickFormatter={fmtShort} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v:number, name:string) => [fmt(v), EXPENSE_LABELS[name]??name]} />
                                    {barKeys.map((key, i) => (
                                        <Bar key={key} dataKey={key} stackId="exp"
                                            fill={COLORS[i%COLORS.length]}
                                            radius={i===barKeys.length-1?[4,4,0,0]:[0,0,0,0]}
                                            isAnimationActive animationDuration={900} animationEasing="ease-out"
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}

// ─── Margin Indicators ────────────────────────────────────────────────────────

function MarginIndicatorsSection() {
    const { data: margins, isLoading } = useMarginIndicators();
    const [showAll, setShowAll] = useState(false);
    const staleItems = useMemo(() => (margins ?? []).filter(m => m.is_stale), [margins]);
    const display = showAll ? staleItems : staleItems.slice(0,8);

    return (
        <Card title="Margin Indicators" subtitle="Items where the transfer price is below the current landed cost" index={5}>
            {isLoading ? (
                <div className="space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="h-11 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : staleItems.length === 0 ? (
                <div className="flex items-center gap-3 py-5">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">All transfer prices are current</p>
                        <p className="text-xs text-gray-400 mt-0.5">No items found where the store transfer price is below the current landed cost.</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg mb-4 text-sm text-orange-700">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span><strong>{staleItems.length} item{staleItems.length!==1?"s":""}</strong> {staleItems.length===1?"is":"are"} being transferred at a loss. Receive a new PO to fix.</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Cost</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Transfer</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gap / Unit</th>
                                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Last Order</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {display.map((item, i) => {
                                    const gapPct = item.avg_transfer_price > 0 ? ((item.price_gap/item.avg_transfer_price)*100).toFixed(1) : "—";
                                    const sev = item.price_gap>1?"text-red-600 bg-red-50":item.price_gap>0.1?"text-orange-600 bg-orange-50":"text-yellow-600 bg-yellow-50";
                                    return (
                                        <motion.tr key={item.item_id} custom={i} variants={fadeUp} initial="hidden" animate="show"
                                            className="hover:bg-gray-50/60 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">{item.item_name}</p>
                                                {item.item_sku && <p className="text-xs text-gray-400">{item.item_sku}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-900 tabular-nums">{fmt(item.current_unit_cost)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-500 tabular-nums">{fmt(item.avg_transfer_price)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${sev}`}>
                                                    +{fmt(item.price_gap)}
                                                    {gapPct!=="—" && <span className="ml-1 opacity-70">({gapPct}%)</span>}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-400 text-xs hidden md:table-cell">
                                                {item.last_fulfilled_at ? new Date(item.last_fulfilled_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—"}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {staleItems.length > 8 && (
                        <button onClick={() => setShowAll(v=>!v)} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                            {showAll ? "Show less" : `Show all ${staleItems.length} items`}
                        </button>
                    )}
                </>
            )}
        </Card>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CostAnalyticsDashboardPage() {
    const [preset, setPreset] = useState<DateRangePreset>("last_3_months");
    const [customRange, setCustomRange] = useState<DateRange>({});
    const dateRange = useMemo<DateRange>(() => preset === "custom" ? customRange : getPresetRange(preset), [preset, customRange]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
                <nav className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Link href="/super-admin/analytics" className="hover:text-gray-600 transition-colors">Analytics</Link>
                    <span>/</span>
                    <span className="text-gray-700 font-medium">Costs</span>
                </nav>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Cost Analytics</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Item cost trends, store billings, warehouse expenses, and margin health</p>
                    </div>
                    <DateRangeSelector preset={preset} customRange={customRange} onPresetChange={setPreset} onCustomChange={setCustomRange} />
                </div>
            </motion.div>

            <CostSummaryStats dateRange={dateRange} />
            <ItemCostTrendsSection dateRange={dateRange} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <StoreBillingSection dateRange={dateRange} />
                <WarehouseExpenseSection dateRange={dateRange} />
            </div>

            <MarginIndicatorsSection />
        </div>
    );
}