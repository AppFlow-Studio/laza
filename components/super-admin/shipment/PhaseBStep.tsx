"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWarehouseStorageSpaces } from "@/lib/hooks/queries/useReceiving";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { PhaseAData } from "./PhaseAStep";

// ─── Types ─────────────────────────────────────────────────────────────────

type POItem = {
    id: string;
    item_id: number;
    quantity_ordered: number;
    pieces_per_box: number;
    items: { name: string; short_label: string | null; sku: string | null } | null;
};

type POForPhaseB = {
    id: string;
    po_number: string;
    purchase_order_items: POItem[];
};

// ─── Zod schema ────────────────────────────────────────────────────────────

const phaseBSchema = z.object({
    pallets: z.array(
        z.object({
            pallet_label:     z.string().min(1, "Label required"),
            storage_space_id: z.string().min(1, "Storage space required"),
            items: z.array(
                z.object({
                    item_id:                 z.number(),
                    purchase_order_item_id:  z.string(),
                    item_name:               z.string(),
                    box_count:               z
                        .number({ invalid_type_error: "Required" })
                        .int("Whole boxes only")
                        .min(0, "Cannot be negative"),
                    max_boxes:               z.number(),
                    pieces_per_box:          z.number(),
                    pieces_per_box_override: z.number().nullable().optional(),
                })
            ).min(1, "Add at least one item"),
        })
    ).min(1, "Add at least one pallet"),
});

export type PhaseBData = z.infer<typeof phaseBSchema>;

// ─── Helper — build initial pallet with all items ──────────────────────────

function buildDefaultPallet(po: POForPhaseB, phaseAData: PhaseAData, palletIndex: number) {
    const poNumber = po.po_number.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return {
        pallet_label:     `${poNumber}-P${String(palletIndex + 1).padStart(3, "0")}`,
        storage_space_id: "",
        items: phaseAData.lineItems.map((li) => {
            const poItem = po.purchase_order_items.find((i) => i.item_id === li.item_id);
            const ppb    = li.pieces_per_box;
            const maxBoxes = ppb > 0 ? Math.floor(li.quantity_received / ppb) : 0;
            return {
                item_id:                li.item_id,
                purchase_order_item_id: li.po_item_id,
                item_name:              poItem?.items?.short_label ?? poItem?.items?.name ?? "—",
                box_count:              maxBoxes,
                max_boxes:              maxBoxes,
                pieces_per_box:         ppb,
                pieces_per_box_override: null,
            };
        }).filter((i) => i.max_boxes > 0), // only include items with boxes
    };
}

// ─── Unassigned panel ─────────────────────────────────────────────────────

function UnassignedPanel({
    phaseAData,
    watchedPallets,
    poItems,
}: {
    phaseAData: PhaseAData;
    watchedPallets: PhaseBData["pallets"];
    poItems: POItem[];
}) {
    const rows = phaseAData.lineItems.map((li) => {
        const poItem      = poItems.find((i) => i.item_id === li.item_id);
        const ppb         = li.pieces_per_box;
        const totalBoxes  = ppb > 0 ? Math.floor(li.quantity_received / ppb) : 0;
        const assigned    = watchedPallets.reduce((sum, p) => {
            const match = p.items.find((i) => i.item_id === li.item_id);
            return sum + (match?.box_count ?? 0);
        }, 0);
        const remaining   = totalBoxes - assigned;
        return {
            name:      poItem?.items?.short_label ?? poItem?.items?.name ?? "—",
            total:     totalBoxes,
            assigned,
            remaining,
        };
    }).filter((r) => r.total > 0);

    const allAssigned = rows.every((r) => r.remaining === 0);
    const anyOver     = rows.some((r) => r.remaining < 0);

    return (
        <div className="sticky top-0 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Unassigned Boxes
                </h3>
                {allAssigned && !anyOver && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {anyOver && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
            </div>
            <div className="divide-y divide-zinc-50">
                {rows.map((row) => (
                    <div key={row.name} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-xs text-zinc-700 truncate max-w-[100px]">{row.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs tabular-nums text-zinc-400">
                                {row.assigned}/{row.total}
                            </span>
                            <span className={cn(
                                "text-xs font-semibold tabular-nums",
                                row.remaining === 0 ? "text-green-600" :
                                row.remaining < 0  ? "text-red-600" :
                                "text-amber-600"
                            )}>
                                {row.remaining === 0 ? "✓" : row.remaining < 0 ? `${row.remaining} over` : `${row.remaining} left`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Single pallet card ────────────────────────────────────────────────────

function PalletCard({
    palletIndex,
    control,
    register,
    watch,
    errors,
    storageSpaces,
    onRemove,
    canRemove,
}: {
    palletIndex: number;
    control: any;
    register: any;
    watch: any;
    errors: any;
    storageSpaces: { id: string; name: string; temperature_type: string }[];
    onRemove: () => void;
    canRemove: boolean;
}) {
    const { fields } = useFieldArray({
        control,
        name: `pallets.${palletIndex}.items`,
    });

    const watchedItems = watch(`pallets.${palletIndex}.items`) ?? [];
    const totalBoxes   = watchedItems.reduce((s: number, i: any) => s + (i.box_count ?? 0), 0);
    const totalUnits   = watchedItems.reduce((s: number, i: any) => s + (i.box_count ?? 0) * (i.pieces_per_box ?? 0), 0);

    const palletError = errors?.pallets?.[palletIndex];
    const TEMP_ICONS: Record<string, string> = { frozen: "🧊", refrigerated: "❄️", dry: "📦" };

    return (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-zinc-400" />
                    <Input
                        {...register(`pallets.${palletIndex}.pallet_label`)}
                        className={cn(
                            "h-7 w-36 font-mono text-sm font-semibold",
                            palletError?.pallet_label ? "border-red-400" : ""
                        )}
                        placeholder="e.g. P-001"
                    />
                </div>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="rounded-md p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {/* Storage space selector */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-zinc-600">
                        Storage Space <span className="text-red-500">*</span>
                    </Label>
                    <select
                        {...register(`pallets.${palletIndex}.storage_space_id`)}
                        className={cn(
                            "w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
                            palletError?.storage_space_id ? "border-red-400" : "border-zinc-200"
                        )}
                    >
                        <option value="">Select storage space…</option>
                        {storageSpaces.map((ss) => (
                            <option key={ss.id} value={ss.id}>
                                {TEMP_ICONS[ss.temperature_type] ?? "📦"} {ss.name}
                            </option>
                        ))}
                    </select>
                    {palletError?.storage_space_id && (
                        <p className="text-xs text-red-500">{palletError.storage_space_id.message}</p>
                    )}
                </div>

                {/* Items table */}
                <div className="overflow-hidden rounded-lg border border-zinc-100">
                    <table className="min-w-full divide-y divide-zinc-50 text-sm">
                        <thead className="bg-zinc-50">
                            <tr>
                                {["Item", "Boxes", "Units/Box", "Total Units"].map((h) => (
                                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-zinc-400">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50 bg-white">
                            {fields.map((field, itemIdx) => {
                                const ppb        = watchedItems[itemIdx]?.pieces_per_box ?? 0;
                                const boxCount   = watchedItems[itemIdx]?.box_count ?? 0;
                                const maxBoxes   = watchedItems[itemIdx]?.max_boxes ?? 0;
                                const isOver     = boxCount > maxBoxes;
                                const itemError  = palletError?.items?.[itemIdx]?.box_count;

                                return (
                                    <tr key={field.id} className={isOver ? "bg-red-50/40" : ""}>
                                        <td className="px-3 py-2 text-xs font-medium text-zinc-900">
                                            {watchedItems[itemIdx]?.item_name ?? "—"}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Controller
                                                control={control}
                                                name={`pallets.${palletIndex}.items.${itemIdx}.box_count`}
                                                render={({ field: f }) => (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        className={cn(
                                                            "w-20 text-sm tabular-nums",
                                                            isOver ? "border-red-400 bg-red-50" : "",
                                                            itemError ? "border-red-400" : ""
                                                        )}
                                                        value={f.value ?? ""}
                                                        onChange={(e) =>
                                                            f.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                                                        }
                                                    />
                                                )}
                                            />
                                            {isOver && (
                                                <p className="mt-0.5 text-xs text-red-500">
                                                    Max {maxBoxes}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-xs tabular-nums text-zinc-500">
                                            {ppb}
                                        </td>
                                        <td className="px-3 py-2 text-xs tabular-nums text-zinc-700 font-medium">
                                            {(boxCount * ppb).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pallet totals */}
                <div className="flex items-center justify-end gap-4 text-xs text-zinc-500 pt-1">
                    <span>Total: <span className="font-semibold text-zinc-900">{totalBoxes} boxes</span></span>
                    <span>≈ <span className="font-semibold text-zinc-900">{totalUnits.toLocaleString()} units</span></span>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ────────────────────────────────────────────────────────

interface PhaseBStepProps {
    po: POForPhaseB;
    phaseAData: PhaseAData;
    warehouseLocationId: string;
    organizationId: string;
    onSubmit: (data: PhaseBData) => void;
    onSkip: () => void;
    isLoading: boolean;
}

export function PhaseBStep({
    po,
    phaseAData,
    warehouseLocationId,
    onSubmit,
    isLoading,
}: PhaseBStepProps) {
    const { data: storageSpaces = [] } = useWarehouseStorageSpaces(warehouseLocationId);

    const poNumber = po.po_number.replace(/[^A-Z0-9]/gi, "").toUpperCase();

    const { register, handleSubmit, control, watch, formState: { errors } } =
        useForm<PhaseBData>({
            resolver: zodResolver(phaseBSchema),
            defaultValues: {
                pallets: [buildDefaultPallet(po, phaseAData, 0)],
            },
        });

    const { fields, append, remove } = useFieldArray({ control, name: "pallets" });
    const watchedPallets = watch("pallets");

    // Validate: no item box count exceeds max across all pallets
    const handleFormSubmit = (data: PhaseBData) => {
        // Check overassignment
        const overItems = phaseAData.lineItems.filter((li) => {
            const ppb       = li.pieces_per_box;
            const maxBoxes  = ppb > 0 ? Math.floor(li.quantity_received / ppb) : 0;
            const assigned  = data.pallets.reduce((sum, p) => {
                const match = p.items.find((i) => i.item_id === li.item_id);
                return sum + (match?.box_count ?? 0);
            }, 0);
            return assigned > maxBoxes;
        });

        if (overItems.length > 0) {
            alert("Some items have more boxes assigned than were received. Please fix the highlighted rows.");
            return;
        }

        onSubmit(data);
    };

    const addPallet = () => {
        append(buildDefaultPallet(po, phaseAData, fields.length));
    };

    return (
        <form id="phase-b-form" onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="flex gap-6">
                {/* ── Left: pallet builder ── */}
                <div className="flex-1 space-y-4">
                    <div>
                        <h2 className="text-base font-semibold text-zinc-900">
                            Assign Boxes to Pallets
                        </h2>
                        <p className="mt-0.5 text-sm text-zinc-500">
                            Each card represents one physical pallet. Adjust box counts to match
                            how the shipment is physically arranged. Add more pallets if needed.
                        </p>
                    </div>

                    {fields.map((field, palletIdx) => (
                        <PalletCard
                            key={field.id}
                            palletIndex={palletIdx}
                            control={control}
                            register={register}
                            watch={watch}
                            errors={errors}
                            storageSpaces={storageSpaces}
                            canRemove={fields.length > 1}
                            onRemove={() => remove(palletIdx)}
                        />
                    ))}

                    <button
                        type="button"
                        onClick={addPallet}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-4 text-sm font-medium text-zinc-400 transition-colors hover:border-indigo-300 hover:text-indigo-500"
                    >
                        <Plus className="h-4 w-4" />
                        Add Another Pallet
                    </button>
                </div>

                {/* ── Right: unassigned panel ── */}
                <div className="w-52 flex-shrink-0">
                    <UnassignedPanel
                        phaseAData={phaseAData}
                        watchedPallets={watchedPallets ?? []}
                        poItems={po.purchase_order_items}
                    />
                </div>
            </div>
        </form>
    );
}
