"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
    ArrowRight, Plus, AlertTriangle, CheckCircle2,
    Package, Loader2, ChevronDown, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMoveBoxesBetweenPallets } from "@/lib/hooks/queries/useReorganize";
import { useWarehouseStorageSpaces } from "@/lib/hooks/queries/useReceiving";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PalletInventoryRow = {
    id: string;
    item_id: number;
    box_count: number;
    initial_box_count: number;
    purchase_order_item_id: string | null;
    pieces_per_box_override: number | null;
    items: { id: number; name: string; short_label: string | null; sku: string | null } | null;
    purchase_order_items: { pieces_per_box: number } | null;
};

type Pallet = {
    id: string;
    pallet_label: string;
    status: string;
    storage_space_id: string | null;
    total_boxes: number;
    storage_spaces: { id: string; name: string; temperature_type: string } | null;
    pallet_inventory: PalletInventoryRow[];
};

// Move qty keyed by pallet_inventory id
type MoveMap = Record<string, number>;

interface ReorganizePanelProps {
    pallets:               Pallet[];
    preselectedSourceId:   string | null;
    warehouseLocationId:   string;
    onComplete:            () => void;
}

const TEMP_ICONS: Record<string, string> = {
    frozen: "🧊", refrigerated: "❄️", dry: "📦",
};

// ─── Pallet selector dropdown ─────────────────────────────────────────────────

function PalletSelector({
    pallets,
    selectedId,
    excludeId,
    placeholder,
    onSelect,
}: {
    pallets:     Pallet[];
    selectedId:  string | null;
    excludeId?:  string | null;
    placeholder: string;
    onSelect:    (p: Pallet | null) => void;
}) {
    const [open,  setOpen]  = useState(false);
    const [query, setQuery] = useState("");
    const ref               = useRef<HTMLDivElement>(null);

    const filtered = pallets.filter((p) => {
        if (p.id === excludeId) return false;
        const term = query.toLowerCase();
        return (
            p.pallet_label.toLowerCase().includes(term) ||
            p.storage_spaces?.name.toLowerCase().includes(term)
        );
    });

    const selected = pallets.find((p) => p.id === selectedId);

    // Close on outside click
    useState(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document?.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    });

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setQuery(""); }}
                className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500",
                    selected ? "border-indigo-200 bg-indigo-50/50 text-zinc-900" : "border-zinc-200 bg-white text-zinc-400"
                )}
            >
                <div className="min-w-0">
                    {selected ? (
                        <div>
                            <span className="font-mono font-semibold text-zinc-900">
                                {selected.pallet_label}
                            </span>
                            {selected.storage_spaces && (
                                <span className="ml-2 text-xs text-zinc-400">
                                    {TEMP_ICONS[selected.storage_spaces.temperature_type]}{" "}
                                    {selected.storage_spaces.name}
                                </span>
                            )}
                        </div>
                    ) : (
                        placeholder
                    )}
                </div>
                <ChevronDown className={cn("w-4 h-4 flex-shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
                        <Search className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search pallets…"
                            className="flex-1 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
                        />
                    </div>
                    <ul className="max-h-56 overflow-y-auto divide-y divide-zinc-50">
                        {filtered.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-zinc-400 text-center">No pallets found</li>
                        ) : filtered.map((p) => (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    onClick={() => { onSelect(p); setOpen(false); }}
                                    className={cn(
                                        "w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm transition",
                                        p.id === selectedId
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "hover:bg-zinc-50 text-zinc-800"
                                    )}
                                >
                                    <div>
                                        <span className="font-mono font-semibold">{p.pallet_label}</span>
                                        {p.storage_spaces && (
                                            <span className="ml-2 text-xs text-zinc-400">
                                                {TEMP_ICONS[p.storage_spaces.temperature_type]}{" "}
                                                {p.storage_spaces.name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full font-medium",
                                            p.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {p.total_boxes} boxes
                                        </span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─── Move summary bar ─────────────────────────────────────────────────────────

function MoveSummary({
    source,
    moveMap,
    destLabel,
    destSpace,
}: {
    source:    Pallet | null;
    moveMap:   MoveMap;
    destLabel: string;
    destSpace: string;
}) {
    const totalBoxes  = Object.values(moveMap).reduce((s, v) => s + v, 0);
    const itemCount   = Object.values(moveMap).filter((v) => v > 0).length;

    if (!source || totalBoxes === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4"
        >
            <div className="flex items-center gap-3 text-sm">
                <div className="font-mono font-semibold text-indigo-700">
                    {source.pallet_label}
                </div>
                <ArrowRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <div className="font-mono font-semibold text-indigo-700">
                    {destLabel || "New Pallet"}
                </div>
                {destSpace && (
                    <span className="text-xs text-indigo-500">({destSpace})</span>
                )}
                <div className="ml-auto text-xs text-indigo-600 font-medium">
                    {itemCount} item type{itemCount !== 1 ? "s" : ""} · {totalBoxes} box{totalBoxes !== 1 ? "es" : ""}
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ReorganizePanel({
    pallets,
    preselectedSourceId,
    warehouseLocationId,
    onComplete,
}: ReorganizePanelProps) {
    const router = useRouter();

    // ── State ──────────────────────────────────────────────────────────────
    const [sourcePallet, setSourcePallet] = useState<Pallet | null>(
        preselectedSourceId ? (pallets.find((p) => p.id === preselectedSourceId) ?? null) : null
    );
    const [destMode, setDestMode]         = useState<"existing" | "new">("existing");
    const [destPallet, setDestPallet]     = useState<Pallet | null>(null);
    const [destSpaceId, setDestSpaceId]   = useState<string>("");
    const [newPalletLabel, setNewPalletLabel] = useState<string>("");
    const [moveMap, setMoveMap]           = useState<MoveMap>({}); // inv_id → boxes to move

    const { data: storageSpaces = [] } = useWarehouseStorageSpaces(warehouseLocationId);
    const { mutateAsync: moveBoxes, isPending } = useMoveBoxesBetweenPallets();

    // ── Derived ────────────────────────────────────────────────────────────
    const inventory = sourcePallet?.pallet_inventory ?? [];

    const totalMoving = Object.values(moveMap).reduce((s, v) => s + (v || 0), 0);

    // Validation
    const errors = useMemo(() => {
        const out: string[] = [];
        if (!sourcePallet) return out;
        if (totalMoving === 0) out.push("Select at least one box to move.");
        if (destMode === "existing" && !destPallet) out.push("Select a destination pallet.");
        if (destMode === "new" && !newPalletLabel.trim()) out.push("Enter a label for the new pallet.");
        if (!destSpaceId) out.push("Select a storage space for the destination.");
        if (destMode === "existing" && destPallet?.id === sourcePallet?.id) out.push("Source and destination cannot be the same pallet.");

        // Check overflows
        inventory.forEach((row) => {
            const moving = moveMap[row.id] ?? 0;
            if (moving > row.box_count) {
                out.push(`${row.items?.short_label ?? row.items?.name}: cannot move more boxes than available (${row.box_count}).`);
            }
        });

        return out;
    }, [sourcePallet, destPallet, destMode, destSpaceId, newPalletLabel, moveMap, totalMoving, inventory]);

    // Temp mismatch warning
    const destSpaceObj = storageSpaces.find((s: any) => s.id === destSpaceId);
    const sourceSpaceObj = sourcePallet?.storage_spaces;
    const tempMismatch = destSpaceObj && sourceSpaceObj &&
        destSpaceObj.temperature_type !== sourceSpaceObj.temperature_type;

    // Select all toggle
    const allSelected = inventory.length > 0 &&
        inventory.every((row) => (moveMap[row.id] ?? 0) === row.box_count);

    function toggleSelectAll() {
        if (allSelected) {
            setMoveMap({});
        } else {
            const next: MoveMap = {};
            inventory.forEach((row) => { next[row.id] = row.box_count; });
            setMoveMap(next);
        }
    }

    // Handle source change — reset move map
    function handleSourceSelect(p: Pallet | null) {
        setSourcePallet(p);
        setMoveMap({});
    }

    // Handle dest pallet change — sync storage space
    function handleDestSelect(p: Pallet | null) {
        setDestPallet(p);
        if (p?.storage_space_id) setDestSpaceId(p.storage_space_id);
    }

    // ── Submit ─────────────────────────────────────────────────────────────
    async function handleMove() {
        if (errors.length > 0) return;
        if (!sourcePallet) return;

        // Temp mismatch — confirm
        if (tempMismatch) {
            const ok = confirm(
                `Destination storage is ${destSpaceObj?.temperature_type}. ` +
                `Source is ${sourceSpaceObj?.temperature_type}. ` +
                `Proceed anyway?`
            );
            if (!ok) return;
        }

        // Source will be empty after move — confirm
        const willEmpty = inventory.every((r) => (moveMap[r.id] ?? 0) >= r.box_count);
        if (willEmpty) {
            const ok = confirm(
                `This will empty ${sourcePallet.pallet_label}. ` +
                `It will be marked as empty and available for archiving. Proceed?`
            );
            if (!ok) return;
        }

        const itemsToMove = inventory
            .filter((row) => (moveMap[row.id] ?? 0) > 0)
            .map((row) => ({
                item_id:             row.item_id,
                pallet_inventory_id: row.id,
                box_count:           moveMap[row.id]!,
            }));

        try {
            const result = await moveBoxes({
                sourcePalletId:       sourcePallet.id,
                targetPalletId:       destMode === "existing" ? destPallet?.id ?? null : null,
                targetStorageSpaceId: destSpaceId,
                itemsToMove,
                newPalletLabel:       destMode === "new" ? newPalletLabel.trim() : undefined,
            });

            const destLabel = destMode === "new"
                ? newPalletLabel
                : destPallet?.pallet_label ?? "pallet";

            toast.success(
                `${totalMoving} box${totalMoving !== 1 ? "es" : ""} moved from ${sourcePallet.pallet_label} to ${destLabel}.`
            );
            onComplete();
        } catch (err: any) {
            toast.error(err.message ?? "Move failed. Please try again.");
        }
    }

    // ── Drag and drop (desktop enhancement) ───────────────────────────────
    function handleDragStart(e: React.DragEvent, invId: string, maxBoxes: number) {
        e.dataTransfer.setData("inv_id", invId);
        e.dataTransfer.setData("max_boxes", String(maxBoxes));
        e.dataTransfer.effectAllowed = "move";
    }

    const [isDragOver, setIsDragOver] = useState(false);

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragOver(false);
        const invId   = e.dataTransfer.getData("inv_id");
        const maxBoxes = parseInt(e.dataTransfer.getData("max_boxes"));
        if (invId && maxBoxes > 0) {
            setMoveMap((prev) => ({ ...prev, [invId]: maxBoxes }));
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-5">
            {/* ── Source selector ── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                {/* LEFT: Source */}
                <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-900">Move From</h2>
                        <p className="mt-0.5 text-xs text-zinc-400">
                            Select the source pallet, then set how many boxes of each item to move.
                        </p>
                    </div>

                    <PalletSelector
                        pallets={pallets}
                        selectedId={sourcePallet?.id ?? null}
                        excludeId={destPallet?.id}
                        placeholder="Select source pallet…"
                        onSelect={handleSourceSelect}
                    />

                    {/* Source contents */}
                    <AnimatePresence mode="wait">
                        {sourcePallet && (
                            <motion.div
                                key={sourcePallet.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-3"
                            >
                                {/* Select all */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">
                                        {inventory.length} item type{inventory.length !== 1 ? "s" : ""}
                                        {" · "}{sourcePallet.total_boxes} total boxes
                                    </span>
                                    <button
                                        type="button"
                                        onClick={toggleSelectAll}
                                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                    >
                                        {allSelected ? "Clear all" : "Select all"}
                                    </button>
                                </div>

                                {/* Item rows */}
                                <div className="divide-y divide-zinc-50 rounded-xl border border-zinc-100 overflow-hidden">
                                    {inventory.map((row) => {
                                        const moving  = moveMap[row.id] ?? 0;
                                        const isOver  = moving > row.box_count;
                                        const itemName = row.items?.short_label ?? row.items?.name ?? "—";

                                        return (
                                            <div
                                                key={row.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, row.id, row.box_count)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing transition-colors",
                                                    moving > 0 ? "bg-indigo-50/60" : "bg-white hover:bg-zinc-50/60",
                                                    isOver && "bg-red-50"
                                                )}
                                            >
                                                <Package className="h-3.5 w-3.5 flex-shrink-0 text-zinc-300" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-zinc-900 truncate">
                                                        {itemName}
                                                    </p>
                                                    <p className="text-xs text-zinc-400">
                                                        {row.box_count} box{row.box_count !== 1 ? "es" : ""} available
                                                    </p>
                                                </div>

                                                {/* Box count input */}
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setMoveMap((p) => ({
                                                            ...p,
                                                            [row.id]: Math.max(0, (p[row.id] ?? 0) - 1),
                                                        }))}
                                                        className="w-6 h-6 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-100 text-sm font-medium flex items-center justify-center"
                                                    >
                                                        −
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={row.box_count}
                                                        value={moving}
                                                        onChange={(e) => setMoveMap((p) => ({
                                                            ...p,
                                                            [row.id]: Math.max(0, parseInt(e.target.value) || 0),
                                                        }))}
                                                        className={cn(
                                                            "w-14 rounded-lg border text-center text-sm tabular-nums py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500",
                                                            isOver
                                                                ? "border-red-400 bg-red-50 text-red-700"
                                                                : moving > 0
                                                                ? "border-indigo-300 bg-white"
                                                                : "border-zinc-200 bg-white text-zinc-700"
                                                        )}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setMoveMap((p) => ({
                                                            ...p,
                                                            [row.id]: Math.min(row.box_count, (p[row.id] ?? 0) + 1),
                                                        }))}
                                                        className="w-6 h-6 rounded-md border border-zinc-200 text-zinc-500 hover:bg-zinc-100 text-sm font-medium flex items-center justify-center"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!sourcePallet && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-12 text-center">
                            <Package className="h-8 w-8 text-zinc-200 mb-2" />
                            <p className="text-sm text-zinc-400">Select a source pallet above</p>
                        </div>
                    )}
                </div>

                {/* RIGHT: Destination */}
                <div
                    className={cn(
                        "flex flex-col gap-4 rounded-xl border bg-white p-5 shadow-sm transition-colors",
                        isDragOver ? "border-indigo-400 bg-indigo-50/30" : "border-zinc-200"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                >
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-900">Move To</h2>
                        <p className="mt-0.5 text-xs text-zinc-400">
                            Choose an existing pallet or create a new one.
                            {" "}
                            <span className="text-indigo-400">
                                Drag items here on desktop.
                            </span>
                        </p>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex rounded-lg border border-zinc-200 p-1 gap-1">
                        {(["existing", "new"] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                    setDestMode(mode);
                                    setDestPallet(null);
                                    setDestSpaceId("");
                                    setNewPalletLabel("");
                                }}
                                className={cn(
                                    "flex-1 rounded-md py-1.5 text-xs font-medium transition-colors",
                                    destMode === mode
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700"
                                )}
                            >
                                {mode === "existing" ? "Existing Pallet" : "New Pallet"}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {destMode === "existing" ? (
                            <motion.div
                                key="existing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-3"
                            >
                                <PalletSelector
                                    pallets={pallets}
                                    selectedId={destPallet?.id ?? null}
                                    excludeId={sourcePallet?.id}
                                    placeholder="Select destination pallet…"
                                    onSelect={handleDestSelect}
                                />

                                {/* Storage space (editable even for existing — allows reassignment) */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-600">
                                        Storage Space <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={destSpaceId}
                                        onChange={(e) => setDestSpaceId(e.target.value)}
                                        className={cn(
                                            "w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
                                            !destSpaceId ? "border-zinc-200 text-zinc-400" : "border-zinc-200"
                                        )}
                                    >
                                        <option value="">Select storage space…</option>
                                        {storageSpaces.map((ss: any) => (
                                            <option key={ss.id} value={ss.id}>
                                                {TEMP_ICONS[ss.temperature_type] ?? "📦"} {ss.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Dest pallet current contents (read only) */}
                                {destPallet && destPallet.pallet_inventory.length > 0 && (
                                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 overflow-hidden">
                                        <p className="px-4 py-2 text-xs font-medium text-zinc-400 border-b border-zinc-100">
                                            Current contents
                                        </p>
                                        {destPallet.pallet_inventory.map((row) => (
                                            <div key={row.id} className="flex items-center justify-between px-4 py-2 text-xs text-zinc-600 border-b border-zinc-50 last:border-0">
                                                <span>{row.items?.short_label ?? row.items?.name}</span>
                                                <span className="tabular-nums text-zinc-400">{row.box_count} boxes</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="new"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-3"
                            >
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-600">
                                        New Pallet Label <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newPalletLabel}
                                        onChange={(e) => setNewPalletLabel(e.target.value)}
                                        placeholder="e.g. P-042"
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-zinc-600">
                                        Storage Space <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={destSpaceId}
                                        onChange={(e) => setDestSpaceId(e.target.value)}
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="">Select storage space…</option>
                                        {storageSpaces.map((ss: any) => (
                                            <option key={ss.id} value={ss.id}>
                                                {TEMP_ICONS[ss.temperature_type] ?? "📦"} {ss.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Temperature mismatch warning */}
                    {tempMismatch && (
                        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700">
                                Destination is <strong>{destSpaceObj?.temperature_type}</strong> but source is{" "}
                                <strong>{sourceSpaceObj?.temperature_type}</strong>. You can still proceed.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Move summary ── */}
            <AnimatePresence>
                {totalMoving > 0 && (
                    <MoveSummary
                        source={sourcePallet}
                        moveMap={moveMap}
                        destLabel={destMode === "existing" ? (destPallet?.pallet_label ?? "") : newPalletLabel}
                        destSpace={destSpaceObj?.name ?? ""}
                    />
                )}
            </AnimatePresence>

            {/* ── Validation errors ── */}
            {errors.length > 0 && totalMoving > 0 && (
                <div className="space-y-1">
                    {errors.map((err) => (
                        <div key={err} className="flex items-center gap-2 text-xs text-red-600">
                            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                            {err}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Action footer ── */}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isPending}
                    size="sm"
                >
                    Cancel
                </Button>

                <Button
                    onClick={handleMove}
                    disabled={isPending || errors.length > 0 || totalMoving === 0}
                    size="sm"
                    className="min-w-[140px]"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            Moving…
                        </>
                    ) : (
                        <>
                            <ArrowRight className="mr-1.5 h-4 w-4" />
                            Move {totalMoving > 0 ? `${totalMoving} Box${totalMoving !== 1 ? "es" : ""}` : "Items"}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
