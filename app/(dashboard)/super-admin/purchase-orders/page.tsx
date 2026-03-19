//super-admin/purchase-orders/ (list page)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
    Ship, Clock, CheckCircle2, XCircle,
    AlertCircle, FileText, Anchor, Plus, Search, X, ChevronRight, Warehouse,
} from "lucide-react";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import { usePurchaseOrders } from "@/lib/hooks/queries/usePurchaseOrders";

const PO_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string; dotColor: string }> = {
    draft:      { label: "Draft",      icon: FileText,     className: "bg-zinc-100 text-zinc-600",     dotColor: "bg-zinc-400" },
    submitted:  { label: "Submitted",  icon: Clock,        className: "bg-blue-100 text-blue-700",     dotColor: "bg-blue-500" },
    in_transit: { label: "In Transit", icon: Ship,         className: "bg-violet-100 text-violet-700", dotColor: "bg-violet-500" },
    arrived:    { label: "Arrived",    icon: Anchor,       className: "bg-amber-100 text-amber-700",   dotColor: "bg-amber-500" },
    received:   { label: "Received",   icon: CheckCircle2, className: "bg-green-100 text-green-700",   dotColor: "bg-green-500" },
    cancelled:  { label: "Cancelled",  icon: XCircle,      className: "bg-red-100 text-red-700",       dotColor: "bg-red-400" },
};

function PoStatusBadge({ status }: { status: string }) {
    const cfg = PO_STATUS_CONFIG[status] ?? { label: status, icon: AlertCircle, className: "bg-zinc-100 text-zinc-600", dotColor: "bg-zinc-400" };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
            <Icon className="w-3 h-3" />{cfg.label}
        </span>
    );
}

function ShipmentRow({ po }: { po: any }) {
    const itemCount  = po.purchase_order_items?.length ?? 0;
    const grandTotal = (po.subtotal_before ?? 0) + (po.office_fee ?? 0) + (po.shipping_fee ?? 0);
    const warehouseName = po.warehouse?.name ?? null;

    return (
        <tr className="hover:bg-zinc-50 transition-colors group">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-violet-50 transition-colors">
                        <Ship className="w-4 h-4 text-zinc-400 group-hover:text-violet-500 transition-colors" />
                    </div>
                    <div>
                        <p className="font-medium text-zinc-900 text-sm">{po.po_number}</p>
                        <p className="text-xs text-zinc-400">{po.supplier_name ?? "—"}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3"><PoStatusBadge status={po.status} /></td>
            {/* ── Warehouse column ── */}
            <td className="px-4 py-3">
                {warehouseName ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-zinc-600">
                        <Warehouse className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {warehouseName}
                    </span>
                ) : (
                    <span className="text-sm text-zinc-300">—</span>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-zinc-600">
                {po.order_date ? new Date(po.order_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
            </td>
            <td className="px-4 py-3 text-sm text-zinc-600">
                {po.expected_arrival ? new Date(po.expected_arrival).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
            </td>
            <td className="px-4 py-3 text-sm text-zinc-600">{itemCount} {itemCount === 1 ? "item" : "items"}</td>
            <td className="px-4 py-3 text-sm font-medium text-zinc-900 text-right">
                {grandTotal > 0 ? `$${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
            </td>
            <td className="px-4 py-3 text-right">
                <Link href={`/super-admin/purchase-orders/${po.id}`}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                    View <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </td>
        </tr>
    );
}

export default function PurchaseOrdersPage() {
    const { orgId } = useAuth();
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch]             = useState("");

    const { data: purchaseOrders, isLoading } = usePurchaseOrders(orgId ?? "", null);

    const filtered = (purchaseOrders ?? []).filter((po: any) => {
        const matchesStatus = !statusFilter || po.status === statusFilter;
        const matchesSearch = !search || (
            po.po_number?.toLowerCase().includes(search.toLowerCase()) ||
            po.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
            po.warehouse?.name?.toLowerCase().includes(search.toLowerCase())
        );
        return matchesStatus && matchesSearch;
    });

    const statusCounts = (purchaseOrders ?? []).reduce((acc: Record<string, number>, po: any) => {
        acc[po.status] = (acc[po.status] ?? 0) + 1;
        return acc;
    }, {});

    const inTransit = statusCounts["in_transit"] ?? 0;
    const arrived   = statusCounts["arrived"]    ?? 0;
    const received  = statusCounts["received"]   ?? 0;

    const hasFilters  = !!statusFilter || !!search;
    const clearFilters = () => { setStatusFilter(""); setSearch(""); };

    if (!orgId) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">Purchase Orders</h1>
                    <p className="text-sm text-zinc-500 mt-1">Track shipments from placement to warehouse receipt</p>
                </div>
                <Link href="/super-admin/purchase-orders/new"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                    <Plus className="w-4 h-4" /> New PO
                </Link>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} className="h-20 w-full rounded-xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Shipments", value: purchaseOrders?.length ?? 0, color: "text-zinc-900" },
                        { label: "In Transit",       value: inTransit,                   color: "text-violet-600" },
                        { label: "Arrived",          value: arrived,                     color: "text-amber-600" },
                        { label: "Received",         value: received,                    color: "text-green-600" },
                    ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4">
                            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input type="text" placeholder="Search PO number, supplier or warehouse…"
                           value={search} onChange={(e) => setSearch(e.target.value)}
                           className="w-full pl-9 pr-9 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-700">
                    <option value="">All statuses</option>
                    {Object.entries(PO_STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label}{statusCounts[key] ? ` (${statusCounts[key]})` : ""}</option>
                    ))}
                </select>
                {hasFilters && (
                    <button onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                        <X className="w-3.5 h-3.5" /> Clear
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} className="h-14 w-full rounded-xl" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 py-16 text-center">
                    <Ship className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500 font-medium">
                        {hasFilters ? "No shipments match your filters" : "No purchase orders yet"}
                    </p>
                    <p className="text-zinc-400 text-sm mt-1">
                        {!hasFilters && "Create a purchase order to start tracking your shipments."}
                    </p>
                    {hasFilters ? (
                        <button onClick={clearFilters} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">Clear filters</button>
                    ) : (
                        <Link href="/super-admin/purchase-orders/new"
                              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                            <Plus className="w-4 h-4" /> New Purchase Order
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                    <div className="flex items-center px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                        <p className="text-xs text-zinc-500 font-medium">
                            {filtered.length} shipment{filtered.length !== 1 ? "s" : ""}{hasFilters && " (filtered)"}
                        </p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left">
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">PO / Supplier</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Status</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Warehouse</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Order Date</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Expected</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Items</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">Total Cost</th>
                            <th className="px-4 py-3" />
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                        {filtered.map((po: any) => <ShipmentRow key={po.id} po={po} />)}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}