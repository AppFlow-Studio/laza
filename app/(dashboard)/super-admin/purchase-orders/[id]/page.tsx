"use client";

// app/(dashboard)/super-admin/purchase-orders/[id]/page.tsx
//
// Step 3: PO detail — view, edit (if draft), Mark as Received, status timeline.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ChevronLeft, CheckCircle2, Package, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import {
    usePurchaseOrder,
    useUpdatePurchaseOrder,
    useReceivePurchaseOrder,
} from "@/lib/hooks/queries/usePurchaseOrders";
import { fmtMoney, fmtUnitCost } from "@/lib/utils/poCalculations";

// ---------------------------------------------------------------------------
// Status timeline config
// ---------------------------------------------------------------------------

const STATUS_STEPS = [
    { key: "draft", label: "Draft" },
    { key: "submitted", label: "Submitted" },
    { key: "in_transit", label: "In Transit" },
    { key: "arrived", label: "Arrived" },
    { key: "received", label: "Received" },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

function StatusTimeline({ current }: { current: string }) {
    const currentIdx = STATUS_ORDER.indexOf(current);
    const isCancelled = current === "cancelled";

    return (
        <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, idx) => {
                const done = !isCancelled && idx <= currentIdx;
                const active = !isCancelled && idx === currentIdx;
                return (
                    <div key={step.key} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                    active
                                        ? "bg-indigo-600 text-white ring-2 ring-indigo-400/40"
                                        : done
                                          ? "bg-emerald-600 text-white"
                                          : "bg-zinc-700 text-zinc-500"
                                }`}
                            >
                                {done && !active ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                    idx + 1
                                )}
                            </div>
                            <span
                                className={`mt-1 text-xs ${
                                    active
                                        ? "font-medium text-white"
                                        : done
                                          ? "text-zinc-400"
                                          : "text-zinc-600"
                                }`}
                            >
                                {step.label}
                            </span>
                        </div>
                        {idx < STATUS_STEPS.length - 1 && (
                            <div
                                className={`mb-4 h-0.5 w-12 transition-colors ${
                                    !isCancelled && idx < currentIdx
                                        ? "bg-emerald-600"
                                        : "bg-zinc-700"
                                }`}
                            />
                        )}
                    </div>
                );
            })}
            {isCancelled && (
                <span className="ml-4 rounded-full bg-red-900/60 px-2.5 py-0.5 text-xs font-medium text-red-400">
                    Cancelled
                </span>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Receive modal — per-item quantity verification
// ---------------------------------------------------------------------------

interface ReceiveItem {
    po_item_id: string;
    item_id: number;
    item_name: string;
    quantity_ordered: number;
    unit_cost_after: number;
    quantity_received: string; // form field — string for controlled input
}

function ReceiveModal({
    poId,
    items,
    onClose,
}: {
    poId: string;
    items: ReceiveItem[];
    onClose: () => void;
}) {
    const { userId } = useAuth();
    const receivePO = useReceivePurchaseOrder();
    const [quantities, setQuantities] = useState<Record<string, string>>(
        Object.fromEntries(
            items.map((i) => [
                i.po_item_id,
                String(i.quantity_ordered), // default = ordered quantity
            ]),
        ),
    );

    function setQty(poItemId: string, val: string) {
        setQuantities((prev) => ({ ...prev, [poItemId]: val }));
    }

    const hasDiscrepancy = items.some(
        (i) =>
            parseFloat(quantities[i.po_item_id] || "0") !== i.quantity_ordered,
    );

    async function handleConfirm() {
        if (!userId) return;
        try {
            await receivePO.mutateAsync({
                purchaseOrderId: poId,
                userId,
                receivedItems: items.map((i) => ({
                    item_id: i.item_id,
                    quantity_received:
                        parseFloat(quantities[i.po_item_id]) || 0,
                })),
            });
            toast.success("Shipment received — warehouse stock updated");
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to receive shipment");
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
                <div className="border-b border-zinc-800 px-6 py-4">
                    <h2 className="text-base font-semibold text-white">
                        Confirm Received Quantities
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-400">
                        Verify the physical count for each item. Adjust any
                        discrepancies before confirming.
                    </p>
                </div>

                <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
                    {/* Headers */}
                    <div className="mb-2 grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        <span>Item</span>
                        <span className="text-right">Ordered</span>
                        <span className="text-right">Received</span>
                        <span className="text-right">Unit Cost</span>
                    </div>
                    <div className="space-y-2">
                        {items.map((item) => {
                            const received = parseFloat(
                                quantities[item.po_item_id] || "0",
                            );
                            const diff = received - item.quantity_ordered;
                            const hasGap = diff !== 0;
                            return (
                                <div
                                    key={item.po_item_id}
                                    className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-3"
                                >
                                    <span className="text-sm text-white">
                                        {item.item_name}
                                    </span>
                                    <span className="text-right text-sm text-zinc-400">
                                        {item.quantity_ordered}
                                    </span>
                                    <div className="flex flex-col items-end gap-0.5">
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={quantities[item.po_item_id]}
                                            onChange={(e) =>
                                                setQty(
                                                    item.po_item_id,
                                                    e.target.value,
                                                )
                                            }
                                            className={`w-24 rounded-md border py-1.5 text-right text-sm focus:outline-none ${
                                                hasGap
                                                    ? "border-amber-600 bg-amber-950/30 text-amber-300 focus:border-amber-400"
                                                    : "border-zinc-700 bg-zinc-800 text-white focus:border-indigo-500"
                                            }`}
                                        />
                                        {hasGap && (
                                            <span className="text-xs text-amber-400">
                                                {diff > 0 ? "+" : ""}
                                                {diff} vs ordered
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-right text-sm text-zinc-400">
                                        {fmtUnitCost(item.unit_cost_after)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Discrepancy warning */}
                {hasDiscrepancy && (
                    <div className="mx-6 mb-3 flex items-center gap-2 rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                        <p className="text-xs text-amber-300">
                            Some quantities differ from the ordered amounts. The
                            warehouse stock will be updated with your received
                            quantities.
                        </p>
                    </div>
                )}

                <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={receivePO.isPending}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                        {receivePO.isPending
                            ? "Updating warehouse…"
                            : "Confirm Receipt"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Status transition buttons (for draft → submitted → in_transit → arrived)
// ---------------------------------------------------------------------------

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
    draft: { label: "Submit PO", next: "submitted" },
    submitted: { label: "Mark In Transit", next: "in_transit" },
    in_transit: { label: "Mark Arrived", next: "arrived" },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PurchaseOrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { userId } = useAuth();

    const { data: po, isLoading } = usePurchaseOrder(id);
    const updatePO = useUpdatePurchaseOrder();

    const [showReceiveModal, setShowReceiveModal] = useState(false);

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 p-6">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-24 animate-pulse rounded-xl bg-zinc-800"
                    />
                ))}
            </div>
        );
    }

    if (!po) {
        return (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
                <Package className="h-8 w-8 text-zinc-600" />
                <p className="text-sm text-zinc-400">
                    Purchase order not found
                </p>
            </div>
        );
    }

    const items: ReceiveItem[] = (po.purchase_order_items ?? []).map(
        (i: any) => ({
            po_item_id: i.id,
            item_id: i.item_id,
            item_name: i.items?.name ?? `Item ${i.item_id}`,
            quantity_ordered: i.quantity_ordered,
            unit_cost_after: i.unit_cost_after,
            quantity_received: String(i.quantity_ordered),
        }),
    );

    const nextStatusCfg = NEXT_STATUS[po.status];
    const canReceive = po.status === "arrived";
    const isDraft = po.status === "draft";

    async function handleStatusAdvance() {
        if (!nextStatusCfg) return;
        try {
            await updatePO.mutateAsync({
                id: po?.id || "",
                updates: { status: nextStatusCfg.next },
            });
            toast.success(`Status updated to ${nextStatusCfg.next}`);
        } catch {
            toast.error("Failed to update status");
        }
    }

    // Grand total from line items
    const grandTotal = items.reduce(
        (sum, i) => sum + i.unit_cost_after * i.quantity_ordered,
        0,
    );

    return (
        <div className="mx-auto max-w-4xl space-y-8 p-6">
            {/* ── Back + header ─────────────────────────────────────── */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() =>
                            router.push("/super-admin/purchase-orders")
                        }
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-white">
                            {po.po_number}
                        </h1>
                        {po.supplier_name && (
                            <p className="text-sm text-zinc-400">
                                {po.supplier_name}
                            </p>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    {nextStatusCfg && (
                        <button
                            onClick={handleStatusAdvance}
                            disabled={updatePO.isPending}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                            {nextStatusCfg.label}
                        </button>
                    )}
                    {canReceive && (
                        <button
                            onClick={() => setShowReceiveModal(true)}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                        >
                            Mark as Received
                        </button>
                    )}
                    {isDraft && (
                        <button
                            onClick={() =>
                                router.push(
                                    `/super-admin/purchase-orders/${po.id}/edit`,
                                )
                            }
                            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
                        >
                            Edit PO
                        </button>
                    )}
                </div>
            </div>

            {/* ── Status timeline ───────────────────────────────────── */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <StatusTimeline current={po.status} />
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-zinc-500 sm:grid-cols-4">
                    {po.order_date && (
                        <div>
                            <span className="block text-zinc-400">
                                Order Date
                            </span>
                            {new Date(po.order_date).toLocaleDateString(
                                "en-US",
                                {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                },
                            )}
                        </div>
                    )}
                    {po.expected_arrival && (
                        <div>
                            <span className="block text-zinc-400">
                                Expected Arrival
                            </span>
                            {new Date(po.expected_arrival).toLocaleDateString(
                                "en-US",
                                {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                },
                            )}
                        </div>
                    )}
                    {po.actual_arrival && (
                        <div>
                            <span className="block text-zinc-400">
                                Actual Arrival
                            </span>
                            {new Date(po.actual_arrival).toLocaleDateString(
                                "en-US",
                                {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                },
                            )}
                        </div>
                    )}
                    {po.total_pallets && (
                        <div>
                            <span className="block text-zinc-400">Pallets</span>
                            {po.total_pallets}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Cost summary cards ────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <p className="text-xs text-zinc-500">
                        Subtotal (before fees)
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-white">
                        {fmtMoney(po.subtotal_before ?? 0)}
                    </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <p className="text-xs text-zinc-500">Office Fee</p>
                    <p className="mt-0.5 text-base font-semibold text-white">
                        {fmtMoney(po.office_fee ?? 0)}
                    </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <p className="text-xs text-zinc-500">Shipping Fee</p>
                    <p className="mt-0.5 text-base font-semibold text-white">
                        {fmtMoney(po.shipping_fee ?? 0)}
                    </p>
                </div>
                <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-4 py-3">
                    <p className="text-xs text-emerald-400">
                        Grand Total (landed)
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-emerald-300">
                        {fmtMoney(grandTotal)}
                    </p>
                </div>
            </div>

            {/* ── Line items table ──────────────────────────────────── */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
                <div className="border-b border-zinc-800 px-5 py-3">
                    <h2 className="text-sm font-semibold text-white">
                        Line Items
                    </h2>
                </div>
                {/* Column headers */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 border-b border-zinc-800 px-5 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <span>Item</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit (before)</span>
                    <span className="text-right">CBM</span>
                    <span className="text-right">Total (before)</span>
                    <span className="text-right">Landed Cost / unit</span>
                </div>
                <div className="divide-y divide-zinc-800/60">
                    {(po.purchase_order_items ?? []).map((item: any) => (
                        <div
                            key={item.id}
                            className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 items-center px-5 py-3"
                        >
                            <div>
                                <p className="text-sm font-medium text-white">
                                    {item.items?.name ?? `Item ${item.item_id}`}
                                </p>
                                {item.items?.sku && (
                                    <p className="text-xs text-zinc-500">
                                        {item.items.sku}
                                    </p>
                                )}
                            </div>
                            <span className="text-right text-sm text-zinc-300">
                                {item.quantity_ordered}
                            </span>
                            <span className="text-right text-sm text-zinc-300">
                                {fmtUnitCost(item.unit_price_before)}
                            </span>
                            <span className="text-right text-sm text-zinc-400">
                                {item.cbm ?? "—"}
                            </span>
                            <span className="text-right text-sm text-zinc-300">
                                {fmtMoney(item.total_price_before)}
                            </span>
                            <span className="text-right text-sm font-medium text-emerald-400">
                                {fmtUnitCost(item.unit_cost_after)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Notes ────────────────────────────────────────────── */}
            {po.notes && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Notes
                    </h2>
                    <p className="text-sm text-zinc-300">{po.notes}</p>
                </div>
            )}

            {/* ── Receive modal ─────────────────────────────────────── */}
            {showReceiveModal && (
                <ReceiveModal
                    poId={po.id}
                    items={items}
                    onClose={() => setShowReceiveModal(false)}
                />
            )}
        </div>
    );
}
