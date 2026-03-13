"use client";

// app/(dashboard)/super-admin/purchase-orders/new/page.tsx

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Plus, Trash2, ChevronLeft, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import { useWarehouseCatalog } from "@/lib/hooks/queries/useWarehouse";
import { useCreatePurchaseOrder } from "@/lib/hooks/queries/usePurchaseOrders";
import {
    calculatePOLines,
    fmtMoney,
    fmtUnitCost,
    type POLineInput,
} from "@/lib/utils/poCalculations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LineFormState {
    _key: string;
    item_id: string;
    quantity_ordered: string;
    unit_price_before: string;
    pieces_per_carton: string;
    cbm: string;
}

function emptyLine(): LineFormState {
    return {
        _key: crypto.randomUUID(),
        item_id: "",
        quantity_ordered: "",
        unit_price_before: "",
        pieces_per_carton: "",
        cbm: "",
    };
}

function lineToInput(l: LineFormState): POLineInput | null {
    if (!l.item_id || !l.quantity_ordered || !l.unit_price_before) return null;
    return {
        item_id: Number(l.item_id),
        quantity_ordered: parseFloat(l.quantity_ordered) || 0,
        unit_price_before: parseFloat(l.unit_price_before) || 0,
        pieces_per_carton: l.pieces_per_carton
            ? parseInt(l.pieces_per_carton)
            : null,
        cbm: l.cbm ? parseFloat(l.cbm) : null,
    };
}

// ---------------------------------------------------------------------------
// NumInput — with optional preset quick-add dropdown
//
// Props:
//   presets?: number[]  — if provided, a dropdown appears on focus showing
//                         each preset. Clicking one ADDS it to the current
//                         value (always accumulates). Dropdown closes when
//                         focus leaves the input area.
// ---------------------------------------------------------------------------

function NumInput({
    value,
    onChange,
    placeholder,
    prefix,
    presets,
    className = "",
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    prefix?: string;
    presets?: number[];
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleFocus() {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        if (presets && presets.length > 0) setOpen(true);
    }

    function handleBlur() {
        // Small delay so onMouseDown on a preset button fires before blur closes the dropdown
        closeTimer.current = setTimeout(() => setOpen(false), 150);
    }

    function handlePresetClick(preset: number) {
        const current = parseFloat(value) || 0;
        onChange(String(current + preset));
        if (closeTimer.current) clearTimeout(closeTimer.current);
        // Keep dropdown open for repeated clicking
    }

    return (
        <div className={`relative ${className}`}>
            {prefix && (
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    {prefix}
                </span>
            )}
            <input
                type="number"
                step="any"
                min="0"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={`w-full rounded-md border border-zinc-200 bg-white py-2 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none ${prefix ? "pl-6 pr-3" : "px-3"}`}
            />

            {/* Preset dropdown */}
            {open && presets && presets.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                    {presets.map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onMouseDown={(e) => {
                                // Prevent blur from firing before click
                                e.preventDefault();
                                handlePresetClick(preset);
                            }}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-indigo-50"
                        >
                            <span className="text-xs text-zinc-400">+</span>
                            <span className="font-medium text-zinc-700">
                                {preset.toLocaleString()}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewPurchaseOrderPage() {
    const router = useRouter();
    const { orgId, userId } = useAuth();
    const { data: catalog = [] } = useWarehouseCatalog();
    const createPO = useCreatePurchaseOrder();

    const [poNumber, setPoNumber] = useState("");
    const [supplierName, setSupplierName] = useState("");
    const [orderDate, setOrderDate] = useState("");
    const [expectedArrival, setExpectedArrival] = useState("");
    const [officeFee, setOfficeFee] = useState("0");
    const [shippingFee, setShippingFee] = useState("0");
    const [notes, setNotes] = useState("");
    const [lines, setLines] = useState<LineFormState[]>([emptyLine()]);

    // Live calculations
    const validInputs = lines.map(lineToInput).filter(Boolean) as POLineInput[];
    const { lines: calcLines, totals } = calculatePOLines(
        validInputs,
        parseFloat(officeFee) || 0,
        parseFloat(shippingFee) || 0,
    );
    const calcByItemId = Object.fromEntries(
        calcLines.map((l) => [String(l.item_id), l]),
    );

    function updateLine(
        key: string,
        field: keyof LineFormState,
        value: string,
    ) {
        setLines((prev) =>
            prev.map((l) => (l._key === key ? { ...l, [field]: value } : l)),
        );
    }

    function addLine() {
        setLines((prev) => [...prev, emptyLine()]);
    }

    function removeLine(key: string) {
        setLines((prev) => prev.filter((l) => l._key !== key));
    }

    const usedItemIds = new Set(lines.map((l) => l.item_id).filter(Boolean));

    function handleItemSelect(key: string, itemId: string) {
        const item = catalog.find((c: any) => String(c.id) === itemId);
        setLines((prev) =>
            prev.map((l) => {
                if (l._key !== key) return l;
                return {
                    ...l,
                    item_id: itemId,
                    pieces_per_carton: item?.box_quantity
                        ? String(item.box_quantity)
                        : l.pieces_per_carton,
                    cbm: (item as any)?.cbm_per_carton
                        ? String((item as any).cbm_per_carton)
                        : l.cbm,
                };
            }),
        );
    }

    async function handleSubmit(action: "draft" | "submit") {
        if (!orgId || !userId) return;

        const validLines = lines
            .map(lineToInput)
            .filter(Boolean) as POLineInput[];

        if (validLines.length === 0) {
            toast.error("Add at least one item");
            return;
        }
        if (!poNumber.trim()) {
            toast.error("PO number is required");
            return;
        }

        const { lines: final } = calculatePOLines(
            validLines,
            parseFloat(officeFee) || 0,
            parseFloat(shippingFee) || 0,
        );

        try {
            const created = await createPO.mutateAsync({
                po: {
                    organization_id: orgId,
                    po_number: poNumber.trim(),
                    supplier_name: supplierName.trim() || null,
                    status: action === "draft" ? "draft" : "submitted",
                    order_date: orderDate || null,
                    expected_arrival: expectedArrival || null,
                    office_fee: parseFloat(officeFee) || 0,
                    shipping_fee: parseFloat(shippingFee) || 0,
                    subtotal_before: totals.subtotal_before,
                    total_cbm: totals.total_cbm || null,
                    notes: notes.trim() || null,
                    created_by: userId,
                },
                items: final.map((l) => ({
                    item_id: l.item_id,
                    quantity_ordered: l.quantity_ordered,
                    unit_price_before: l.unit_price_before,
                    total_price_before: l.total_price_before,
                    pieces_per_carton: l.pieces_per_carton,
                    cartons: l.cartons,
                    cbm: l.cbm,
                    cbm_share: l.cbm_share,
                    allocated_office_fee: l.allocated_office_fee,
                    allocated_shipping_fee: l.allocated_shipping_fee,
                    total_cost_after: l.total_cost_after,
                    unit_cost_after: l.unit_cost_after,
                })),
            });

            toast.success(
                action === "draft" ? "PO saved as draft" : "PO submitted",
            );
            router.push(`/super-admin/purchase-orders/${(created as any).id}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to save PO");
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-semibold text-zinc-900">
                    New Purchase Order
                </h1>
            </div>

            {/* Order Details & Shared Fees */}
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <h2 className="mb-4 text-sm font-semibold text-zinc-900">
                    Order Details &amp; Shared Fees
                </h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500">
                            PO Number *
                        </label>
                        <input
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            placeholder="PO-2026-001"
                            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500">
                            Supplier
                        </label>
                        <input
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            placeholder="Supplier name"
                            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500">
                            Order Date
                        </label>
                        <input
                            type="date"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500">
                            Expected Arrival
                        </label>
                        <input
                            type="date"
                            value={expectedArrival}
                            onChange={(e) => setExpectedArrival(e.target.value)}
                            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500">
                            Office / Agent Fee ($)
                        </label>
                        {/* presets=[1000, 5000, 10000] — click adds to current value */}
                        <NumInput
                            value={officeFee}
                            onChange={setOfficeFee}
                            placeholder="5400"
                            prefix="$"
                            presets={[1000, 5000, 10000]}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-500">
                            Shipping Fee ($)
                        </label>
                        {/* presets=[10000, 25000, 37500] */}
                        <NumInput
                            value={shippingFee}
                            onChange={setShippingFee}
                            placeholder="37500"
                            prefix="$"
                            presets={[10000, 25000, 37500]}
                        />
                    </div>
                </div>

                {(parseFloat(officeFee) > 0 || parseFloat(shippingFee) > 0) && (
                    <p className="mt-3 text-xs text-zinc-500">
                        Total fees:{" "}
                        <span className="font-medium text-zinc-900">
                            {fmtMoney(
                                (parseFloat(officeFee) || 0) +
                                    (parseFloat(shippingFee) || 0),
                            )}
                        </span>{" "}
                        — allocated proportionally by CBM across all line items
                    </p>
                )}
            </section>

            {/* Line Items */}
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-900">
                        Line Items
                    </h2>
                    <button
                        onClick={addLine}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add item
                    </button>
                </div>

                <div className="mb-2 grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <span>Item</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Unit Price</span>
                    <span className="text-right">Pcs/Carton</span>
                    <span className="text-right">CBM</span>
                    <span className="text-right">Landed Cost</span>
                    <span />
                </div>

                <div className="space-y-2">
                    {lines.map((line) => {
                        const calc = calcByItemId[line.item_id];

                        return (
                            <div
                                key={line._key}
                                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] items-center gap-2"
                            >
                                <select
                                    value={line.item_id}
                                    onChange={(e) =>
                                        handleItemSelect(
                                            line._key,
                                            e.target.value,
                                        )
                                    }
                                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none"
                                >
                                    <option value="">Select item…</option>
                                    {catalog.map((item: any) => (
                                        <option
                                            key={item.id}
                                            value={item.id}
                                            disabled={
                                                usedItemIds.has(
                                                    String(item.id),
                                                ) &&
                                                line.item_id !== String(item.id)
                                            }
                                        >
                                            {item.name}
                                            {item.sku ? ` (${item.sku})` : ""}
                                        </option>
                                    ))}
                                </select>

                                {/* Qty — presets for common order sizes */}
                                <NumInput
                                    value={line.quantity_ordered}
                                    onChange={(v) =>
                                        updateLine(
                                            line._key,
                                            "quantity_ordered",
                                            v,
                                        )
                                    }
                                    placeholder="0"
                                    presets={[100, 1000, 10000]}
                                />

                                {/* Unit price — no presets (too item-specific) */}
                                <NumInput
                                    value={line.unit_price_before}
                                    onChange={(v) =>
                                        updateLine(
                                            line._key,
                                            "unit_price_before",
                                            v,
                                        )
                                    }
                                    placeholder="0.09"
                                    prefix="$"
                                />

                                {/* Pcs/carton — no presets */}
                                <NumInput
                                    value={line.pieces_per_carton}
                                    onChange={(v) =>
                                        updateLine(
                                            line._key,
                                            "pieces_per_carton",
                                            v,
                                        )
                                    }
                                    placeholder="—"
                                    presets={[100, 1000, 10000]}
                                />

                                {/* CBM — no presets */}
                                <NumInput
                                    value={line.cbm}
                                    onChange={(v) =>
                                        updateLine(line._key, "cbm", v)
                                    }
                                    placeholder="0.00"
                                />

                                {/* Landed cost — read-only */}
                                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-right text-sm">
                                    {calc ? (
                                        <span className="font-medium text-emerald-600">
                                            {fmtUnitCost(calc.unit_cost_after)}
                                        </span>
                                    ) : (
                                        <span className="text-zinc-400">—</span>
                                    )}
                                </div>

                                <button
                                    onClick={() => removeLine(line._key)}
                                    disabled={lines.length === 1}
                                    className="rounded p-1.5 text-zinc-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {(parseFloat(officeFee) > 0 || parseFloat(shippingFee) > 0) &&
                    validInputs.some((l) => !l.cbm) && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                            <p className="text-xs text-amber-700">
                                Some items are missing CBM values — fee
                                allocation will be skipped for those lines
                            </p>
                        </div>
                    )}
            </section>

            {/* Order Summary */}
            {validInputs.length > 0 && (
                <section className="rounded-xl border border-zinc-200 bg-white p-6">
                    <h2 className="mb-4 text-sm font-semibold text-zinc-900">
                        Order Summary
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg bg-zinc-50 px-4 py-3">
                            <p className="text-xs text-zinc-500">
                                Subtotal (before fees)
                            </p>
                            <p className="mt-0.5 text-lg font-semibold text-zinc-900">
                                {fmtMoney(totals.subtotal_before)}
                            </p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 px-4 py-3">
                            <p className="text-xs text-zinc-500">Total Fees</p>
                            <p className="mt-0.5 text-lg font-semibold text-zinc-900">
                                {fmtMoney(
                                    (parseFloat(officeFee) || 0) +
                                        (parseFloat(shippingFee) || 0),
                                )}
                            </p>
                        </div>
                        <div className="rounded-lg bg-zinc-50 px-4 py-3">
                            <p className="text-xs text-zinc-500">Total CBM</p>
                            <p className="mt-0.5 text-lg font-semibold text-zinc-900">
                                {totals.total_cbm.toFixed(2)} m³
                            </p>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                            <p className="text-xs text-emerald-600">
                                Grand Total (landed)
                            </p>
                            <p className="mt-0.5 text-lg font-semibold text-emerald-700">
                                {fmtMoney(totals.grand_total_after)}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500">
                    Notes (optional)
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any additional notes about this order…"
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none"
                />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pb-8">
                <button
                    onClick={() => router.back()}
                    className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={() => handleSubmit("draft")}
                    disabled={createPO.isPending}
                    className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                    Save Draft
                </button>
                <button
                    onClick={() => handleSubmit("submit")}
                    disabled={createPO.isPending}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                    {createPO.isPending ? "Saving…" : "Submit PO"}
                </button>
            </div>
        </div>
    );
}
