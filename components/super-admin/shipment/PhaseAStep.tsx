"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type POItem = {
    id: string;
    item_id: number;
    quantity_ordered: number;
    quantity_received: number | null;
    pieces_per_box: number;
    cbm: number | null;
    cartons: number | null;
    items: {
        name: string;
        short_label: string | null;
        sku: string | null;
    } | null;
};

type POForPhaseA = {
    id: string;
    po_number: string;
    supplier_name: string | null;
    expected_arrival: string | null;
    purchase_order_items: POItem[];
};

// ─── Zod schema ────────────────────────────────────────────────────────────

const phaseASchema = z.object({
    actualArrivalDate: z.string().min(1, "Arrival date is required"),
    notes:             z.string().optional(),
    lineItems: z.array(
        z.object({
            item_id:           z.number(),
            po_item_id:        z.string(),
            quantity_ordered:  z.number(),
            pieces_per_box:    z.number(),
            quantity_received: z
                .number({ invalid_type_error: "Required" })
                .min(0, "Cannot be negative"),
        })
    ),
});

export type PhaseAData = z.infer<typeof phaseASchema>;

// ─── Component ─────────────────────────────────────────────────────────────

interface PhaseAStepProps {
    po: POForPhaseA;
    onSubmit: (data: PhaseAData) => void;
    isLoading: boolean;
}

export function PhaseAStep({ po, onSubmit, isLoading }: PhaseAStepProps) {
    const [discrepancyOpen, setDiscrepancyOpen] = useState(false);

    const items = po.purchase_order_items ?? [];
    const totalUnitsOrdered = items.reduce((s, i) => s + (i.quantity_ordered ?? 0), 0);

    const { register, handleSubmit, watch, control, formState: { errors } } =
        useForm<PhaseAData>({
            resolver: zodResolver(phaseASchema),
            defaultValues: {
                actualArrivalDate: format(new Date(), "yyyy-MM-dd"),
                notes:             "",
                lineItems: items.map((item) => ({
                    item_id:           item.item_id,
                    po_item_id:        item.id,
                    quantity_ordered:  item.quantity_ordered,
                    pieces_per_box:    item.pieces_per_box,
                    // Default to ordered qty — super admin adjusts if different
                    quantity_received: item.quantity_ordered,
                })),
            },
        });

    const { fields } = useFieldArray({ control, name: "lineItems" });
    const watchedLines = watch("lineItems");

    // ── Discrepancy calculations ───────────────────────────────────────────
    const discrepancies = watchedLines
        .map((line, i) => ({
            name:      items[i]?.items?.short_label ?? items[i]?.items?.name ?? "—",
            ordered:   line.quantity_ordered,
            received:  line.quantity_received,
            delta:     (line.quantity_received ?? 0) - line.quantity_ordered,
        }))
        .filter((d) => d.delta !== 0);

    const allMatch        = discrepancies.length === 0;
    const totalReceived   = watchedLines.reduce((s, l) => s + (l.quantity_received ?? 0), 0);

    // ── Confirm with discrepancy dialog ───────────────────────────────────
    const handleFormSubmit = (data: PhaseAData) => {
        const hasDiscrepancies = data.lineItems.some(
            (l) => l.quantity_received !== l.quantity_ordered
        );

        if (hasDiscrepancies) {
            const confirmed = confirm(
                `${discrepancies.length} item${discrepancies.length !== 1 ? "s have" : " has"} quantity discrepancies:\n\n` +
                discrepancies
                    .map((d) => `• ${d.name}: ordered ${d.ordered}, received ${d.received} (${d.delta > 0 ? "+" : ""}${d.delta})`)
                    .join("\n") +
                "\n\nProceed anyway?"
            );
            if (!confirmed) return;
        }

        onSubmit(data);
    };

    console.log(po)

    return (
        <form id="phase-a-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* ── One-way door warning ── */}
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-amber-900">
                        This step cannot be undone
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700">
                        Confirming receipt will immediately update warehouse stock levels,
                        cost history, and item prices. Make sure quantities are correct before proceeding.
                    </p>
                </div>
            </div>

            {/* ── Summary header ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "PO Number",     value: po.po_number },
                    { label: "Supplier",      value: po.supplier_name ?? "—" },
                    { label: "Expected",      value: po.expected_arrival ? format(new Date(po.expected_arrival), "MMM d, yyyy") : "—" },
                    { label: "Total Ordered", value: totalUnitsOrdered.toLocaleString() + " pcs" },
                ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
                        <p className="text-xs text-zinc-400">{label}</p>
                        <p className="mt-0.5 text-sm font-semibold text-zinc-900 truncate">{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Actual arrival date ── */}
            <div className="max-w-xs space-y-1.5">
                <Label htmlFor="actualArrivalDate" className="text-sm font-medium text-zinc-700">
                    Actual Arrival Date <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="actualArrivalDate"
                    type="date"
                    {...register("actualArrivalDate")}
                    className={errors.actualArrivalDate ? "border-red-400" : ""}
                />
                {errors.actualArrivalDate && (
                    <p className="text-xs text-red-500">{errors.actualArrivalDate.message}</p>
                )}
            </div>

            {/* ── Line item table ── */}
            <div className="overflow-hidden rounded-xl border border-zinc-200">
                <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                    <h2 className="text-sm font-semibold text-zinc-700">
                        Verify Received Quantities
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-400">
                        All fields default to ordered quantities. Adjust if the actual count differs.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-50">
                        <thead className="bg-gray-50">
                        <tr>
                            {["Item", "Ordered", "Pcs/Box", "Cartons Ordered", "Received (pcs)", "Cartons Rcvd", "Discrepancy"].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    {h}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 bg-white">
                        {fields.map((field, idx) => {
                            const item         = items[idx];
                            const received     = watchedLines[idx]?.quantity_received ?? 0;
                            const ordered      = item.quantity_ordered;
                            const delta        = received - ordered;
                            const ppb          = item.pieces_per_box;
                            const cartonsRcvd  = ppb > 0 ? (received / ppb).toFixed(1) : "—";
                            const cartonsOrd   = item.cartons ?? (ppb > 0 ? (ordered / ppb).toFixed(1) : "—");
                            const fieldError   = errors.lineItems?.[idx]?.quantity_received;

                            return (
                                <tr key={field.id} className={cn("transition-colors", delta !== 0 ? "bg-amber-50/40" : "hover:bg-zinc-50/50")}>
                                    {/* Item */}
                                    <td className="px-4 py-3">
                                        <p className="text-sm font-medium text-zinc-900">
                                            {item.items?.short_label ?? item.items?.name ?? "—"}
                                        </p>
                                        {item.items?.sku && (
                                            <p className="text-xs text-zinc-400">{item.items.sku}</p>
                                        )}
                                    </td>
                                    {/* Ordered */}
                                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-700">
                                        {ordered.toLocaleString()}
                                    </td>
                                    {/* Pcs/Box */}
                                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-500">
                                        {ppb}
                                    </td>
                                    {/* Cartons ordered */}
                                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-500">
                                        {cartonsOrd}
                                    </td>
                                    {/* Received (editable) */}
                                    <td className="px-4 py-3">
                                        <Controller
                                            control={control}
                                            name={`lineItems.${idx}.quantity_received`}
                                            render={({ field: f }) => (
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    className={cn(
                                                        "w-28 tabular-nums",
                                                        fieldError ? "border-red-400" : "",
                                                        delta !== 0 ? "border-amber-300 bg-amber-50" : ""
                                                    )}
                                                    value={f.value ?? ""}
                                                    onChange={(e) =>
                                                        f.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                                                    }
                                                    onKeyDown={(e) => {
                                                        // Tab to next row's input
                                                        if (e.key === "Tab" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            const next = document.querySelector<HTMLInputElement>(
                                                                `[name="lineItems.${idx + 1}.quantity_received"]`
                                                            );
                                                            next?.focus();
                                                        }
                                                    }}
                                                />
                                            )}
                                        />
                                        {fieldError && (
                                            <p className="mt-0.5 text-xs text-red-500">{fieldError.message}</p>
                                        )}
                                    </td>
                                    {/* Cartons received */}
                                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-500">
                                        {cartonsRcvd}
                                    </td>
                                    {/* Discrepancy */}
                                    <td className="px-4 py-3">
                                        {delta === 0 ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                                        ) : (
                                            <span className={cn(
                                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                                delta < 0
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-amber-100 text-amber-700"
                                            )}>
                                                    {delta > 0 ? "+" : ""}{delta.toLocaleString()}
                                                </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                {/* Summary row */}
                <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                    <span className="text-xs text-zinc-500">
                        Total received: <span className="font-semibold text-zinc-900">{totalReceived.toLocaleString()} pcs</span>
                    </span>
                    {allMatch ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            All quantities match
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setDiscrepancyOpen((o) => !o)}
                            className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-800"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {discrepancies.length} discrepancy{discrepancies.length !== 1 ? "ies" : ""}
                            {discrepancyOpen
                                ? <ChevronUp className="h-3 w-3" />
                                : <ChevronDown className="h-3 w-3" />}
                        </button>
                    )}
                </div>

                {/* Discrepancy summary panel */}
                {discrepancyOpen && discrepancies.length > 0 && (
                    <div className="border-t border-amber-100 bg-amber-50/60 px-4 py-3 space-y-1">
                        {discrepancies.map((d, i) => (
                            <div key={i} className="flex items-center justify-between text-xs text-amber-800">
                                <span className="font-medium">{d.name}</span>
                                <span>
                                    ordered {d.ordered.toLocaleString()}
                                    <span className={cn("ml-1.5 font-semibold", d.delta < 0 ? "text-red-600" : "text-amber-600")}>
                                        ({d.delta > 0 ? "+" : ""}{d.delta})
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Notes ── */}
            <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm font-medium text-zinc-700">
                    Notes <span className="font-normal text-zinc-400">(optional)</span>
                </Label>
                <textarea
                    id="notes"
                    rows={2}
                    {...register("notes")}
                    placeholder="e.g. One carton of Paper Cups arrived damaged, excluded from count"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
            </div>
        </form>
    );
}