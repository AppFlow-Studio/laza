"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { motion } from "motion/react";
import { Plus, Grid, List, ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import SearchBar from "@/components/admin/shared/SearchBar";
import FilterDropdown from "@/components/admin/shared/FilterDropdown";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { usePurchaseOrders } from "@/lib/hooks/queries/usePurchaseOrders";
import { fmtMoney } from "@/lib/utils/poCalculations";

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    draft:      { label: "Draft",      color: "bg-zinc-100 text-zinc-600" },
    submitted:  { label: "Submitted",  color: "bg-blue-50 text-blue-600" },
    in_transit: { label: "In Transit", color: "bg-amber-50 text-amber-600" },
    arrived:    { label: "Arrived",    color: "bg-yellow-50 text-yellow-700" },
    received:   { label: "Received",   color: "bg-emerald-50 text-emerald-600" },
    cancelled:  { label: "Cancelled",  color: "bg-red-50 text-red-600" },
};

const STATUS_FILTER_OPTIONS = Object.entries(STATUS_CONFIG).map(
    ([value, { label }]) => ({ value, label }),
);

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? {
        label: status,
        color: "bg-zinc-100 text-zinc-600",
    };
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                cfg.color,
            )}
        >
            {cfg.label}
        </span>
    );
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PurchaseOrdersPage() {
    const { orgId } = useAuth();
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 300);

    const { data: allPos = [], isLoading } = usePurchaseOrders(
        orgId ?? "",
        statusFilter ? { status: statusFilter } : undefined,
    );

    // Client-side search on PO number / supplier (2–3 POs per year)
    const pos = debouncedSearch
        ? allPos.filter(
              (po: any) =>
                  po.po_number
                      ?.toLowerCase()
                      .includes(debouncedSearch.toLowerCase()) ||
                  po.supplier_name
                      ?.toLowerCase()
                      .includes(debouncedSearch.toLowerCase()),
          )
        : allPos;

    if (!orgId) return null;

    return (
        <div className="space-y-6">
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">
                        Purchase Orders
                    </h1>
                    <p className="text-sm text-zinc-600 mt-1">
                        China shipments — track from placement to warehouse receipt
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2 rounded ${viewMode === "grid" ? "bg-indigo-600 text-white" : "text-zinc-600"}`}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2 rounded ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-zinc-600"}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <Button asChild>
                        <Link href="/super-admin/purchase-orders/new">
                            <Plus className="w-4 h-4 mr-2" />
                            New PO
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ── Filters ────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <SearchBar
                        placeholder="Search PO number or supplier…"
                        onSearch={setSearchQuery}
                    />
                </div>
                <FilterDropdown
                    label="Status"
                    options={STATUS_FILTER_OPTIONS}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
            </div>

            {/* ── Content ────────────────────────────────────────── */}
            {isLoading ? (
                viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                        <div className="animate-pulse divide-y divide-zinc-100">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-4 px-5 py-4">
                                    <div className="h-4 w-28 rounded bg-zinc-200" />
                                    <div className="h-4 w-20 rounded bg-zinc-200" />
                                    <div className="ml-auto h-4 w-16 rounded bg-zinc-200" />
                                </div>
                            ))}
                        </div>
                    </div>
                )
            ) : pos.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                    <ShoppingCart className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-zinc-500">
                        {searchQuery
                            ? "No POs match your search"
                            : statusFilter
                              ? `No ${STATUS_CONFIG[statusFilter]?.label} purchase orders`
                              : "No purchase orders yet"}
                    </p>
                    {!searchQuery && !statusFilter && (
                        <Link
                            href="/super-admin/purchase-orders/new"
                            className="mt-2 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Create your first PO →
                        </Link>
                    )}
                </div>
            ) : viewMode === "list" ? (
                <ListView pos={pos} />
            ) : (
                <GridView pos={pos} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function ListView({ pos }: { pos: any[] }) {
    return (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total (landed)</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pos.map((po: any) => {
                        const itemCount = po.purchase_order_items?.length ?? 0;
                        const grandTotal =
                            po.purchase_order_items?.reduce(
                                (sum: number, i: any) =>
                                    sum + (i.total_cost_after ?? 0),
                                0,
                            ) ?? 0;

                        return (
                            <TableRow key={po.id}>
                                <TableCell className="font-medium">
                                    {po.po_number}
                                </TableCell>
                                <TableCell className="text-zinc-500">
                                    {po.supplier_name || "—"}
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={po.status} />
                                </TableCell>
                                <TableCell className="text-zinc-600">
                                    {formatDate(po.order_date)}
                                </TableCell>
                                <TableCell className="text-zinc-600">
                                    {itemCount}{" "}
                                    {itemCount === 1 ? "item" : "items"}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {grandTotal > 0 ? fmtMoney(grandTotal) : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link
                                        href={`/super-admin/purchase-orders/${po.id}`}
                                        className="inline-flex items-center justify-center p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="View"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Grid view
// ---------------------------------------------------------------------------

function GridView({ pos }: { pos: any[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pos.map((po: any) => {
                const itemCount = po.purchase_order_items?.length ?? 0;
                const grandTotal =
                    po.purchase_order_items?.reduce(
                        (sum: number, i: any) =>
                            sum + (i.total_cost_after ?? 0),
                        0,
                    ) ?? 0;

                return (
                    <motion.div
                        key={po.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white rounded-xl shadow-sm p-4 border border-zinc-200 hover:shadow-lg transition-shadow"
                    >
                        {/* Top row */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                            </div>
                            <StatusBadge status={po.status} />
                        </div>

                        {/* PO number + supplier */}
                        <h3 className="font-semibold text-zinc-900 mb-0.5">
                            {po.po_number}
                        </h3>
                        {po.supplier_name && (
                            <p className="text-xs text-zinc-500 mb-2">
                                {po.supplier_name}
                            </p>
                        )}

                        {/* Meta */}
                        <p className="text-sm text-zinc-600 mb-1">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                        </p>
                        <p className="text-sm text-zinc-500 mb-3">
                            {formatDate(po.order_date)}
                        </p>

                        {grandTotal > 0 && (
                            <p className="text-sm font-semibold text-zinc-900 mb-3">
                                {fmtMoney(grandTotal)}
                            </p>
                        )}

                        {/* Action */}
                        <div className="pt-3 border-t border-zinc-200">
                            <Link
                                href={`/super-admin/purchase-orders/${po.id}`}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium w-full"
                            >
                                <Eye className="w-4 h-4" />
                                View Details
                            </Link>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}