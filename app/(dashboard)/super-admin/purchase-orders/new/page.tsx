"use client";

// app/(dashboard)/super-admin/purchase-orders/new/page.tsx
//
// Step 2: New PO form — mirrors Carton Calculator logic with live recalculation.

import { useState, useCallback, useEffect } from "react";
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
// Types for form state
// ---------------------------------------------------------------------------

interface LineFormState {
    _key: string; // stable React key, not sent to DB
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
// Small numeric input helper — consistent styling
// ---------------------------------------------------------------------------

function NumInput({
    value,
    onChange,
    placeholder,
    prefix,
    className = "",
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    prefix?: string;
    className?: string;
}) {
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
                placeholder={placeholder}
                className={`w-full rounded-md border border-gray-200 py-2 text-right text-sm focus:border-indigo-500 focus:outline-none ${prefix ? "pl-6 pr-3" : "px-3"}`}
            />
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

    // ── Header / fees state ──────────────────────────────────────────────────
    const [poNumber, setPoNumber] = useState("");
    const [supplierName, setSupplierName] = useState("");
    const [orderDate, setOrderDate] = useState("");
    const [expectedArrival, setExpectedArrival] = useState("");
    const [officeFee, setOfficeFee] = useState("0");
    const [shippingFee, setShippingFee] = useState("0");
    const [notes, setNotes] = useState("");

    // ── Line items ───────────────────────────────────────────────────────────
    const [lines, setLines] = useState<LineFormState[]>([emptyLine()]);

    // ── Live calculations ────────────────────────────────────────────────────
    // Re-run every time any input changes — pure function, instant
    const validInputs = lines.map(lineToInput).filter(Boolean) as POLineInput[];

    const { lines: calcLines, totals } = calculatePOLines(
        validInputs,
        parseFloat(officeFee) || 0,
        parseFloat(shippingFee) || 0,
    );

    // Map calc results back by index position (only valid lines have results)
    // Build a lookup: item_id → calculated line
    const calcByItemId = Object.fromEntries(
        calcLines.map((l) => [String(l.item_id), l]),
    );

    // ── Line helpers ─────────────────────────────────────────────────────────

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

    // Items already in the form (prevent duplicate selection)
    const usedItemIds = new Set(lines.map((l) => l.item_id).filter(Boolean));

    // ── Pre-fill cbm_per_carton when item is selected ────────────────────────
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
                    // cbm_per_carton pre-fill when item has it (Task 1.21)
                    cbm: (item as any)?.cbm_per_carton
                        ? String((item as any).cbm_per_carton)
                        : l.cbm,
                };
            }),
        );
    }

    // ── Submit ───────────────────────────────────────────────────────────────

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

        // Attach calculated values to each line for storage
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

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-6">
            {/* ── Back + title ─────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="rounded-lg p-1.5 text-zinc-400 hover"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-semibold">
                    New Purchase Order
                </h1>
            </div>

            {/* ── Shared fees (top — affect all line calculations) ── */}
            <section className="rounded-xl border border-gray-200 p-6">
                <h2 className="mb-4 text-sm font-semibold">
                    Order Details &amp; Shared Fees
                </h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">
                            PO Number *
                        </label>
                        <input
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            placeholder="PO-2026-001"
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">
                            Supplier
                        </label>
                        <input
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            placeholder="Supplier name"
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">
                            Order Date
                        </label>
                        <input
                            type="date"
                            value={orderDate}
                            onChange={(e) => setOrderDate(e.target.value)}
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">
                            Expected Arrival
                        </label>
                        <input
                            type="date"
                            value={expectedArrival}
                            onChange={(e) => setExpectedArrival(e.target.value)}
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                    </div>

                    {/* Office fee — updates all line allocations instantly */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">
                            Office / Agent Fee ($)
                        </label>
                        <NumInput
                            value={officeFee}
                            onChange={setOfficeFee}
                            placeholder="5400"
                            prefix="$"
                        />
                    </div>

                    {/* Shipping fee — same */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-zinc-400">
                            Shipping Fee ($)
                        </label>
                        <NumInput
                            value={shippingFee}
                            onChange={setShippingFee}
                            placeholder="37500"
                            prefix="$"
                        />
                    </div>
                </div>

                {/* Fee allocation hint */}
                {(parseFloat(officeFee) > 0 || parseFloat(shippingFee) > 0) && (
                    <p className="mt-3 text-xs text-zinc-500">
                        Total fees:{" "}
                        <span className="text-zinc-900">
                            {fmtMoney(
                                (parseFloat(officeFee) || 0) +
                                    (parseFloat(shippingFee) || 0),
                            )}
                        </span>{" "}
                        — allocated proportionally by CBM across all line items
                    </p>
                )}
            </section>

            {/* ── Line items ───────────────────────────────────────── */}
            <section className="rounded-xl border border-gray-200 p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">
                        Line Items
                    </h2>
                    <button
                        onClick={addLine}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-900"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add item
                    </button>
                </div>

                {/* Column headers */}
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
                    {lines.map((line, idx) => {
                        const calc = calcByItemId[line.item_id];
                        const hasCalc = !!calc;

                        return (
                            <div
                                key={line._key}
                                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] items-center gap-2"
                            >
                                {/* Item selector */}
                                <select
                                    value={line.item_id}
                                    onChange={(e) =>
                                        handleItemSelect(
                                            line._key,
                                            e.target.value,
                                        )
                                    }
                                    className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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

                                {/* Quantity */}
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
                                />

                                {/* Unit price before fees */}
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

                                {/* Pieces per carton */}
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
                                />

                                {/* CBM */}
                                <NumInput
                                    value={line.cbm}
                                    onChange={(v) =>
                                        updateLine(line._key, "cbm", v)
                                    }
                                    placeholder="0.00"
                                />

                                {/* Landed cost — read-only calculated value */}
                                <div className="rounded-md border border-gray-200 px-3 py-2 text-right text-sm">
                                    {hasCalc ? (
                                        <span className="font-medium text-emerald-400">
                                            {fmtUnitCost(calc.unit_cost_after)}
                                        </span>
                                    ) : (
                                        <span className="text-zinc-600">—</span>
                                    )}
                                </div>

                                {/* Remove */}
                                <button
                                    onClick={() => removeLine(line._key)}
                                    disabled={lines.length === 1}
                                    className="rounded p-1.5 text-zinc-600 hover:text-red-400 disabled:opacity-30"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* CBM warning — fee allocation requires CBM values */}
                {(parseFloat(officeFee) > 0 || parseFloat(shippingFee) > 0) &&
                    validInputs.some((l) => !l.cbm) && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-800/40 px-3 py-2">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                            <p className="text-xs text-amber-500">
                                Some items are missing CBM values — fee
                                allocation will be skipped for those lines
                            </p>
                        </div>
                    )}
            </section>

            {/* ── Totals summary ───────────────────────────────────── */}
            {validInputs.length > 0 && (
                <section className="rounded-xl border border-gray-200 p-6">
                    <h2 className="mb-4 text-sm font-semibold">
                        Order Summary
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg bg-gray-200 px-4 py-3">
                            <p className="text-xs text-zinc-500">
                                Subtotal (before fees)
                            </p>
                            <p className="mt-0.5 text-lg font-semibold">
                                {fmtMoney(totals.subtotal_before)}
                            </p>
                        </div>
                        <div className="rounded-lg bg-gray-200 px-4 py-3">
                            <p className="text-xs text-zinc-500">Total Fees</p>
                            <p className="mt-0.5 text-lg font-semibold">
                                {fmtMoney(
                                    (parseFloat(officeFee) || 0) +
                                        (parseFloat(shippingFee) || 0),
                                )}
                            </p>
                        </div>
                        <div className="rounded-lg bg-gray-200 px-4 py-3">
                            <p className="text-xs text-zinc-500">Total CBM</p>
                            <p className="mt-0.5 text-lg font-semibold">
                                {totals.total_cbm.toFixed(2)} m³
                            </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 px-4 py-3">
                            <p className="text-xs text-emerald-400">
                                Grand Total (landed)
                            </p>
                            <p className="mt-0.5 text-lg font-semibold text-emerald-300">
                                {fmtMoney(totals.grand_total_after)}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Notes ────────────────────────────────────────────── */}
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">
                    Notes (optional)
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any additional notes about this order…"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />
            </div>

            {/* ── Action buttons ───────────────────────────────────── */}
            <div className="flex justify-end gap-3 pb-8">
                <button
                    onClick={() => router.back()}
                    className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-zinc-300"
                >
                    Cancel
                </button>
                <button
                    onClick={() => handleSubmit("draft")}
                    disabled={createPO.isPending}
                    className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-zinc-200 disabled:opacity-50"
                >
                    Save Draft
                </button>
                <button
                    onClick={() => handleSubmit("submit")}
                    disabled={createPO.isPending}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50"
                >
                    {createPO.isPending ? "Saving…" : "Submit PO"}
                </button>
            </div>
        </div>
    );
}
