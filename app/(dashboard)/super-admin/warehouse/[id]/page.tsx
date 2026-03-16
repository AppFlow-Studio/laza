"use client";

import { useWarehouseById } from "@/lib/hooks/queries/useWarehouse";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { usePurchaseOrders } from "@/lib/hooks/queries/usePurchaseOrders";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import {
    Package, Thermometer, Snowflake, Wind,
    LayoutGrid, List, ArrowLeft, MapPin, Warehouse,
    ChevronRight, Ship, Clock, CheckCircle2, XCircle,
    AlertCircle, FileText, Plus, Anchor,
} from "lucide-react";
import Link from "next/link";
import { useState, use } from "react";
import type { StorageSpace } from "@/lib/supabase/types";

type TabId = "storage" | "shipments";

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

// ─── Shared badge components ──────────────────────────────────────────────────

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

// ─── Storage space components ─────────────────────────────────────────────────

function StorageSpaceCard({ space, warehouseId }: { space: StorageSpace; warehouseId: string }) {
    return (
        <Link
            href={`/super-admin/warehouse/${warehouseId}/storage-spaces/${space.id}`}
            className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:shadow-md hover:border-zinc-300 transition-all group"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <Package className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <TempBadge type={space.temperature_type} />
            </div>
            <p className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">{space.name}</p>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                Click to manage inventory <ChevronRight className="w-3 h-3" />
            </p>
        </Link>
    );
}

function StorageSpaceRow({ space, warehouseId }: { space: StorageSpace; warehouseId: string }) {
    return (
        <tr className="hover:bg-zinc-50 transition-colors group">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-zinc-400" />
                    </div>
                    <span className="font-medium text-zinc-900">{space.name}</span>
                </div>
            </td>
            <td className="px-4 py-3"><TempBadge type={space.temperature_type} /></td>
            <td className="px-4 py-3 text-right">
                <Link
                    href={`/super-admin/warehouse/${warehouseId}/storage-spaces/${space.id}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                    Manage inventory <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </td>
        </tr>
    );
}

// ─── Shipment components ──────────────────────────────────────────────────────

function ShipmentCard({ po, warehouseId }: { po: any; warehouseId: string }) {
    const itemCount  = po.purchase_order_items?.length ?? 0;
    const grandTotal = (po.subtotal_before ?? 0) + (po.office_fee ?? 0) + (po.shipping_fee ?? 0);
    return (
        <Link
            href={`/super-admin/warehouse/${warehouseId}/purchase-orders/${po.id}`}
            className="bg-white rounded-xl shadow-sm border border-zinc-200 p-5 hover:shadow-md hover:border-zinc-300 transition-all group block"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="font-semibold text-zinc-900 group-hover:text-indigo-600 transition-colors">{po.po_number}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{po.supplier_name ?? "—"}</p>
                </div>
                <PoStatusBadge status={po.status} />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-100">
                <div>
                    <p className="text-xs text-zinc-400">Ordered</p>
                    <p className="text-sm font-medium text-zinc-900 mt-0.5">
                        {po.order_date ? new Date(po.order_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-zinc-400">Items</p>
                    <p className="text-sm font-medium text-zinc-900 mt-0.5">{itemCount}</p>
                </div>
                <div>
                    <p className="text-xs text-zinc-400">Total</p>
                    <p className="text-sm font-medium text-zinc-900 mt-0.5">
                        {grandTotal > 0 ? `$${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                    </p>
                </div>
            </div>
        </Link>
    );
}

function ShipmentRow({ po, warehouseId }: { po: any; warehouseId: string }) {
    const itemCount  = po.purchase_order_items?.length ?? 0;
    const grandTotal = (po.subtotal_before ?? 0) + (po.office_fee ?? 0) + (po.shipping_fee ?? 0);
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

// ─── Storage Spaces tab ───────────────────────────────────────────────────────

function StorageSpacesTab({ storageSpaces, warehouseId }: { storageSpaces: StorageSpace[]; warehouseId: string }) {
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">{storageSpaces.length} storage {storageSpaces.length === 1 ? "space" : "spaces"}</p>
                <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
                    <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50"}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode("table")} className={`p-2 transition-colors ${viewMode === "table" ? "bg-indigo-600 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50"}`}><List className="w-4 h-4" /></button>
                </div>
            </div>
            {storageSpaces.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 py-16 text-center">
                    <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500 font-medium">No storage spaces configured</p>
                    <p className="text-zinc-400 text-sm mt-1">Add storage spaces to start tracking warehouse inventory.</p>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {storageSpaces.map((s) => <StorageSpaceCard key={s.id} space={s} warehouseId={warehouseId} />)}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Storage Space</th>
                            <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Type</th>
                            <th className="px-4 py-3" />
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                        {storageSpaces.map((s) => <StorageSpaceRow key={s.id} space={s} warehouseId={warehouseId} />)}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Shipments tab ────────────────────────────────────────────────────────────

function ShipmentsTab({ organizationId, warehouseId }: { organizationId: string; warehouseId: string }) {
    const [viewMode, setViewMode]     = useState<"grid" | "table">("table");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const { data: purchaseOrders, isLoading } = usePurchaseOrders(organizationId);

    const filtered     = (purchaseOrders ?? []).filter((po) => statusFilter === "all" || po.status === statusFilter);
    const statusCounts = (purchaseOrders ?? []).reduce((acc, po) => {
        acc[po.status] = (acc[po.status] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const newPoHref = `/super-admin/warehouse/${warehouseId}/purchase-orders/new`;

    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <LoadingSkeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                {/* Status filter chips */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === "all" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                    >
                        All {purchaseOrders ? `(${purchaseOrders.length})` : ""}
                    </button>
                    {Object.entries(PO_STATUS_CONFIG).map(([key, cfg]) => {
                        const count = statusCounts[key] ?? 0;
                        if (count === 0) return null;
                        return (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors inline-flex items-center gap-1 ${statusFilter === key ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                                {cfg.label} ({count})
                            </button>
                        );
                    })}
                </div>
                {/* View toggle + new button */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
                        <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50"}`}><LayoutGrid className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode("table")} className={`p-2 transition-colors ${viewMode === "table" ? "bg-indigo-600 text-white" : "bg-white text-zinc-400 hover:bg-zinc-50"}`}><List className="w-4 h-4" /></button>
                    </div>
                    <Link href={newPoHref} className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> New PO
                    </Link>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 py-16 text-center">
                    <Ship className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500 font-medium">
                        {statusFilter === "all" ? "No shipments yet" : `No ${PO_STATUS_CONFIG[statusFilter]?.label ?? statusFilter} shipments`}
                    </p>
                    <p className="text-zinc-400 text-sm mt-1">Create a purchase order to track your China shipments.</p>
                    <Link href={newPoHref} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                        <Plus className="w-4 h-4" /> New Purchase Order
                    </Link>
                </div>
            ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((po) => <ShipmentCard key={po.id} po={po} warehouseId={warehouseId} />)}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50 text-left">
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WarehouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [activeTab, setActiveTab] = useState<TabId>("storage");
    const { id } = use(params);

    const { data: warehouse,        isLoading: warehouseLoading } = useWarehouseById(id);
    const { data: warehouseDetails, isLoading: detailsLoading   } = useLocationWithDetails(id, { enabled: !!id });

    const isLoading    = warehouseLoading || detailsLoading;
    const storageSpaces: StorageSpace[] = warehouseDetails?.storage_spaces ?? [];

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
        { id: "storage",   label: "Storage Spaces", icon: Package, count: storageSpaces.length },
        { id: "shipments", label: "Shipments",       icon: Ship },
    ];

    return (
        <div className="space-y-6">
            <Link href="/super-admin/warehouse" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> All Warehouses
            </Link>

            {/* Header card */}
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
                <div className="flex gap-6 mt-5 pt-5 border-t border-zinc-100">
                    <div>
                        <p className="text-2xl font-semibold text-zinc-900">{storageSpaces.length}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Storage Spaces</p>
                    </div>
                    {Object.keys(TEMP_CONFIG).map((type) => {
                        const count = storageSpaces.filter((s) => s.temperature_type === type).length;
                        if (count === 0) return null;
                        return (
                            <div key={type}>
                                <p className="text-2xl font-semibold text-zinc-900">{count}</p>
                                <p className="text-xs text-zinc-500 mt-0.5 capitalize">{type}</p>
                            </div>
                        );
                    })}
                </div>
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
            {activeTab === "storage" && <StorageSpacesTab storageSpaces={storageSpaces} warehouseId={id} />}
            {activeTab === "shipments" && warehouse?.organization_id && (
                <ShipmentsTab organizationId={warehouse.organization_id} warehouseId={id} />
            )}
        </div>
    );
}