"use client";

// app/(dashboard)/super-admin/purchase-orders/page.tsx
//
// Step 1: List view — all POs with status badges, filter, search.

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Plus, Search, Package } from "lucide-react";

import {
    usePurchaseOrders,
    useUpdatePurchaseOrder,
} from "@/lib/hooks/queries/usePurchaseOrders";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { fmtMoney } from "@/lib/utils/poCalculations";

// ---------------------------------------------------------------------------
// Status config — badge colour + human label
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-zinc-700 text-zinc-300" },
    submitted: { label: "Submitted", color: "bg-blue-900/60 text-blue-300" },
    in_transit: {
        label: "In Transit",
        color: "bg-amber-900/60 text-amber-300",
    },
    arrived: { label: "Arrived", color: "bg-yellow-900/60 text-yellow-300" },
    received: {
        label: "Received",
        color: "bg-emerald-900/60 text-emerald-300",
    },
    cancelled: { label: "Cancelled", color: "bg-red-900/60 text-red-400" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? {
        label: status,
        color: "bg-zinc-700 text-zinc-300",
    };
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
        >
            {cfg.label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow() {
    return (
        <div className="flex animate-pulse items-center gap-4 border-b border-gray-200 px-5 py-4">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="ml-auto h-4 w-16 rounded bg-gray-200" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PurchaseOrdersPage() {
    const { orgId } = useAuth();
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);

    const { data: pos = [], isLoading } = usePurchaseOrders(
        orgId ?? "",
        statusFilter !== "all" ? { status: statusFilter } : undefined,
    );

    // Client-side search on PO number (fast — 2-3 POs per year)
    const filtered = debouncedSearch
        ? pos.filter((po: any) =>
              po.po_number
                  ?.toLowerCase()
                  .includes(debouncedSearch.toLowerCase()),
          )
        : pos;

    if (!orgId) return null;

    return (
        <div className="space-y-6 p-6">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Purchase Orders</h1>
                    <p className="mt-0.5 text-sm text-zinc-400">
                        China shipments — track orders from placement to
                        warehouse receipt
                    </p>
                </div>
                <Link
                    href="/super-admin/purchase-orders/new"
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                    <Plus className="h-4 w-4" />
                    New PO
                </Link>
            </div>

            {/* ── Filters ────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search PO number…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-52 rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                    />
                </div>

                {/* Status filter chips */}
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setStatusFilter("all")}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            statusFilter === "all"
                                ? "bg-indigo-600 text-white"
                                : "border border-gray-200 text-zinc-400"
                        }`}
                    >
                        All
                    </button>
                    {ALL_STATUSES.map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                statusFilter === s
                                    ? "bg-indigo-600 text-white"
                                    : "border border-gray-200 text-zinc-400"
                            }`}
                        >
                            {STATUS_CONFIG[s].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Table ──────────────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-gray-200 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <span>PO Number</span>
                    <span>Status</span>
                    <span>Order Date</span>
                    <span>Items</span>
                    <span className="text-right">Total (after fees)</span>
                </div>

                {/* Loading */}
                {isLoading && (
                    <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </>
                )}

                {/* Empty */}
                {!isLoading && filtered.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                        <Package className="h-8 w-8 text-zinc-600" />
                        <p className="text-sm text-zinc-400">
                            {search
                                ? "No POs match your search"
                                : statusFilter !== "all"
                                  ? `No ${STATUS_CONFIG[statusFilter]?.label} POs`
                                  : "No purchase orders yet"}
                        </p>
                        {!search && statusFilter === "all" && (
                            <Link
                                href="/super-admin/purchase-orders/new"
                                className="mt-1 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                            >
                                Create your first PO →
                            </Link>
                        )}
                    </div>
                )}

                {/* Rows */}
                {!isLoading &&
                    filtered.map((po: any) => {
                        const itemCount = po.purchase_order_items?.length ?? 0;
                        const grandTotal =
                            po.purchase_order_items?.reduce(
                                (sum: number, i: any) =>
                                    sum + (i.total_cost_after ?? 0),
                                0,
                            ) ?? 0;

                        return (
                            <Link
                                key={po.id}
                                href={`/super-admin/purchase-orders/${po.id}`}
                                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center border-b border-zinc-800/60 px-5 py-4 last:border-0 hover:bg-zinc-800/40 transition-colors"
                            >
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        {po.po_number}
                                    </p>
                                    {po.supplier_name && (
                                        <p className="text-xs text-zinc-500">
                                            {po.supplier_name}
                                        </p>
                                    )}
                                </div>
                                <StatusBadge status={po.status} />
                                <span className="text-sm text-zinc-400">
                                    {po.order_date
                                        ? new Date(
                                              po.order_date,
                                          ).toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                          })
                                        : "—"}
                                </span>
                                <span className="text-sm text-zinc-400">
                                    {itemCount}{" "}
                                    {itemCount === 1 ? "item" : "items"}
                                </span>
                                <span className="text-right text-sm font-medium text-white">
                                    {grandTotal > 0
                                        ? fmtMoney(grandTotal)
                                        : "—"}
                                </span>
                            </Link>
                        );
                    })}
            </div>
        </div>
    );
}
