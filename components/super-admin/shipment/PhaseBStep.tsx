"use client";

import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, AlertTriangle, CheckCircle2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWarehouseStorageSpaces } from "@/lib/hooks/queries/useReceiving";
import { cn } from "@/lib/utils";
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

const boxConfigSchema = z.object({
    pieces_per_box: z
        .number({ invalid_type_error: "Required" })
        .int("Whole number")
        .min(1, "Must be ≥ 1"),
    box_count: z
        .number({ invalid_type_error: "Required" })
        .int("Whole boxes only")
        .min(0, "Cannot be negative"),
});

const phaseBSchema = z.object({
    pallets: z
        .array(
            z.object({
                pallet_label: z.string().min(1, "Label required"),
                storage_space_id: z.string().min(1, "Storage space required"),
                items: z
                    .array(
                        z.object({
                            item_id: z.number(),
                            purchase_order_item_id: z.string(),
                            item_name: z.string(),
                            max_boxes: z.number(),
                            default_pieces_per_box: z.number(),
                            box_configs: z
                                .array(boxConfigSchema)
                                .min(1, "At least one configuration required"),
                        })
                    )
                    .min(1, "Add at least one item"),
            })
        )
        .min(1, "Add at least one pallet"),
});

export type PhaseBData = z.infer<typeof phaseBSchema>;

// ─── Helper — total boxes for an item across its configs ───────────────────

function totalBoxesForItem(
    box_configs: { pieces_per_box: number; box_count: number }[]
): number {
    return box_configs.reduce((s, c) => s + (c.box_count ?? 0), 0);
}

function totalUnitsForItem(
    box_configs: { pieces_per_box: number; box_count: number }[]
): number {
    return box_configs.reduce(
        (s, c) => s + (c.box_count ?? 0) * (c.pieces_per_box ?? 0),
        0
    );
}

// ─── Build default pallet ──────────────────────────────────────────────────

function buildDefaultPallet(
    po: POForPhaseB,
    phaseAData: PhaseAData,
    palletIndex: number
) {
    const poNumber = po.po_number.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    return {
        pallet_label: `${poNumber}-P${String(palletIndex + 1).padStart(3, "0")}`,
        storage_space_id: "",
        items: phaseAData.lineItems
            .map((li) => {
                const poItem = po.purchase_order_items.find(
                    (i) => i.item_id === li.item_id
                );
                const ppb = li.pieces_per_box;
                const maxBoxes = ppb > 0 ? Math.floor(li.quantity_received / ppb) : 0;
                return {
                    item_id: li.item_id,
                    purchase_order_item_id: li.po_item_id,
                    item_name:
                        poItem?.items?.short_label ?? poItem?.items?.name ?? "—",
                    max_boxes: maxBoxes,
                    default_pieces_per_box: ppb,
                    box_configs: [{ pieces_per_box: ppb, box_count: maxBoxes }],
                };
            })
            .filter((i) => i.max_boxes > 0),
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
    const rows = phaseAData.lineItems
        .map((li) => {
            const poItem = poItems.find((i) => i.item_id === li.item_id);
            const ppb = li.pieces_per_box;
            const totalBoxes = ppb > 0 ? Math.floor(li.quantity_received / ppb) : 0;
            const assigned = watchedPallets.reduce((sum, p) => {
                const match = p.items.find((i) => i.item_id === li.item_id);
                if (!match) return sum;
                return sum + totalBoxesForItem(match.box_configs ?? []);
            }, 0);
            const remaining = totalBoxes - assigned;
            return {
                name: poItem?.items?.short_label ?? poItem?.items?.name ?? "—",
                total: totalBoxes,
                assigned,
                remaining,
            };
        })
        .filter((r) => r.total > 0);

    const allAssigned = rows.every((r) => r.remaining === 0);
    const anyOver = rows.some((r) => r.remaining < 0);

    return (
        <div className="sticky top-0 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Unassigned Boxes
                </h3>
                {allAssigned && !anyOver && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {anyOver && <AlertTriangle className="h-4 w-4 text-red-500" />}
            </div>
            <div className="divide-y divide-zinc-50">
                {rows.map((row) => (
                    <div
                        key={row.name}
                        className="flex items-center justify-between px-4 py-2.5"
                    >
                        <span className="text-xs text-zinc-700 truncate max-w-[100px]">
                            {row.name}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs tabular-nums text-zinc-400">
                                {row.assigned}/{row.total}
                            </span>
                            <span
                                className={cn(
                                    "text-xs font-semibold tabular-nums",
                                    row.remaining === 0
                                        ? "text-green-600"
                                        : row.remaining < 0
                                            ? "text-red-600"
                                            : "text-amber-600"
                                )}
                            >
                                {row.remaining === 0
                                    ? "✓"
                                    : row.remaining < 0
                                        ? `${row.remaining} over`
                                        : `${row.remaining} left`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Box config rows for a single item inside a pallet card ───────────────

function ItemBoxConfigs({
                            palletIndex,
                            itemIndex,
                            control,
                            errors,
                            defaultPiecesPerBox,
                        }: {
    palletIndex: number;
    itemIndex: number;
    control: any;
    errors: any;
    defaultPiecesPerBox: number;
}) {
    const baseName =
        `pallets.${palletIndex}.items.${itemIndex}.box_configs` as const;

    const { fields, append, remove } = useFieldArray({
        control,
        name: baseName,
    });

    const configErrors =
        errors?.pallets?.[palletIndex]?.items?.[itemIndex]?.box_configs;

    return (
        <div className="space-y-1.5">
            {fields.map((cfgField, cfgIdx) => {
                const ppbError = configErrors?.[cfgIdx]?.pieces_per_box;
                const bcError = configErrors?.[cfgIdx]?.box_count;
                const isFirst = cfgIdx === 0;

                return (
                    <div
                        key={cfgField.id}
                        className="flex items-center gap-2"
                    >
                        {/* Pieces per box */}
                        <div className="flex flex-col">
                            {isFirst && (
                                <span className="mb-0.5 text-[10px] text-zinc-400">
                                    Pcs/box
                                </span>
                            )}
                            <Controller
                                control={control}
                                name={`${baseName}.${cfgIdx}.pieces_per_box`}
                                render={({ field: f }) => (
                                    <Input
                                        type="number"
                                        min="1"
                                        step="1"
                                        placeholder={String(defaultPiecesPerBox)}
                                        className={cn(
                                            "w-20 text-sm tabular-nums",
                                            ppbError ? "border-red-400" : ""
                                        )}
                                        value={f.value ?? ""}
                                        onChange={(e) =>
                                            f.onChange(
                                                e.target.value === ""
                                                    ? undefined
                                                    : Number(e.target.value)
                                            )
                                        }
                                    />
                                )}
                            />
                            {ppbError && (
                                <p className="text-[10px] text-red-500 mt-0.5">
                                    {ppbError.message}
                                </p>
                            )}
                        </div>

                        {/* × separator */}
                        <span
                            className={cn(
                                "text-xs text-zinc-400 select-none",
                                isFirst ? "mt-4" : ""
                            )}
                        >
                            ×
                        </span>

                        {/* Box count */}
                        <div className="flex flex-col">
                            {isFirst && (
                                <span className="mb-0.5 text-[10px] text-zinc-400">
                                    Boxes
                                </span>
                            )}
                            <Controller
                                control={control}
                                name={`${baseName}.${cfgIdx}.box_count`}
                                render={({ field: f }) => (
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        className={cn(
                                            "w-20 text-sm tabular-nums",
                                            bcError ? "border-red-400" : ""
                                        )}
                                        value={f.value ?? ""}
                                        onChange={(e) =>
                                            f.onChange(
                                                e.target.value === ""
                                                    ? 0
                                                    : Number(e.target.value)
                                            )
                                        }
                                    />
                                )}
                            />
                            {bcError && (
                                <p className="text-[10px] text-red-500 mt-0.5">
                                    {bcError.message}
                                </p>
                            )}
                        </div>

                        {/* Remove config button (only when >1 config) */}
                        {fields.length > 1 ? (
                            <button
                                type="button"
                                onClick={() => remove(cfgIdx)}
                                className={cn(
                                    "rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors",
                                    isFirst ? "mt-4" : ""
                                )}
                                aria-label="Remove configuration"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            /* placeholder to keep layout stable */
                            <div
                                className={cn(
                                    "w-[26px]",
                                    isFirst ? "mt-4" : ""
                                )}
                            />
                        )}
                    </div>
                );
            })}

            {/* Add another configuration */}
            <button
                type="button"
                onClick={() =>
                    append({ pieces_per_box: defaultPiecesPerBox, box_count: 0 })
                }
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
            >
                <PlusCircle className="h-3 w-3" />
                Add another configuration
            </button>
        </div>
    );
}

// ─── Single pallet card ────────────────────────────────────────────────────

function PalletCard({
                        palletIndex,
                        control,
                        register,
                        errors,
                        storageSpaces,
                        onRemove,
                        canRemove,
                    }: {
    palletIndex: number;
    control: any;
    register: any;
    errors: any;
    storageSpaces: { id: string; name: string; temperature_type: string }[];
    onRemove: () => void;
    canRemove: boolean;
}) {
    const { fields } = useFieldArray({
        control,
        name: `pallets.${palletIndex}.items`,
    });

    // Watch all items to compute totals
    const watchedItems =
        useWatch({ control, name: `pallets.${palletIndex}.items` }) ?? [];

    const totalBoxes = watchedItems.reduce(
        (s: number, item: any) =>
            s + totalBoxesForItem(item?.box_configs ?? []),
        0
    );
    const totalUnits = watchedItems.reduce(
        (s: number, item: any) =>
            s + totalUnitsForItem(item?.box_configs ?? []),
        0
    );

    const palletError = errors?.pallets?.[palletIndex];
    const TEMP_ICONS: Record<string, string> = {
        frozen: "🧊",
        refrigerated: "❄️",
        dry: "📦",
    };

    return (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                        {...register(`pallets.${palletIndex}.pallet_label`)}
                        className={cn(
                            "w-36 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-sm font-mono font-medium text-zinc-900",
                            "focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400",
                            palletError?.pallet_label ? "border-red-400" : ""
                        )}
                        placeholder="Label"
                    />
                    <select
                        {...register(`pallets.${palletIndex}.storage_space_id`)}
                        className={cn(
                            "flex-1 min-w-0 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-sm text-zinc-700",
                            "focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400",
                            palletError?.storage_space_id ? "border-red-400" : ""
                        )}
                    >
                        <option value="">— Select storage space —</option>
                        {storageSpaces.map((s) => (
                            <option key={s.id} value={s.id}>
                                {TEMP_ICONS[s.temperature_type] ?? "📦"} {s.name}
                            </option>
                        ))}
                    </select>
                </div>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="ml-3 rounded p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                        aria-label="Remove pallet"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            {palletError?.storage_space_id && (
                <p className="px-4 pt-1 text-xs text-red-500">
                    {palletError.storage_space_id.message}
                </p>
            )}

            {/* Items */}
            <div className="divide-y divide-zinc-50">
                {fields.map((field, itemIdx) => {
                    const watchedItem = watchedItems[itemIdx];
                    const configs = watchedItem?.box_configs ?? [];
                    const totalBoxesThisItem = totalBoxesForItem(configs);
                    const totalUnitsThisItem = totalUnitsForItem(configs);
                    const maxBoxes = watchedItem?.max_boxes ?? 0;
                    const isOver = totalBoxesThisItem > maxBoxes;

                    return (
                        <div
                            key={field.id}
                            className={cn(
                                "px-4 py-3",
                                isOver ? "bg-red-50/40" : ""
                            )}
                        >
                            {/* Item name + totals row */}
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <p className="text-sm font-medium text-zinc-900">
                                        {watchedItem?.item_name ?? "—"}
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                        Max {maxBoxes} box{maxBoxes !== 1 ? "es" : ""}
                                    </p>
                                </div>
                                <div className="text-right text-xs tabular-nums">
                                    <p
                                        className={cn(
                                            "font-semibold",
                                            isOver
                                                ? "text-red-600"
                                                : "text-zinc-900"
                                        )}
                                    >
                                        {totalBoxesThisItem} box
                                        {totalBoxesThisItem !== 1 ? "es" : ""}
                                        {isOver && (
                                            <span className="ml-1 text-red-500">
                                                (over by{" "}
                                                {totalBoxesThisItem - maxBoxes})
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-zinc-500">
                                        ≈ {totalUnitsThisItem.toLocaleString()}{" "}
                                        units
                                    </p>
                                </div>
                            </div>

                            {/* Box config inputs */}
                            <ItemBoxConfigs
                                palletIndex={palletIndex}
                                itemIndex={itemIdx}
                                control={control}
                                errors={errors}
                                defaultPiecesPerBox={
                                    watchedItem?.default_pieces_per_box ?? 1
                                }
                            />
                        </div>
                    );
                })}
            </div>

            {/* Pallet totals footer */}
            <div className="flex items-center justify-end gap-4 border-t border-zinc-100 bg-zinc-50/60 px-4 py-2.5 text-xs text-zinc-500">
                <span>
                    Total:{" "}
                    <span className="font-semibold text-zinc-900">
                        {totalBoxes} boxes
                    </span>
                </span>
                <span>
                    ≈{" "}
                    <span className="font-semibold text-zinc-900">
                        {totalUnits.toLocaleString()} units
                    </span>
                </span>
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
                           }: PhaseBStepProps) {
    const { data: storageSpaces = [] } =
        useWarehouseStorageSpaces(warehouseLocationId);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<PhaseBData>({
        resolver: zodResolver(phaseBSchema),
        defaultValues: {
            pallets: [buildDefaultPallet(po, phaseAData, 0)],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "pallets",
    });

    const watchedPallets = useWatch({ control, name: "pallets" }) ?? [];

    const handleFormSubmit = (data: PhaseBData) => {
        // Check overassignment across all pallets
        const overItems = phaseAData.lineItems.filter((li) => {
            const ppb = li.pieces_per_box;
            const maxBoxes = ppb > 0 ? Math.floor(li.quantity_received / ppb) : 0;
            const assigned = data.pallets.reduce((sum, p) => {
                const match = p.items.find((i) => i.item_id === li.item_id);
                if (!match) return sum;
                return sum + totalBoxesForItem(match.box_configs ?? []);
            }, 0);
            return assigned > maxBoxes;
        });

        if (overItems.length > 0) {
            alert(
                "Some items have more boxes assigned than were received. Please fix the highlighted rows."
            );
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
                            Each card is one physical pallet. If a single item arrived in
                            boxes of mixed sizes, use{" "}
                            <span className="font-medium text-zinc-700">
                                "Add another configuration"
                            </span>{" "}
                            to enter each group separately.
                        </p>
                    </div>

                    {fields.map((field, palletIdx) => (
                        <PalletCard
                            key={field.id}
                            palletIndex={palletIdx}
                            control={control}
                            register={register}
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

                {/* ── Right: unassigned tracker ── */}
                <div className="w-52 flex-shrink-0">
                    <UnassignedPanel
                        phaseAData={phaseAData}
                        watchedPallets={watchedPallets}
                        poItems={po.purchase_order_items}
                    />
                </div>
            </div>
        </form>
    );
}