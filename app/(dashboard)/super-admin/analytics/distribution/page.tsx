"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import { useAllTickets } from "@/lib/hooks/queries/useOrderTickets";
import { useLocations } from "@/lib/hooks/queries/useLocations";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRangePreset = "this_week" | "this_month" | "last_3_months" | "custom";
interface DateRange {
    from?: string;
    to?: string;
}
interface DistributionRow {
    ticketId: string;
    ticketNumber: string;
    storeName: string;
    storeId: string;
    fulfilledAt: string;
    itemName: string;
    itemSku: string;
    boxesRequested: number;
    boxesFulfilled: number;
    unitsRequested: number;
    unitsFulfilled: number;
    isAutoApproved: boolean;
}

// ─── Animation ────────────────────────────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.28,
            delay: i * 0.04,
            ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
        },
    }),
};

const cardVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.28,
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
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function isWithinRange(dateStr: string, range: DateRange): boolean {
    if (!range.from && !range.to) return true;
    const d = new Date(dateStr).getTime();
    const from = range.from ? new Date(range.from).getTime() : -Infinity;
    const to = range.to ? new Date(range.to + "T23:59:59").getTime() : Infinity;
    return d >= from && d <= to;
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ rows }: { rows: DistributionRow[] }) {
    const totalTickets = useMemo(
        () => new Set(rows.map((r) => r.ticketId)).size,
        [rows],
    );
    const totalStores = useMemo(
        () => new Set(rows.map((r) => r.storeId)).size,
        [rows],
    );
    const totalUnits = useMemo(
        () => rows.reduce((acc, r) => acc + r.unitsFulfilled, 0),
        [rows],
    );
    const totalBoxes = useMemo(
        () => rows.reduce((acc, r) => acc + r.boxesFulfilled, 0),
        [rows],
    );

    const cards = [
        { label: "Fulfilled Orders", value: totalTickets },
        { label: "Stores Served", value: totalStores },
        { label: "Total Boxes Sent", value: totalBoxes.toLocaleString() },
        { label: "Total Units Sent", value: totalUnits.toLocaleString() },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map((c, i) => (
                <motion.div
                    key={c.label}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                >
                    <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">
                        {c.value}
                    </p>
                </motion.div>
            ))}
        </div>
    );
}

// ─── Filters bar ─────────────────────────────────────────────────────────────

function FiltersBar({
    preset,
    customRange,
    selectedStore,
    storeOptions,
    onPresetChange,
    onCustomChange,
    onStoreChange,
    rowCount,
    onExport,
    exporting,
}: {
    preset: DateRangePreset;
    customRange: DateRange;
    selectedStore: string;
    storeOptions: { id: string; name: string }[];
    onPresetChange: (p: DateRangePreset) => void;
    onCustomChange: (r: DateRange) => void;
    onStoreChange: (id: string) => void;
    rowCount: number;
    onExport: () => void;
    exporting: boolean;
}) {
    const presets: { value: DateRangePreset; label: string }[] = [
        { value: "this_week", label: "This Week" },
        { value: "this_month", label: "This Month" },
        { value: "last_3_months", label: "Last 3 Months" },
        { value: "custom", label: "Custom" },
    ];
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={selectedStore}
                    onChange={(e) => onStoreChange(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                    <option value="">All Stores</option>
                    {storeOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                    {presets.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => onPresetChange(p.value)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
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
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-gray-400 tabular-nums">
                    {rowCount.toLocaleString()} row{rowCount !== 1 ? "s" : ""}
                </span>
                <button
                    onClick={onExport}
                    disabled={exporting || rowCount === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        rowCount === 0
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-200"
                    }`}
                >
                    {exporting ? (
                        <>
                            <svg
                                className="w-4 h-4 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8H4z"
                                />
                            </svg>
                            Exporting…
                        </>
                    ) : (
                        <>
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                            </svg>
                            Export CSV
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

type SortKey = keyof Pick<
    DistributionRow,
    | "fulfilledAt"
    | "storeName"
    | "itemName"
    | "boxesFulfilled"
    | "unitsFulfilled"
>;
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    return (
        <span
            className={`ml-1 text-xs transition-opacity ${active ? "opacity-100" : "opacity-25"}`}
        >
            {active && dir === "desc" ? "↓" : "↑"}
        </span>
    );
}

function DistributionTable({
    rows,
    sort,
    sortDir,
    onSort,
}: {
    rows: DistributionRow[];
    sort: SortKey;
    sortDir: SortDir;
    onSort: (k: SortKey) => void;
}) {
    const headers: { key: SortKey; label: string; align?: string }[] = [
        { key: "fulfilledAt", label: "Date" },
        { key: "storeName", label: "Store" },
        { key: "itemName", label: "Item" },
        { key: "boxesFulfilled", label: "Boxes", align: "text-right" },
        { key: "unitsFulfilled", label: "Units", align: "text-right" },
    ];

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100">
                        {headers.map((h) => (
                            <th
                                key={h.key}
                                onClick={() => onSort(h.key)}
                                className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-900 transition-colors whitespace-nowrap ${h.align ?? "text-left"}`}
                            >
                                {h.label}
                                <SortIcon
                                    active={sort === h.key}
                                    dir={sortDir}
                                />
                            </th>
                        ))}
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right hidden md:table-cell">
                            Requested
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center hidden lg:table-cell">
                            Auto
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">
                            Ticket
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => {
                        const pct =
                            row.unitsRequested > 0
                                ? Math.round(
                                      (row.unitsFulfilled /
                                          row.unitsRequested) *
                                          100,
                                  )
                                : 100;
                        const isPartial = pct < 100;
                        return (
                            <motion.tr
                                key={`${row.ticketId}-${row.itemName}-${i}`}
                                custom={Math.min(i, 12)}
                                variants={fadeUp}
                                initial="hidden"
                                animate="show"
                                className="hover:bg-gray-50/60 transition-colors group"
                            >
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                                    {formatDate(row.fulfilledAt)}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                    {row.storeName}
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-gray-900 font-medium">
                                        {row.itemName}
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                        {row.itemSku}
                                    </p>
                                </td>
                                <td className="px-4 py-3 text-gray-900 text-right font-mono tabular-nums whitespace-nowrap">
                                    {row.boxesFulfilled}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <span className="font-mono font-semibold text-gray-900 tabular-nums">
                                        {Number(
                                            row.unitsFulfilled,
                                        ).toLocaleString()}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right hidden md:table-cell whitespace-nowrap">
                                    {isPartial ? (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="text-gray-400 font-mono text-xs tabular-nums">
                                                {Number(
                                                    row.unitsRequested,
                                                ).toLocaleString()}
                                            </span>
                                            <span className="text-orange-500 text-xs font-medium">
                                                ({pct}%)
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="text-gray-200 font-mono text-xs">
                                            —
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center hidden lg:table-cell">
                                    {row.isAutoApproved ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-600 border border-green-100 font-medium">
                                            Auto
                                        </span>
                                    ) : (
                                        <span className="text-gray-200 text-xs">
                                            —
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <Link
                                        href={`/super-admin/orders/${row.ticketId}`}
                                        className="text-indigo-500 hover:text-indigo-700 font-mono text-xs font-medium transition-colors"
                                    >
                                        #{row.ticketNumber}
                                    </Link>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DistributionReportPage() {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.organizationId ?? "";

    const [preset, setPreset] = useState<DateRangePreset>("this_month");
    const [customRange, setCustomRange] = useState<DateRange>({});
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [sort, setSort] = useState<SortKey>("fulfilledAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [exporting, setExporting] = useState(false);

    const { data: allTickets, isLoading } = useAllTickets(orgId);
    const { data: locations } = useLocations();

    const dateRange = useMemo<DateRange>(
        () => (preset === "custom" ? customRange : getPresetRange(preset)),
        [preset, customRange],
    );

    const storeOptions = useMemo(
        () =>
            (locations ?? [])
                .filter((l) => l.location_type === "store")
                .map((l) => ({ id: l.id, name: l.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [locations],
    );

    const allRows = useMemo<DistributionRow[]>(() => {
        if (!allTickets) return [];
        const rows: DistributionRow[] = [];
        for (const ticket of allTickets) {
            if (ticket.status !== "fulfilled" && ticket.status !== "confirmed")
                continue;
            const datestamp =
                ticket.fulfilled_at ?? ticket.confirmed_at ?? ticket.updated_at;
            if (!datestamp || !isWithinRange(datestamp, dateRange)) continue;
            if (
                selectedStore &&
                ticket.requesting_location_id !== selectedStore
            )
                continue;
            const items = ticket.order_ticket_items ?? ticket.items ?? [];
            if (!items.length) continue;
            for (const item of items) {
                rows.push({
                    ticketId: ticket.id,
                    ticketNumber: String(
                        ticket.ticket_number ?? ticket.id,
                    ).slice(-6),
                    storeName:
                        ticket.location?.name ??
                        ticket.requesting_location?.name ??
                        "Unknown Store",
                    storeId: ticket.requesting_location_id,
                    fulfilledAt: datestamp,
                    itemName: item.item?.name ?? item.name ?? "Unknown Item",
                    itemSku: item.item?.sku ?? item.sku ?? "—",
                    boxesRequested: item.quantity_boxes ?? 0,
                    boxesFulfilled:
                        item.fulfilled_boxes ?? item.quantity_boxes ?? 0,
                    unitsRequested: Number(item.quantity_units ?? 0),
                    unitsFulfilled: Number(
                        item.fulfilled_units ?? item.quantity_units ?? 0,
                    ),
                    isAutoApproved: ticket.is_auto_approved ?? false,
                });
            }
        }
        return rows;
    }, [allTickets, dateRange, selectedStore]);

    const sortedRows = useMemo(
        () =>
            [...allRows].sort((a, b) => {
                let cmp = 0;
                if (sort === "fulfilledAt")
                    cmp = a.fulfilledAt.localeCompare(b.fulfilledAt);
                else if (sort === "storeName")
                    cmp = a.storeName.localeCompare(b.storeName);
                else if (sort === "itemName")
                    cmp = a.itemName.localeCompare(b.itemName);
                else if (sort === "boxesFulfilled")
                    cmp = a.boxesFulfilled - b.boxesFulfilled;
                else if (sort === "unitsFulfilled")
                    cmp = a.unitsFulfilled - b.unitsFulfilled;
                return sortDir === "asc" ? cmp : -cmp;
            }),
        [allRows, sort, sortDir],
    );

    const handleSort = useCallback(
        (key: SortKey) => {
            if (sort === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            else {
                setSort(key);
                setSortDir("desc");
            }
        },
        [sort],
    );

    const handleExport = useCallback(() => {
        if (!sortedRows.length) return;
        setExporting(true);
        try {
            const csv = Papa.unparse(
                sortedRows.map((row) => ({
                    Date: formatDate(row.fulfilledAt),
                    Store: row.storeName,
                    "Item Name": row.itemName,
                    SKU: row.itemSku,
                    "Boxes Requested": row.boxesRequested,
                    "Boxes Fulfilled": row.boxesFulfilled,
                    "Units Requested": row.unitsRequested,
                    "Units Fulfilled": row.unitsFulfilled,
                    "Auto Approved": row.isAutoApproved ? "Yes" : "No",
                    "Ticket #": row.ticketNumber,
                    "Ticket ID": row.ticketId,
                })),
            );
            const url = URL.createObjectURL(
                new Blob([csv], { type: "text/csv;charset=utf-8;" }),
            );
            const today = new Date().toISOString().split("T")[0];
            const storeLabel = selectedStore
                ? (storeOptions.find((s) => s.id === selectedStore)?.name ??
                  "store")
                : "all-stores";
            const a = document.createElement("a");
            a.href = url;
            a.download = `distribution-report_${storeLabel}_${today}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    }, [sortedRows, selectedStore, storeOptions]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <motion.div
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="show"
            >
                <nav className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <Link
                        href="/super-admin/analytics"
                        className="hover:text-gray-600 transition-colors"
                    >
                        Analytics
                    </Link>
                    <span>/</span>
                    <span className="text-gray-700 font-medium">
                        Distribution Report
                    </span>
                </nav>
                <h1 className="text-xl font-semibold text-gray-900">
                    Distribution Report
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    What was sent to each store — filterable and exportable for
                    accounting
                </p>
            </motion.div>

            {/* Summary */}
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-20 bg-gray-100 rounded-xl animate-pulse"
                        />
                    ))}
                </div>
            ) : (
                <SummaryCards rows={allRows} />
            )}

            {/* Filters */}
            <motion.div
                custom={1}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="bg-white border border-gray-200 rounded-xl p-4"
            >
                <FiltersBar
                    preset={preset}
                    customRange={customRange}
                    selectedStore={selectedStore}
                    storeOptions={storeOptions}
                    onPresetChange={setPreset}
                    onCustomChange={setCustomRange}
                    onStoreChange={setSelectedStore}
                    rowCount={sortedRows.length}
                    onExport={handleExport}
                    exporting={exporting}
                />
            </motion.div>

            {/* Table */}
            <motion.div
                custom={2}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-11 bg-gray-100 rounded animate-pulse"
                            />
                        ))}
                    </div>
                ) : sortedRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                            <svg
                                className="w-6 h-6 text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-600">
                            No distribution data
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            No confirmed orders match the selected filters.
                        </p>
                    </div>
                ) : (
                    <DistributionTable
                        rows={sortedRows}
                        sort={sort}
                        sortDir={sortDir}
                        onSort={handleSort}
                    />
                )}
            </motion.div>

            {sortedRows.length > 0 && (
                <p className="text-xs text-gray-400 text-center pb-2">
                    Fulfilled and confirmed orders only. Partial fulfillments
                    show actual qty with fill %.
                </p>
            )}
        </div>
    );
}
