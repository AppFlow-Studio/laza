//super-admin/purchase-orders/[id]

"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Ship, Package, ChevronDown,
    CheckCircle2, XCircle, Clock, Anchor,
    FileText, DollarSign, Calendar, Hash,
    Boxes, AlertCircle, Pencil, PackageCheck, Warehouse,
    Layers, ChevronRight, AlertTriangle,
} from "lucide-react";

// ─── Discrepancy reason labels ────────────────────────────────────────────────

const PARTIAL_REASON_LABEL: Record<string, string> = {
    damaged_in_transit:       "Damaged in transit",
    supplier_short_pack:      "Supplier short-pack",
    miscount_pending_recount: "Miscount — pending recount",
    sample_pulled_qc:         "Sample pulled for QC",
    other:                    "Other",
};
import { usePurchaseOrder, useUpdatePurchaseOrderStatus, useDeletePurchaseOrder } from "@/lib/hooks/queries/usePurchaseOrders";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import toast from "react-hot-toast";
import { usePallets } from "@/lib/hooks/queries/usePallets";
import { format } from "date-fns";

// ─── Status config ────────────────────────────────────────────────────────────

type POStatus = "draft" | "submitted" | "in_transit" | "arrived" | "received" | "cancelled";

const STATUS_CONFIG: Record<POStatus, { label: string; icon: React.ElementType; className: string; dotColor: string }> = {
    draft:      { label: "Draft",      icon: FileText,     className: "bg-zinc-100 text-zinc-600",     dotColor: "bg-zinc-400" },
    submitted:  { label: "Submitted",  icon: Clock,        className: "bg-blue-100 text-blue-700",     dotColor: "bg-blue-500" },
    in_transit: { label: "In Transit", icon: Ship,         className: "bg-violet-100 text-violet-700", dotColor: "bg-violet-500" },
    arrived:    { label: "Arrived",    icon: Anchor,       className: "bg-amber-100 text-amber-700",   dotColor: "bg-amber-500" },
    received:   { label: "Received",   icon: CheckCircle2, className: "bg-green-100 text-green-700",   dotColor: "bg-green-500" },
    cancelled:  { label: "Cancelled",  icon: XCircle,      className: "bg-red-100 text-red-700",       dotColor: "bg-red-400" },
};

// Status flow — what transitions are allowed from each status
const NEXT_STATUSES: Record<POStatus, POStatus[]> = {
    draft:      ["submitted", "cancelled"],
    submitted:  ["in_transit", "cancelled"],
    in_transit: ["arrived", "cancelled"],
    arrived:    ["cancelled"],
    received:   [],
    cancelled:  [],
};

// Statuses that show the Receive Shipment button
const RECEIVABLE_STATUSES: POStatus[] = ["in_transit", "arrived"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
    if (n == null) return "—";
    return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}
function fmtDate(d: string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtNum(n: number | null | undefined, decimals = 2) {
    if (n == null) return "—";
    return Number(n).toFixed(decimals);
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as POStatus] ?? { label: status, icon: AlertCircle, className: "bg-zinc-100 text-zinc-600", dotColor: "bg-zinc-400" };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${cfg.className}`}>
            <Icon className="w-4 h-4" />{cfg.label}
        </span>
    );
}

// ─── Status advance dropdown ──────────────────────────────────────────────────

function StatusActions({ poId, currentStatus, warehouseId }: { poId: string; currentStatus: POStatus; warehouseId?: string }) {
    const [open, setOpen] = useState(false);
    const updateStatus = useUpdatePurchaseOrderStatus();
    const nextOptions = NEXT_STATUSES[currentStatus] ?? [];

    if (nextOptions.length === 0) return null;

    async function advance(status: POStatus) {
        setOpen(false);
        try {
            await updateStatus.mutateAsync({ id: poId, status });
            toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
        } catch {
            toast.error("Failed to update status");
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((p) => !p)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
                Advance Status <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-zinc-200 z-20 overflow-hidden">
                        {nextOptions.map((s) => {
                            const cfg  = STATUS_CONFIG[s];
                            const Icon = cfg.icon;
                            return (
                                <button
                                    key={s}
                                    onClick={() => advance(s)}
                                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-zinc-50 transition-colors ${s === "cancelled" ? "text-red-600 hover:bg-red-50" : "text-zinc-700"}`}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    Mark as {cfg.label}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PurchaseOrderDetailPage({
                                                    params,
                                                }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();

    const { data: po, isLoading } = usePurchaseOrder(id);
    const deletePO = useDeletePurchaseOrder();
    const { data: pallets = [] } = usePallets(
        po?.warehouse?.id,
        { purchaseOrderId: id }
    );

    async function handleDelete() {
        if (!confirm("Delete this purchase order? This cannot be undone.")) return;
        try {
            await deletePO.mutateAsync(id);
            toast.success("Purchase order deleted");
            router.push(`/super-admin/purchase-orders`);
        } catch {
            toast.error("Failed to delete");
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-4 max-w-4xl">
                <LoadingSkeleton className="h-8 w-40" />
                <LoadingSkeleton className="h-40 w-full rounded-xl" />
                <LoadingSkeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }
    if (!po) {
        return (
            <div className="text-center py-16">
                <Ship className="w-full h-12 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 font-medium">Purchase order not found</p>
                <Link href={`/super-admin/purchase-orders`} className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Warehouse
                </Link>
            </div>
        );
    }

    const status     = po.status as POStatus;
    const grandTotal = (Number(po.subtotal_before) || 0) + (Number(po.office_fee) || 0) + (Number(po.shipping_fee) || 0);
    const items      = po.purchase_order_items ?? [];

    // Parse free-text items from notes JSON (set in new PO page)
    const freeTextItems: {
        item_name: string;
        quantity_ordered: number;
        unit_price_before: number;
        pieces_per_box: number | null;
        cbm: number | null;
        total_price_before: number;
        items: {
            name: string;
            sku: string;
        }
    }[] = items;



    const displayItems = freeTextItems.length > 0 ? freeTextItems : [];

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Back */}
            <Link
                href={`/super-admin/purchase-orders`}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Purchase orders
            </Link>

            {/* Header */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                            <Ship className="w-6 h-6 text-violet-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-semibold text-zinc-900">{po.po_number}</h1>
                                <StatusBadge status={status} />
                            </div>
                            <p className="text-sm text-zinc-400 mt-1">{po.supplier_name ?? "No supplier"}</p>
                        </div>
                    </div>

                    {/* ── Action buttons ── */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Receive Shipment — shown for in_transit and arrived only */}
                        {RECEIVABLE_STATUSES.includes(status) && (
                            <button
                                onClick={() =>
                                    router.push(
                                        `/super-admin/purchase-orders/${id}/receive`
                                    )
                                }
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <PackageCheck className="w-4 h-4" />
                                Receive Shipment
                            </button>
                        )}

                        {/* Advance Status dropdown — unchanged */}
                        <StatusActions poId={po.id} currentStatus={status} />
                    </div>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-5 border-t border-zinc-100">
                    <div>
                        <p className="text-xs text-zinc-400 flex items-center gap-1"><Warehouse className="w-3 h-3" /> Warehouse Name</p>
                        <p className="text-sm font-medium text-zinc-900 mt-1">{po.warehouse.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Order Date</p>
                        <p className="text-sm font-medium text-zinc-900 mt-1">{fmtDate(po.order_date)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Expected</p>
                        <p className="text-sm font-medium text-zinc-900 mt-1">{fmtDate(po.expected_arrival)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> Arrived</p>
                        <p className="text-sm font-medium text-zinc-900 mt-1">{fmtDate(po.actual_arrival)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-400 flex items-center gap-1"><Boxes className="w-3 h-3" /> Total CBM</p>
                        <p className="text-sm font-medium text-zinc-900 mt-1">{fmtNum(po.total_cbm, 4)}</p>
                    </div>
                </div>
            </div>

            {/* Line items table */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-sm font-semibold text-zinc-700">Line Items</h2>
                    <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-xs">{displayItems.length}</span>
                </div>

                {displayItems.length === 0 ? (
                    <div className="py-12 text-center">
                        <Package className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                        <p className="text-sm text-zinc-400">No line items</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-100 text-left">
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide">Item</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">Qty Ordered</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">Unit Price</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">Total Before</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">Pcs/Box</th>
                                <th className="px-4 py-3 font-medium text-zinc-500 text-xs uppercase tracking-wide text-right">CBM</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                            {displayItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-zinc-900">{item?.items?.name} | {item?.items?.sku}</td>
                                    <td className="px-4 py-3 text-right text-zinc-600">{item.quantity_ordered?.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-zinc-600">${Number(item.unit_price_before).toFixed(4)}</td>
                                    <td className="px-4 py-3 text-right text-zinc-700 font-medium">{fmt(item.total_price_before)}</td>
                                    <td className="px-4 py-3 text-right text-zinc-600">{item.pieces_per_box ?? "—"}</td>
                                    <td className="px-4 py-3 text-right text-zinc-600">{item.cbm != null ? Number(item.cbm).toFixed(4) : "—"}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Cost summary */}
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 space-y-1.5">
                    <div className="flex justify-between text-sm text-zinc-500">
                        <span>Subtotal (before fees)</span>
                        <span className="font-medium text-zinc-700">{fmt(po.subtotal_before)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-500">
                        <span>Office / Agent fee</span>
                        <span>{fmt(po.office_fee)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-500">
                        <span>Shipping / Freight fee</span>
                        <span>{fmt(po.shipping_fee)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-zinc-900 pt-1.5 border-t border-zinc-200">
                        <span>Grand Total</span>
                        <span>{fmt(grandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Receipt Discrepancies — only when something was held aside or short/over */}
            {(() => {
                const discrepancyLines = items
                    .map((it: any) => {
                        const ordered = Number(it.quantity_ordered ?? 0);
                        const received = it.quantity_received != null ? Number(it.quantity_received) : null;
                        const partial = Number(it.partial_box_units ?? 0);
                        const fullBoxes = it.full_boxes_received != null ? Number(it.full_boxes_received) : null;
                        const ppb = Number(it.pieces_per_box ?? 0);
                        const fullBoxUnits = fullBoxes != null && ppb > 0 ? fullBoxes * ppb : null;
                        const delta = received != null ? received - ordered : 0;
                        const hasDiscrepancy = received != null && (partial > 0 || delta !== 0);
                        return {
                            name:      it?.items?.name ?? "—",
                            sku:       it?.items?.sku ?? null,
                            ordered,
                            received,
                            fullBoxes,
                            fullBoxUnits,
                            partial,
                            reason:    it.partial_box_reason as string | null,
                            note:      it.partial_box_note as string | null,
                            overageAck: !!it.overage_acknowledged,
                            delta,
                            hasDiscrepancy,
                        };
                    })
                    .filter((d) => d.hasDiscrepancy);

                if (discrepancyLines.length === 0) return null;

                const totalLooseUnits = discrepancyLines.reduce((s, d) => s + d.partial, 0);

                return (
                    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <h2 className="text-sm font-semibold text-amber-900">
                                Receipt Discrepancies
                            </h2>
                            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-200/70 text-amber-800 text-xs">
                                {discrepancyLines.length}
                            </span>
                            {totalLooseUnits > 0 && (
                                <span className="ml-auto text-xs text-amber-800">
                                    <span className="font-semibold">{totalLooseUnits.toLocaleString()}</span> loose pcs held aside (not in stock)
                                </span>
                            )}
                        </div>
                        <div className="divide-y divide-amber-50">
                            {discrepancyLines.map((d, idx) => (
                                <div key={idx} className="px-6 py-3.5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-zinc-900">{d.name}</p>
                                            {d.sku && <p className="text-xs text-zinc-400">{d.sku}</p>}
                                        </div>
                                        <div className="text-right text-xs tabular-nums shrink-0">
                                            <p className="text-zinc-500">
                                                Ordered <span className="font-semibold text-zinc-700">{d.ordered.toLocaleString()}</span>
                                                {" · "}
                                                Received <span className="font-semibold text-zinc-700">{d.received?.toLocaleString() ?? "—"}</span>
                                            </p>
                                            <p className="text-zinc-500 mt-0.5">
                                                In stock <span className="font-semibold text-green-700">{d.fullBoxUnits?.toLocaleString() ?? "—"}</span>
                                                {d.fullBoxes != null && (
                                                    <span className="text-zinc-400"> ({d.fullBoxes} full {d.fullBoxes === 1 ? "box" : "boxes"})</span>
                                                )}
                                            </p>
                                            {d.partial > 0 && (
                                                <p className="text-amber-700 mt-0.5">
                                                    Held aside <span className="font-semibold">{d.partial.toLocaleString()}</span> loose pcs
                                                </p>
                                            )}
                                            {d.delta !== 0 && (
                                                <p className={d.delta < 0 ? "text-red-600 mt-0.5" : "text-amber-600 mt-0.5"}>
                                                    {d.delta > 0 ? "+" : ""}{d.delta.toLocaleString()} vs ordered
                                                    {d.delta > 0 && d.overageAck && " (overage acknowledged)"}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {(d.reason || d.note) && (
                                        <div className="mt-2 rounded-md border border-amber-100 bg-amber-50/60 px-3 py-2">
                                            {d.reason && (
                                                <p className="text-xs text-amber-900">
                                                    <span className="font-semibold">Reason:</span>{" "}
                                                    {PARTIAL_REASON_LABEL[d.reason] ?? d.reason}
                                                </p>
                                            )}
                                            {d.note && (
                                                <p className="text-xs text-amber-800 mt-0.5 italic">
                                                    "{d.note}"
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-3 bg-amber-50/60 border-t border-amber-100 text-[11px] text-amber-800">
                            Loose pcs are recorded against the PO line and logged as a <code className="font-mono bg-amber-100/70 px-1 rounded">discrepancy</code> entry in the inventory log, but are <strong>not</strong> added to warehouse stock.
                        </div>
                    </div>
                );
            })()}

            {/* Notes */}
            {po.notes && (() => {
                // Show plain notes only — hide if notes is the items JSON blob
                try {
                    const parsed = JSON.parse(po.notes);
                    if (parsed?.items) return null; // stored as JSON, not for display
                } catch { /* fall through */ }
                return (
                    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
                        <h2 className="text-sm font-semibold text-zinc-700 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-zinc-400" /> Notes
                        </h2>
                        <p className="text-sm text-zinc-600 whitespace-pre-wrap">{po.notes}</p>
                    </div>
                );
            })()}

            {/* Pallets — only shown when received and pallets exist */}
            {status === "received" && pallets.length > 0 && (
                <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-zinc-400" />
                        <h2 className="text-sm font-semibold text-zinc-700">Pallets</h2>
                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-xs">
                            {pallets.length}
                        </span>
                    </div>
                    <div className="divide-y divide-zinc-100">
                        {pallets.map((pallet) => (
                            <Link
                                key={pallet.id}
                                href={`/super-admin/warehouse/${po.warehouse.id}/pallets/${pallet.id}`}
                                className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-indigo-100 transition-colors">
                                        <Layers className="h-4 w-4 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                                    </div>
                                    <div>
                                        <p className="font-mono text-sm font-semibold text-zinc-900">
                                            {pallet.pallet_label}
                                        </p>
                                        <p className="text-xs text-zinc-400">
                                            {pallet.total_boxes ?? 0} boxes
                                            {pallet.received_at
                                                ? ` · received ${format(new Date(pallet.received_at), "MMM d, yyyy")}`
                                                : ""}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-indigo-400 transition-colors" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Danger zone — only for draft */}
            {status === "draft" && (
                <div className="flex justify-end pb-8">
                    <button
                        onClick={handleDelete}
                        disabled={deletePO.isPending}
                        className="px-4 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        Delete Draft
                    </button>
                </div>
            )}
        </div>
    );
}