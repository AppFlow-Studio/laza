"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { useAllTickets } from "@/lib/hooks/queries/useOrderTickets";
import { useLocations } from "@/lib/hooks/queries/useLocations";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";

// ─── Types ───────────────────────────────────────────────────────────────────

type DateRangePreset = "this_week" | "this_month" | "last_3_months" | "custom";

interface DateRange {
    from?: string;
    to?: string;
}

// A single flattened row for the distribution table
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="h-11 bg-gray-100 rounded animate-pulse"
                />
            ))}
        </div>
    );
}

function EmptyState({ filtered }: { filtered: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg
                    className="w-6 h-6 text-gray-400"
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
            <p className="text-sm font-medium text-gray-700">
                No distribution data
            </p>
            <p className="text-xs text-gray-400 mt-1">
                {filtered
                    ? "No confirmed orders match the selected filters."
                    : "No confirmed or fulfilled orders found in this period."}
            </p>
        </div>
    );
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
            {cards.map((c) => (
                <div
                    key={c.label}
                    className="bg-white border border-gray-200 rounded-xl p-4"
                >
                    <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {c.value}
                    </p>
                </div>
            ))}
        </div>
    );
}

// ─── Filters bar ─────────────────────────────────────────────────────────────

interface FiltersBarProps {
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
}

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
}: FiltersBarProps) {
    const presets: { value: DateRangePreset; label: string }[] = [
        { value: "this_week", label: "This Week" },
        { value: "this_month", label: "This Month" },
        { value: "last_3_months", label: "Last 3 Months" },
        { value: "custom", label: "Custom" },
    ];

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: date + store filters */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Store filter */}
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
                {/* Date presets */}
                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                    {presets.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => onPresetChange(p.value)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                preset === p.value
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Custom date inputs */}
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
                            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                )}
            </div>

            {/* Right: row count + export */}
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-gray-400">
                    {rowCount.toLocaleString()} row{rowCount !== 1 ? "s" : ""}
                </span>
                <button
                    onClick={onExport}
                    disabled={exporting || rowCount === 0}
                    className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${
                rowCount === 0
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
            }
          `}
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

// ─── Distribution Table ───────────────────────────────────────────────────────

type SortKey = keyof Pick<
    DistributionRow,
    | "fulfilledAt"
    | "storeName"
    | "itemName"
    | "boxesFulfilled"
    | "unitsFulfilled"
>;
type SortDir = "asc" | "desc";

interface TableProps {
    rows: DistributionRow[];
    sort: SortKey;
    sortDir: SortDir;
    onSort: (key: SortKey) => void;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    return (
        <span
            className={`ml-1 inline-block transition-transform ${active ? "opacity-100" : "opacity-30"}`}
        >
            {active && dir === "desc" ? "↓" : "↑"}
        </span>
    );
}

function DistributionTable({ rows, sort, sortDir, onSort }: TableProps) {
    const headers: { key: SortKey; label: string; className?: string }[] = [
        { key: "fulfilledAt", label: "Date" },
        { key: "storeName", label: "Store" },
        { key: "itemName", label: "Item" },
        { key: "boxesFulfilled", label: "Boxes", className: "text-right" },
        { key: "unitsFulfilled", label: "Units", className: "text-right" },
    ];

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        {headers.map((h) => (
                            <th
                                key={h.key}
                                onClick={() => onSort(h.key)}
                                className={`
                  px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide
                  cursor-pointer select-none hover:text-gray-900 transition-colors whitespace-nowrap
                  ${h.className ?? "text-left"}
                `}
                            >
                                {h.label}
                                <SortIcon
                                    active={sort === h.key}
                                    dir={sortDir}
                                />
                            </th>
                        ))}
                        {/* Extra non-sortable columns */}
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
                <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((row, i) => {
                        const fulfillPct =
                            row.unitsRequested > 0
                                ? Math.round(
                                      (row.unitsFulfilled /
                                          row.unitsRequested) *
                                          100,
                                  )
                                : 100;
                        const isPartial = fulfillPct < 100;

                        return (
                            <tr
                                key={`${row.ticketId}-${row.itemName}-${i}`}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                {/* Date */}
                                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                    {formatDate(row.fulfilledAt)}
                                </td>

                                {/* Store */}
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                                    {row.storeName}
                                </td>

                                {/* Item */}
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="text-gray-900 font-medium">
                                            {row.itemName}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                            {row.itemSku}
                                        </span>
                                    </div>
                                </td>

                                {/* Boxes fulfilled */}
                                <td className="px-4 py-3 text-gray-900 text-right font-mono whitespace-nowrap">
                                    {row.boxesFulfilled}
                                </td>

                                {/* Units fulfilled */}
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <span className="font-mono font-semibold text-gray-900">
                                        {Number(
                                            row.unitsFulfilled,
                                        ).toLocaleString()}
                                    </span>
                                </td>

                                {/* Requested units (hidden on small screens) */}
                                <td className="px-4 py-3 text-right hidden md:table-cell whitespace-nowrap">
                                    {isPartial ? (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="text-gray-400 font-mono text-xs">
                                                {Number(
                                                    row.unitsRequested,
                                                ).toLocaleString()}
                                            </span>
                                            <span className="text-orange-500 text-xs font-medium">
                                                ({fulfillPct}%)
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="text-gray-300 font-mono text-xs">
                                            —
                                        </span>
                                    )}
                                </td>

                                {/* Auto-approved badge */}
                                <td className="px-4 py-3 text-center hidden lg:table-cell">
                                    {row.isAutoApproved ? (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-600 border border-green-100 font-medium">
                                            Auto
                                        </span>
                                    ) : (
                                        <span className="text-gray-300 text-xs">
                                            —
                                        </span>
                                    )}
                                </td>

                                {/* Ticket link */}
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <Link
                                        href={`/super-admin/orders/${row.ticketId}`}
                                        className="text-indigo-600 hover:text-indigo-800 font-mono text-xs font-medium transition-colors"
                                    >
                                        #{row.ticketNumber}
                                    </Link>
                                </td>
                            </tr>
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

    // Filters
    const [preset, setPreset] = useState<DateRangePreset>("this_month");
    const [customRange, setCustomRange] = useState<DateRange>({});
    const [selectedStore, setSelectedStore] = useState<string>("");

    // Table sort
    const [sort, setSort] = useState<SortKey>("fulfilledAt");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    // Export state
    const [exporting, setExporting] = useState(false);

    // Data
    const { data: allTickets, isLoading } = useAllTickets(orgId);
    const { data: locations } = useLocations();

    const dateRange = useMemo<DateRange>(
        () => (preset === "custom" ? customRange : getPresetRange(preset)),
        [preset, customRange],
    );

    // Store options (stores only, not warehouse)
    const storeOptions = useMemo(
        () =>
            (locations ?? [])
                .filter((l) => l.location_type === "store")
                .map((l) => ({ id: l.id, name: l.name }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [locations],
    );

    // Flatten confirmed/fulfilled tickets → distribution rows
    const allRows = useMemo<DistributionRow[]>(() => {
        if (!allTickets) return [];

        const rows: DistributionRow[] = [];

        for (const ticket of allTickets) {
            // Only include fulfilled or confirmed tickets
            if (ticket.status !== "fulfilled" && ticket.status !== "confirmed")
                continue;

            const datestamp =
                ticket.fulfilled_at ?? ticket.confirmed_at ?? ticket.updated_at;
            if (!datestamp) continue;

            // Date range filter
            if (!isWithinRange(datestamp, dateRange)) continue;

            // Store filter
            if (
                selectedStore &&
                ticket.requesting_location_id !== selectedStore
            )
                continue;

            const storeName = ticket.location?.name ?? "Unknown Store";
            const ticketNumber = String(
                ticket.ticket_number ?? ticket.id,
            ).slice(-6);

            const items = ticket.order_ticket_items ?? ticket.items ?? [];
            if (!items.length) continue;

            for (const item of items) {
                rows.push({
                    ticketId: ticket.id,
                    ticketNumber,
                    storeName,
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

    // Sorted rows
    const sortedRows = useMemo(() => {
        return [...allRows].sort((a, b) => {
            let cmp = 0;
            switch (sort) {
                case "fulfilledAt":
                    cmp = a.fulfilledAt.localeCompare(b.fulfilledAt);
                    break;
                case "storeName":
                    cmp = a.storeName.localeCompare(b.storeName);
                    break;
                case "itemName":
                    cmp = a.itemName.localeCompare(b.itemName);
                    break;
                case "boxesFulfilled":
                    cmp = a.boxesFulfilled - b.boxesFulfilled;
                    break;
                case "unitsFulfilled":
                    cmp = a.unitsFulfilled - b.unitsFulfilled;
                    break;
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [allRows, sort, sortDir]);

    // Sort handler
    const handleSort = useCallback(
        (key: SortKey) => {
            if (sort === key) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            } else {
                setSort(key);
                setSortDir("desc");
            }
        },
        [sort],
    );

    // CSV export
    const handleExport = useCallback(() => {
        if (sortedRows.length === 0) return;
        setExporting(true);

        try {
            const csvData = sortedRows.map((row) => ({
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
            }));

            const csv = Papa.unparse(csvData);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);

            const today = new Date().toISOString().split("T")[0];
            const storeLabel = selectedStore
                ? (storeOptions.find((s) => s.id === selectedStore)?.name ??
                  "store")
                : "all-stores";
            const filename = `distribution-report_${storeLabel}_${today}.csv`;

            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    }, [sortedRows, selectedStore, storeOptions]);

    const hasFilters = !!selectedStore || preset !== "this_month";

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Breadcrumb + header */}
            <div>
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
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Distribution Report
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            What was sent to each store — filterable and
                            exportable for accounting
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            {!isLoading && <SummaryCards rows={allRows} />}
            {isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-20 bg-gray-100 rounded-xl animate-pulse"
                        />
                    ))}
                </div>
            )}

            {/* Filters + export */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
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
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="p-6">
                        <LoadingSkeleton />
                    </div>
                ) : sortedRows.length === 0 ? (
                    <EmptyState filtered={hasFilters} />
                ) : (
                    <DistributionTable
                        rows={sortedRows}
                        sort={sort}
                        sortDir={sortDir}
                        onSort={handleSort}
                    />
                )}
            </div>

            {/* Footer note */}
            {sortedRows.length > 0 && (
                <p className="text-xs text-gray-400 text-center pb-2">
                    Showing fulfilled and confirmed orders only. Partial
                    fulfillments display the actual fulfilled quantity with fill
                    %.
                </p>
            )}
        </div>
    );
}
