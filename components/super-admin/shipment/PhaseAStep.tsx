"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Package,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

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

const PARTIAL_REASONS = [
    { value: "damaged_in_transit",       label: "Damaged in transit" },
    { value: "supplier_short_pack",      label: "Supplier short-pack" },
    { value: "miscount_pending_recount", label: "Miscount — pending recount" },
    { value: "sample_pulled_qc",         label: "Sample pulled for QC" },
    { value: "other",                    label: "Other (explain in note)" },
] as const;

export type PartialBoxReason = typeof PARTIAL_REASONS[number]["value"];

// ─── Zod schema ────────────────────────────────────────────────────────────

const phaseASchema = z
    .object({
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
                    .int("Whole pcs only")
                    .min(0, "Cannot be negative"),
                partial_box_reason: z
                    .enum([
                        "damaged_in_transit",
                        "supplier_short_pack",
                        "miscount_pending_recount",
                        "sample_pulled_qc",
                        "other",
                    ])
                    .nullable()
                    .optional(),
                partial_box_note:    z.string().optional(),
                overage_acknowledged: z.boolean().optional(),
            }),
        ),
    })
    .superRefine((data, ctx) => {
        data.lineItems.forEach((line, idx) => {
            const ppb = line.pieces_per_box;
            const received = line.quantity_received ?? 0;

            if (ppb > 1 && received > 0) {
                const partial = received % ppb;
                if (partial > 0 && !line.partial_box_reason) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: [`lineItems`, idx, `partial_box_reason`],
                        message: "Reason required for partial box",
                    });
                }
            }

            if (received > line.quantity_ordered && !line.overage_acknowledged) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [`lineItems`, idx, `overage_acknowledged`],
                    message: "Overage must be acknowledged",
                });
            }
        });
    });

export type PhaseAData = z.infer<typeof phaseASchema>;

// ─── Component ─────────────────────────────────────────────────────────────

interface PhaseAStepProps {
    po: POForPhaseA;
    onSubmit: (data: PhaseAData) => void;
    isLoading: boolean;
}

export function PhaseAStep({ po, onSubmit }: PhaseAStepProps) {
    const [discrepancyOpen, setDiscrepancyOpen] = useState(false);

    const items = po.purchase_order_items ?? [];
    const totalUnitsOrdered = items.reduce(
        (s, i) => s + (i.quantity_ordered ?? 0),
        0,
    );

    const { register, handleSubmit, watch, control, formState: { errors } } =
        useForm<PhaseAData>({
            resolver: zodResolver(phaseASchema),
            defaultValues: {
                actualArrivalDate: format(new Date(), "yyyy-MM-dd"),
                notes:             "",
                lineItems: items.map((item) => ({
                    item_id:             item.item_id,
                    po_item_id:          item.id,
                    quantity_ordered:    item.quantity_ordered,
                    pieces_per_box:      item.pieces_per_box,
                    // Default to ordered qty — super admin adjusts if different
                    quantity_received:   item.quantity_ordered,
                    partial_box_reason:  null,
                    partial_box_note:    "",
                    overage_acknowledged: false,
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

    const allMatch      = discrepancies.length === 0;
    const totalReceived = watchedLines.reduce(
        (s, l) => s + (l.quantity_received ?? 0),
        0,
    );

    const handleFormSubmit = (data: PhaseAData) => {
        // Confirm prompt for non-zero deltas (preserves existing UX)
        const hasDiscrepancies = data.lineItems.some(
            (l) => l.quantity_received !== l.quantity_ordered,
        );

        if (hasDiscrepancies) {
            const confirmed = confirm(
                `${discrepancies.length} item${discrepancies.length !== 1 ? "s have" : " has"} quantity discrepancies:\n\n` +
                discrepancies
                    .map((d) =>
                        `• ${d.name}: ordered ${d.ordered}, received ${d.received} (${d.delta > 0 ? "+" : ""}${d.delta})`,
                    )
                    .join("\n") +
                "\n\nProceed anyway?",
            );
            if (!confirmed) return;
        }

        onSubmit(data);
    };

    const onInvalid = () => {
        toast.error(
            "Some lines need attention — fill in a partial-box reason and/or acknowledge overages before continuing.",
        );
    };

    return (
        <form
            id="phase-a-form"
            onSubmit={handleSubmit(handleFormSubmit, onInvalid)}
            className="space-y-6"
        >
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
                        Boxes assigned to pallets must be whole. If you got loose pieces inside a box (damage, short-pack, QC pull), record the reason below.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-50">
                        <thead className="bg-gray-50">
                        <tr>
                            {["Item", "Ordered", "Pcs/Box", "Cartons Ordered", "Received (pcs)", "Full / Loose", "Discrepancy"].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    {h}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 bg-white">
                        {fields.map((field, idx) => {
                            const item        = items[idx];
                            const received    = watchedLines[idx]?.quantity_received ?? 0;
                            const ordered     = item.quantity_ordered;
                            const delta       = received - ordered;
                            const ppb         = item.pieces_per_box;
                            const fullBoxes   = ppb > 0 ? Math.floor(received / ppb) : received;
                            const looseUnits  = ppb > 1 ? received % ppb : 0;
                            const cartonsOrd  = item.cartons ?? (ppb > 0 ? (ordered / ppb).toFixed(2) : "—");
                            const fieldError  = errors.lineItems?.[idx]?.quantity_received;
                            const reasonError = errors.lineItems?.[idx]?.partial_box_reason;
                            const overageError = errors.lineItems?.[idx]?.overage_acknowledged;

                            const showPartialReason = ppb > 1 && looseUnits > 0;
                            const showOverage       = received > ordered;

                            return (
                                <tr
                                    key={field.id}
                                    className={cn(
                                        "transition-colors align-top",
                                        delta !== 0 ? "bg-amber-50/40" : "hover:bg-zinc-50/50",
                                    )}
                                >
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
                                    {/* Received (editable) + partial-box UX */}
                                    <td className="px-4 py-3 space-y-2">
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
                                                        delta !== 0 ? "border-amber-300 bg-amber-50" : "",
                                                    )}
                                                    value={f.value ?? ""}
                                                    onChange={(e) =>
                                                        f.onChange(
                                                            e.target.value === ""
                                                                ? undefined
                                                                : Number(e.target.value),
                                                        )
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Tab" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            const next = document.querySelector<HTMLInputElement>(
                                                                `[name="lineItems.${idx + 1}.quantity_received"]`,
                                                            );
                                                            next?.focus();
                                                        }
                                                    }}
                                                />
                                            )}
                                        />
                                        {fieldError && (
                                            <p className="text-xs text-red-500">
                                                {fieldError.message}
                                            </p>
                                        )}

                                        {showPartialReason && (
                                            <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50/60 p-2">
                                                <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                                                    <Package className="h-3 w-3" />
                                                    Partial box: {looseUnits.toLocaleString()} loose pcs
                                                </p>
                                                <Controller
                                                    control={control}
                                                    name={`lineItems.${idx}.partial_box_reason`}
                                                    render={({ field: f }) => (
                                                        <select
                                                            value={f.value ?? ""}
                                                            onChange={(e) =>
                                                                f.onChange(
                                                                    e.target.value === ""
                                                                        ? null
                                                                        : (e.target.value as PartialBoxReason),
                                                                )
                                                            }
                                                            className={cn(
                                                                "w-full rounded border bg-white px-2 py-1 text-xs",
                                                                reasonError
                                                                    ? "border-red-400"
                                                                    : "border-amber-200",
                                                            )}
                                                        >
                                                            <option value="">— Select reason —</option>
                                                            {PARTIAL_REASONS.map((r) => (
                                                                <option key={r.value} value={r.value}>
                                                                    {r.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                />
                                                {reasonError && (
                                                    <p className="text-[11px] text-red-500">
                                                        {reasonError.message}
                                                    </p>
                                                )}
                                                <Input
                                                    {...register(`lineItems.${idx}.partial_box_note`)}
                                                    placeholder="Note (optional)"
                                                    className="h-7 text-xs"
                                                />
                                            </div>
                                        )}

                                        {showOverage && (
                                            <label className="flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50/60 p-2 text-[11px] text-red-800">
                                                <input
                                                    type="checkbox"
                                                    {...register(`lineItems.${idx}.overage_acknowledged`)}
                                                    className="mt-0.5 h-3 w-3"
                                                />
                                                <span>
                                                    Overage of <strong>+{(received - ordered).toLocaleString()}</strong> pcs — confirm received more than ordered
                                                </span>
                                            </label>
                                        )}
                                        {overageError && (
                                            <p className="text-[11px] text-red-500">
                                                {overageError.message}
                                            </p>
                                        )}
                                    </td>
                                    {/* Full / Loose split */}
                                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-500">
                                        <p>
                                            <span className="font-semibold text-zinc-900">{fullBoxes}</span>
                                            {" full "}
                                            {fullBoxes === 1 ? "box" : "boxes"}
                                        </p>
                                        {looseUnits > 0 && (
                                            <p className="text-amber-600">
                                                + {looseUnits.toLocaleString()} loose
                                            </p>
                                        )}
                                    </td>
                                    {/* Discrepancy */}
                                    <td className="px-4 py-3">
                                        {delta === 0 ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                                        ) : (
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                                                    delta < 0
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-amber-100 text-amber-700",
                                                )}
                                            >
                                                {delta > 0 ? "+" : ""}
                                                {delta.toLocaleString()}
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
                        Total received:{" "}
                        <span className="font-semibold text-zinc-900">
                            {totalReceived.toLocaleString()} pcs
                        </span>
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
