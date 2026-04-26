//super-admin/warehouse/purchase-orders
"use client";

import { useWarehouseById } from "@/lib/hooks/queries/useWarehouse";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { usePurchaseOrders } from "@/lib/hooks/queries/usePurchaseOrders";
import { usePallets, usePalletStats, usePurchaseOrdersForFilter } from "@/lib/hooks/queries/usePallets";
import { useWarehouseInventory } from "@/lib/hooks/queries/useWarehouse";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import {
    Package, Thermometer, Snowflake, Wind,
    ArrowLeft, MapPin, Warehouse,
    ChevronRight, Ship, Clock, CheckCircle2, XCircle,
    AlertCircle, FileText, Plus, Anchor, Layers,
    Search, X, LayoutGrid, List, Receipt, Bell,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, use, useCallback } from "react";
import type { PalletFilters, PalletWithDetails } from "@/lib/supabase/queries/pallets";
import { ItemDetailDrawer } from "@/components/warehouse/ItemDetailDrawer";
import LowStockThresholdManager from "@/components/admin/settings/LowStockThresholdManager";
import { WarehouseExpensesPanel } from "@/components/super-admin/warehouse/WarehouseExpensesPanel";
import { LocationNotificationPreferences } from "@/components/location-notification-preferences";


type TabId = "inventory" | "shipments" | "pallets" | "thresholds" | "expenses" | "notifications";

// ─── Configs ──────────────────────────────────────────────────────────────────

const TEMP_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    frozen:       { label: "Frozen",       icon: Snowflake,   className: "bg-blue-100 text-blue-700" },
    refrigerated: { label: "Refrigerated", icon: Thermometer, className: "bg-cyan-100 text-cyan-700" },
    dry:          { label: "Dry",          icon: Wind,        className: "bg-amber-100 text-amber-700" },
};

const PO_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string; dotColor: string }> = {
    draft:      { label: "Draft",      icon: FileText,     className: "bg-zinc-100 text-zinc-600",     dotColor: "bg-zinc-400" },
    submitted:  { label: "Submitted",  icon: Clock,        className: "bg-blue-100 text-blue-700",     dotColor: "bg-blue-500" },
    in_transit: { label: "In Transit", icon: Ship,         className: "bg-violet-100 text-violet-700", dotColor: "bg-violet-500" },
    arrived:    { label: "Arrived",    icon: Anchor,       className: "bg-amber-100 text-amber-700",   dotColor: "bg-amber-500" },
    received:   { label: "Received",   icon: CheckCircle2, className: "bg-green-100 text-green-700",   dotColor: "bg-green-500" },
    cancelled:  { label: "Cancelled",  icon: XCircle,      className: "bg-red-100 text-red-700",       dotColor: "bg-red-400" },
};

const PALLET_STATUS_CONFIG: Record<string, { label: string; className: string; dotColor: string }> = {
    active:  { label: "Active",  className: "bg-green-100 text-green-700",  dotColor: "bg-green-500" },
    empty:   { label: "Empty",   className: "bg-zinc-100 text-zinc-600",    dotColor: "bg-zinc-400" },
    retired: { label: "Retired", className: "bg-red-100 text-red-600",      dotColor: "bg-red-400" },
};

// ─── Badge components ─────────────────────────────────────────────────────────

function TempBadge({ type }: { type: string }) {
    const cfg = TEMP_CONFIG[type] ?? { label: type, icon: Package, className: "bg-zinc-100 text-zinc-600" };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cfg.className}`}>
            <Icon className="w-3 h-3" />{cfg.label}
        </span>
    );
}

function PoStatusBadge({ status }: { status: string }) {
    const cfg = PO_STATUS_CONFIG[status] ?? { label: status, icon: AlertCircle, className: "bg-zinc-100 text-zinc-600", dotColor: "bg-zinc-400" };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
            <Icon className="w-3 h-3" />{cfg.label}
        </span>
    );
}

function PalletStatusBadge({ status }: { status: string }) {
    const cfg = PALLET_STATUS_CONFIG[status] ?? { label: status, className: "bg-zinc-100 text-zinc-600", dotColor: "bg-zinc-400" };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
            {cfg.label}
        </span>
    );
}

// ─── Shipments tab ────────────────────────────────────────────────────────────

function ShipmentRow({ po, warehouseId }: { po: any; warehouseId: string }) {
    const router = useRouter();
    const itemCount  = po.purchase_order_items?.length ?? 0;
    const grandTotal = (po.subtotal_before ?? 0) + (po.office_fee ?? 0) + (po.shipping_fee ?? 0);
    return (
        <tr
            onClick={() => router.push(`/super-admin/warehouse/${warehouseId}/purchase-orders/${po.id}`)}
            className="hover:bg-zinc-50 transition-colors group cursor-pointer"
        >
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
                <Link
                    href={`/super-admin/warehouse/${warehouseId}/purchase-orders/${po.id}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                    View <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </td>
        </tr>
    );
}

function ShipmentsTab({ organizationId, warehouseId }: { organizationId: string; warehouseId: string }) {
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [search, setSearch]             = useState("");

    const { data: purchaseOrders, isLoading } = usePurchaseOrders(organizationId, warehouseId);
    const newPoHref = `/super-admin/warehouse/${warehouseId}/purchase-orders/new`;

    const filtered = (purchaseOrders ?? []).filter((po) => {
        const matchesStatus = !statusFilter || po.status === statusFilter;
        const matchesSearch = !search || (
            po.po_number?.toLowerCase().includes(search.toLowerCase()) ||
            po.supplier_name?.toLowerCase().includes(search.toLowerCase())
        );
        return matchesStatus && matchesSearch;
    });

    const statusCounts = (purchaseOrders ?? []).reduce((acc, po) => {
        acc[po.status] = (acc[po.status] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const inTransit = statusCounts["in_transit"] ?? 0;
    const arrived   = statusCounts["arrived"]    ?? 0;
    const received  = statusCounts["received"]   ?? 0;
    const hasFilters = !!statusFilter || !!search;
    const clearFilters = () => { setStatusFilter(""); setSearch(""); };

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => <LoadingSkeleton key={i} className="h-20 w-full rounded-xl" />)}
                </div>
                {Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats row */}
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

            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search PO number or supplier…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Status filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-700"
                >
                    <option value="">All statuses</option>
                    {Object.entries(PO_STATUS_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>
                            {cfg.label}{statusCounts[key] ? ` (${statusCounts[key]})` : ""}
                        </option>
                    ))}
                </select>

                {/* Clear */}
                {hasFilters && (
                    <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                        <X className="w-3.5 h-3.5" /> Clear
                    </button>
                )}

                {/* New PO button */}
                <Link href={newPoHref} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
                    <Plus className="w-3.5 h-3.5" /> New PO
                </Link>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 py-16 text-center">
                    <Ship className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500 font-medium">
                        {hasFilters ? "No shipments match your filters" : "No shipments yet"}
                    </p>
                    <p className="text-zinc-400 text-sm mt-1">
                        {!hasFilters && "Create a purchase order to track your shipments."}
                    </p>
                    {hasFilters ? (
                        <button onClick={clearFilters} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">Clear filters</button>
                    ) : (
                        <Link href={newPoHref} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                            <Plus className="w-4 h-4" /> New Purchase Order
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                        <p className="text-xs text-zinc-500 font-medium">
                            {filtered.length} shipment{filtered.length !== 1 ? "s" : ""}
                            {hasFilters && " (filtered)"}
                        </p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left">
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">PO / Supplier</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Status</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Order Date</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Expected</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Items</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">Total Cost</th>
                            <th className="px-4 py-3" />
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                        {filtered.map((po) => <ShipmentRow key={po.id} po={po} warehouseId={warehouseId} />)}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Pallets tab ──────────────────────────────────────────────────────────────

function PalletRow({ pallet, warehouseId }: { pallet: PalletWithDetails; warehouseId: string }) {
    return (
        <tr className="hover:bg-zinc-50 transition-colors group">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                        <Layers className="w-4 h-4 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <span className="font-mono font-medium text-zinc-900 text-sm">{pallet.pallet_label}</span>
                </div>
            </td>
            <td className="px-4 py-3">
                <PalletStatusBadge status={pallet.status ?? "active"} />
            </td>
            <td className="px-4 py-3">
                {pallet.warehouse ? (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-zinc-500">{pallet?.warehouse?.name}</span>
                    </div>
                ) : (
                    <span className="text-xs text-zinc-400">Unassigned</span>
                )}
            </td>
            <td className="px-4 py-3">
                {pallet.purchase_orders ? (
                    <div>
                        <p className="text-sm font-medium text-zinc-900">{pallet.purchase_orders.po_number}</p>
                        {pallet.purchase_orders.supplier_name && (
                            <p className="text-xs text-zinc-400">{pallet.purchase_orders.supplier_name}</p>
                        )}
                    </div>
                ) : (
                    <span className="text-xs text-zinc-400">No PO</span>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-zinc-600">
                {pallet.item_count} {pallet.item_count === 1 ? "item" : "items"}
            </td>
            <td className="px-4 py-3 text-sm font-medium text-zinc-900">{pallet.total_boxes} boxes</td>
            <td className="px-4 py-3 text-sm text-zinc-500">
                {pallet.received_at
                    ? new Date(pallet.received_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
            </td>
            <td className="px-4 py-3 text-right">
                <Link
                    href={`/super-admin/warehouse/${warehouseId}/pallets/${pallet.id}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                    View <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </td>
        </tr>
    );
}

type PalletViewMode = "flat" | "grouped";

function groupPalletsByShipment(pallets: PalletWithDetails[]) {
    const groups = new Map<string, {
        label: string;
        supplier: string | null;
        poId: string | null;
        pallets: PalletWithDetails[];
    }>();

    for (const pallet of pallets) {
        const key = pallet.purchase_order_id ?? "__none__";
        if (!groups.has(key)) {
            groups.set(key, {
                label: pallet.purchase_orders?.po_number ?? "No Shipment",
                supplier: pallet.purchase_orders?.supplier_name ?? null,
                poId: pallet.purchase_order_id ?? null,
                pallets: [],
            });
        }
        groups.get(key)!.pallets.push(pallet);
    }

    return [...groups.entries()]
        .sort(([aKey, aGroup], [bKey, bGroup]) => {
            if (aKey === "__none__") return 1;
            if (bKey === "__none__") return -1;
            const aDate = Math.max(...aGroup.pallets.map(p => new Date(p.received_at ?? 0).getTime()));
            const bDate = Math.max(...bGroup.pallets.map(p => new Date(p.received_at ?? 0).getTime()));
            return bDate - aDate;
        })
        .map(([, group]) => group);
}

function PalletsTab({ warehouseId }: { warehouseId: string }) {
    const router = useRouter();
    const [filters, setFilters]     = useState<PalletFilters>({ status: undefined });
    const [search, setSearch]       = useState("");
    const [viewMode, setViewMode]   = useState<PalletViewMode>("flat");

    const { data: pallets, isLoading } = usePallets(warehouseId, { ...filters, search: search || undefined });
    const { data: stats }              = usePalletStats(warehouseId);
    const { data: purchaseOrders }     = usePurchaseOrdersForFilter(warehouseId);

    const handleFilterChange = useCallback(
        (partial: Partial<PalletFilters>) => setFilters((prev) => ({ ...prev, ...partial })),
        []
    );

    const activeFiltersCount = [
        filters.status && filters.status !== "all",
        filters.purchaseOrderId,
    ].filter(Boolean).length;

    const clearFilters = () => { setFilters({ status: undefined }); setSearch(""); };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <LoadingSkeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    const hasPallets = pallets && pallets.length > 0;

    return (
        <div className="space-y-4">
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Active", value: stats.total,   color: "text-zinc-900" },
                        { label: "Active",        value: stats.active,  color: "text-green-600" },
                        { label: "Empty",         value: stats.empty,   color: "text-zinc-500" },
                        { label: "Archive",       value: stats.retired, color: "text-red-500" },
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
                    <input
                        type="text"
                        placeholder="Search pallet label or item name…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <select
                    value={filters.status ?? ""}
                    onChange={(e) => handleFilterChange({ status: (e.target.value || undefined) as PalletFilters["status"] })}
                    className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-700"
                >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="empty">Empty</option>
                    <option value="all">Include Retired</option>
                </select>
                {purchaseOrders && purchaseOrders.length > 0 && (
                    <select
                        value={filters.purchaseOrderId ?? ""}
                        onChange={(e) => handleFilterChange({ purchaseOrderId: e.target.value || undefined })}
                        className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-700"
                    >
                        <option value="">All shipments</option>
                        {purchaseOrders.map((po) => (
                            <option key={po.id} value={po.id}>{po.po_number}{po.supplier_name ? ` — ${po.supplier_name}` : ""}</option>
                        ))}
                    </select>
                )}
                {(activeFiltersCount > 0 || search) && (
                    <button onClick={clearFilters} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                        <X className="w-3.5 h-3.5" /> Clear
                    </button>
                )}
            </div>

            {!hasPallets ? (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 py-16 text-center">
                    <Layers className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500 font-medium">
                        {activeFiltersCount > 0 || search ? "No pallets match your filters" : "No pallets in this warehouse"}
                    </p>
                    {(activeFiltersCount > 0 || search) && (
                        <button onClick={clearFilters} className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">Clear filters</button>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                    {/* Table header with view switcher */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
                        <p className="text-xs text-zinc-500 font-medium">
                            {pallets.length} pallet{pallets.length !== 1 ? "s" : ""}
                            {(activeFiltersCount > 0 || search) && " (filtered)"}
                        </p>
                        {/* View switcher */}
                        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1">
                            <button
                                onClick={() => setViewMode("flat")}
                                title="Flat list"
                                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                                    viewMode === "flat"
                                        ? "bg-zinc-100 text-zinc-900 shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-600"
                                }`}
                            >
                                <List className="h-3.5 w-3.5" /> Flat
                            </button>
                            <button
                                onClick={() => setViewMode("grouped")}
                                title="Group by shipment"
                                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                                    viewMode === "grouped"
                                        ? "bg-zinc-100 text-zinc-900 shadow-sm"
                                        : "text-zinc-400 hover:text-zinc-600"
                                }`}
                            >
                                <Layers className="h-3.5 w-3.5" /> By Shipment
                            </button>
                        </div>
                    </div>

                    {viewMode === "flat" ? (
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left">
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Pallet</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Location</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Shipment</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Items</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Boxes</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Received</th>
                                <th className="px-4 py-3" />
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                            {pallets.map((pallet) => (
                                <PalletRow key={pallet.id} pallet={pallet} warehouseId={warehouseId} />
                            ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left">
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Pallet</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Location</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Items</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Boxes</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Received</th>
                                <th className="px-4 py-3" />
                            </tr>
                            </thead>
                            <tbody>
                            {groupPalletsByShipment(pallets).map((group) => {
                                const totalBoxes = group.pallets.reduce((s, p) => s + p.total_boxes, 0);
                                const latestDate = group.pallets
                                    .map(p => p.received_at)
                                    .filter(Boolean)
                                    .sort()
                                    .at(-1);

                                return (
                                    <>
                                        {/* Shipment group header */}
                                        <tr key={`grp-${group.poId}`} className="bg-zinc-50/80 border-y border-zinc-100">
                                            <td colSpan={7} className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50">
                                                        {group.poId ? (
                                                            <Ship className="h-3.5 w-3.5 text-indigo-500" />
                                                        ) : (
                                                            <Package className="h-3.5 w-3.5 text-zinc-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {group.poId ? (
                                                            <button
                                                                onClick={() => router.push(`/super-admin/purchase-orders/${group.poId}`)}
                                                                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                                                            >
                                                                {group.label}
                                                            </button>
                                                        ) : (
                                                            <span className="text-sm font-semibold text-zinc-500">{group.label}</span>
                                                        )}
                                                        {group.supplier && (
                                                            <span className="text-xs text-zinc-400">— {group.supplier}</span>
                                                        )}
                                                    </div>
                                                    <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500 shrink-0">
                                                        <span>{group.pallets.length} pallet{group.pallets.length !== 1 ? "s" : ""}</span>
                                                        <span className="text-zinc-300">·</span>
                                                        <span>{totalBoxes} boxes</span>
                                                        {latestDate && (
                                                            <>
                                                                <span className="text-zinc-300">·</span>
                                                                <span>{new Date(latestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Indented pallet rows */}
                                        {group.pallets.map((pallet, idx) => {
                                            const isLast = idx === group.pallets.length - 1;
                                            return (
                                                <tr
                                                    key={pallet.id}
                                                    className={`hover:bg-zinc-50 transition-colors group cursor-pointer ${isLast ? "border-b border-zinc-100" : ""}`}
                                                    onClick={() => router.push(`/super-admin/warehouse/${warehouseId}/pallets/${pallet.id}`)}
                                                >
                                                    <td className="py-3 pl-10 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-zinc-300 select-none">{isLast ? "└" : "├"}</span>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 rounded-md bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                                                                    <Layers className="w-3.5 h-3.5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                                                                </div>
                                                                <span className="font-mono font-medium text-zinc-900 text-sm">{pallet.pallet_label}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <PalletStatusBadge status={pallet.status ?? "active"} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {pallet.warehouse ? (
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-xs text-zinc-500">{pallet?.warehouse?.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-zinc-400">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-zinc-600">
                                                        {pallet.item_count} {pallet.item_count === 1 ? "item" : "items"}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">{pallet.total_boxes} boxes</td>
                                                    <td className="px-4 py-3 text-sm text-zinc-500">
                                                        {pallet.received_at
                                                            ? new Date(pallet.received_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                                            : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Link
                                                            href={`/super-admin/warehouse/${warehouseId}/pallets/${pallet.id}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                                                        >
                                                            View <ChevronRight className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </>
                                );
                            })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

type AggregatedInventoryItem = {
    item_id: number;
    item_name: string;
    item_display_label: string;
    sku: string | null;
    total_boxes: number;
    total_pieces: number;
    pallet_count: number;
    effective_ppb: number | null;
};

function aggregateByItem(rows: any[]): AggregatedInventoryItem[] {
    const map = new Map<number, AggregatedInventoryItem>();
    for (const row of rows) {
        const existing = map.get(row.item_id);
        if (existing) {
            existing.total_boxes  += row.box_count ?? 0;
            existing.total_pieces += row.total_pieces ?? 0;
            existing.pallet_count += 1;
        } else {
            map.set(row.item_id, {
                item_id:           row.item_id,
                item_name:         row.item_name ?? "Unknown",
                item_display_label: row.item_display_label ?? row.item_name ?? "Unknown",
                sku:               row.sku,
                total_boxes:       row.box_count ?? 0,
                total_pieces:      row.total_pieces ?? 0,
                pallet_count:      1,
                effective_ppb:     row.effective_ppb,
            });
        }
    }
    return [...map.values()].sort((a, b) => a.item_name.localeCompare(b.item_name));
}

function InventoryTab({ warehouseId }: { warehouseId: string }) {
    const [search, setSearch]                 = useState("");
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen]         = useState(false);

    const { data: inventory, isLoading } = useWarehouseInventory(warehouseId);

    const aggregated = aggregateByItem(inventory ?? []);

    const filtered = aggregated.filter((row) =>
        !search ||
        row.item_name.toLowerCase().includes(search.toLowerCase()) ||
        row.sku?.toLowerCase().includes(search.toLowerCase())
    );

    const openDrawer = (itemId: number) => {
        setSelectedItemId(itemId);
        setDrawerOpen(true);
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <LoadingSkeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search by item name or SKU…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 py-16 text-center">
                        <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-500 font-medium">
                            {search ? "No items match your search" : "No inventory in this warehouse"}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                            <p className="text-xs text-zinc-500 font-medium">
                                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50/50 text-left">
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Item</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">SKU</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">Boxes</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">Pieces</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">Pallets</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                            {filtered.map((row) => (
                                <tr
                                    key={row.item_id}
                                    onClick={() => openDrawer(row.item_id)}
                                    className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                                                <Package className="w-4 h-4 text-zinc-400" />
                                            </div>
                                            <span className="font-medium text-zinc-900">{row.item_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-xs text-zinc-500">{row.sku ?? "—"}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm font-semibold text-zinc-900">{row.total_boxes}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm text-zinc-600">{row.total_pieces > 0 ? row.total_pieces.toLocaleString() : "—"}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm text-zinc-500">{row.pallet_count}</span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ItemDetailDrawer
                itemId={selectedItemId}
                warehouseLocationId={warehouseId}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            />
        </>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawTab       = searchParams.get("tab");
    const activeTab: TabId = (["inventory", "shipments", "pallets", "thresholds", "expenses", "notifications"] as TabId[]).includes(rawTab as TabId)
        ? (rawTab as TabId)
        : "inventory";

    const setActiveTab = (tab: TabId) => {
        const next = new URLSearchParams(searchParams.toString());
        next.set("tab", tab);
        router.replace(`?${next.toString()}`, { scroll: false });
    };

    const { id } = use(params);

    const { data: warehouse, isLoading } = useWarehouseById(id);
    const { data: palletStats }          = usePalletStats(id);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton className="h-10 w-48" />
                <LoadingSkeleton className="h-32 w-full rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} className="h-32 w-full rounded-xl" />)}
                </div>
            </div>
        );
    }

    if (!warehouse) {
        return (
            <div className="text-center py-16">
                <Warehouse className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 font-medium">Warehouse not found</p>
                <Link href="/super-admin/warehouse" className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Warehouses
                </Link>
            </div>
        );
    }

    const address = typeof warehouse.address === "string"
        ? JSON.parse(warehouse.address)
        : (warehouse.address as Record<string, string>);

    const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
        { id: "inventory",     label: "Inventory",      icon: LayoutGrid },
        { id: "shipments",     label: "Shipments",      icon: Ship },
        { id: "pallets",       label: "Pallets",        icon: Layers, count: palletStats?.total },
        { id: "thresholds",    label: "Thresholds",     icon: Thermometer },
        { id: "expenses",      label: "Expenses",       icon: Receipt },
        { id: "notifications", label: "Notifications",  icon: Bell },
    ];

    return (
        <div className="space-y-6">
            <Link href="/super-admin/warehouse" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> All Warehouses
            </Link>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <Warehouse className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold text-zinc-900">{warehouse.name}</h1>
                            {address && (
                                <p className="text-zinc-500 text-sm mt-1 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    {address.street}, {address.city}, {address.state} {address.zip}
                                </p>
                            )}
                        </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Warehouse</span>
                </div>
                {palletStats && palletStats.total > 0 && (
                    <div className="flex gap-6 mt-5 pt-5 border-t border-zinc-100">
                        <div>
                            <p className="text-2xl font-semibold text-zinc-900">{palletStats.total}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Pallets</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-zinc-200">
                <nav className="-mb-px flex gap-6">
                    {tabs.map(({ id: tabId, label, icon: Icon, count }) => (
                        <button
                            key={tabId}
                            onClick={() => setActiveTab(tabId)}
                            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tabId ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"}`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                            {count !== undefined && (
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${activeTab === tabId ? "bg-indigo-100 text-indigo-600" : "bg-zinc-100 text-zinc-500"}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content */}
            {activeTab === "inventory" && <InventoryTab warehouseId={id} />}
            {activeTab === "shipments" && warehouse?.organization_id && (
                <ShipmentsTab organizationId={warehouse.organization_id} warehouseId={id} />
            )}
            {activeTab === "pallets" && (
                <PalletsTab warehouseId={id} />
            )}

            {activeTab === "thresholds" && (
                <LowStockThresholdManager organizationId={warehouse.organization_id} locationId={id} />
            )}

            {activeTab === "expenses" && (
                <WarehouseExpensesPanel
                    organizationId={warehouse.organization_id}
                    warehouseLocationId={id}
                />
            )}

            {activeTab === "notifications" && (
                <LocationNotificationPreferences locationId={id} />
            )}
        </div>
    );
}
