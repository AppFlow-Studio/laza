"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle, Boxes, Loader2 } from "lucide-react";
import type { WarehouseCatalogItem } from "@/lib/supabase/queries/warehouse";
import type { ShipmentBoxConfig } from "@/lib/supabase/queries/itemShipmentHistory";

function validateBoxQty(val: string | number): { ok: boolean; value?: number; error?: string } {
    const n = Number(val);
    if (val === "" || val === null || val === undefined) return { ok: false, error: "Required" };
    if (!Number.isInteger(n)) return { ok: false, error: "Whole boxes only — no decimals" };
    if (n < 1) return { ok: false, error: "Minimum 1 box" };
    if (n > 999) return { ok: false, error: "Maximum 999 boxes" };
    return { ok: true, value: n };
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: (WarehouseCatalogItem & { box_quantity: number }) | null;
    initialBoxes?: number;
    initialConfig?: ShipmentBoxConfig | null;
    configs: ShipmentBoxConfig[];
    configsLoading: boolean;
    onConfirm: (boxes: number, config: ShipmentBoxConfig | null) => void;
}

export function ItemAddDialog({
    open,
    onOpenChange,
    item,
    initialBoxes = 1,
    initialConfig = null,
    configs,
    configsLoading,
    onConfirm,
}: Props) {
    const [inputVal, setInputVal] = useState(String(initialBoxes));
    const [error, setError] = useState<string | null>(null);
    const [selectedConfig, setSelectedConfig] = useState<ShipmentBoxConfig | null>(initialConfig);
    const [configError, setConfigError] = useState(false);

    useEffect(() => {
        if (open) {
            setInputVal(String(initialBoxes));
            setSelectedConfig(initialConfig ?? null);
            setError(null);
            setConfigError(false);
        }
    }, [open, initialBoxes, initialConfig]);

    if (!item) return null;

    const requiresConfig = configs.length > 0;
    const ppb = selectedConfig?.piecesPerBox ?? item.box_quantity;
    const displayBoxes = parseInt(inputVal) || 1;
    const unitPrice = item.warehouse_transfer_price ?? null;
    const pricePerBox = unitPrice != null ? unitPrice * ppb : null;

    const handleInputChange = (val: string) => {
        if (val.includes(".")) return;
        setInputVal(val);
        const v = validateBoxQty(val);
        setError(v.ok ? null : (v.error ?? null));
    };

    const adjust = (delta: number) => {
        const next = Math.max(1, Math.min(999, displayBoxes + delta));
        setInputVal(String(next));
        setError(null);
    };

    const handleConfirm = () => {
        const v = validateBoxQty(inputVal);
        if (!v.ok) { setError(v.error ?? null); return; }
        if (requiresConfig && !selectedConfig) { setConfigError(true); return; }
        onConfirm(v.value!, selectedConfig);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">{item.name}</DialogTitle>
                    {item.sku && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{item.sku}</p>
                    )}
                </DialogHeader>

                {/* Price info */}
                {unitPrice != null && (
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <span>${unitPrice.toFixed(2)} / unit</span>
                        {pricePerBox != null && (
                            <span className="text-indigo-600 font-semibold">· ${pricePerBox.toFixed(2)} / box</span>
                        )}
                    </div>
                )}

                {/* Quantity stepper */}
                <div>
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest block mb-2">
                        Quantity (boxes)
                    </label>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={() => adjust(-1)}
                                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-l-lg bg-white hover:bg-gray-50 text-gray-500 text-lg font-medium transition-all"
                            >
                                −
                            </button>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={999}
                                step={1}
                                value={inputVal}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if ([".", "e", "E", "-", "+"].includes(e.key)) e.preventDefault();
                                }}
                                className={`w-16 h-10 border-y text-center text-sm font-semibold text-gray-900 outline-none transition-all ${
                                    error ? "border-red-400 bg-red-50" : "border-gray-200 bg-white focus:border-indigo-400"
                                }`}
                                style={{ MozAppearance: "textfield", appearance: "textfield" } as React.CSSProperties}
                            />
                            <button
                                type="button"
                                onClick={() => adjust(1)}
                                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-r-lg bg-white hover:bg-gray-50 text-gray-500 text-lg font-medium transition-all"
                            >
                                +
                            </button>
                        </div>
                        <span className="text-sm text-gray-500">
                            = <span className="font-semibold text-gray-800">{displayBoxes * ppb}</span> {item.unit_of_measure}
                        </span>
                    </div>
                    {error && (
                        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={11} /> {error}
                        </p>
                    )}
                </div>

                {/* Box config picker */}
                {configsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                        <Loader2 size={12} className="animate-spin" /> Loading shipment configs…
                    </div>
                ) : configs.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1">
                        <Boxes size={12} className="text-gray-300" />
                        {item.box_quantity} {item.unit_of_measure}/box (default)
                    </div>
                ) : (
                    <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                            Box Configuration
                        </p>
                        <div className="flex gap-1.5 flex-wrap">
                            {configs.map((cfg) => {
                                const isActive = selectedConfig?.id === cfg.id;
                                const label = cfg.poNumber ?? (cfg.poDate
                                    ? new Date(cfg.poDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                                    : `${cfg.piecesPerBox}/box`);
                                return (
                                    <button
                                        key={cfg.id}
                                        type="button"
                                        onClick={() => { setSelectedConfig(cfg); setConfigError(false); }}
                                        className={`flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-all ${
                                            isActive
                                                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                                                : configError
                                                  ? "border-red-300 bg-red-50 hover:border-red-400"
                                                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                                        }`}
                                    >
                                        <span className={`text-xs font-semibold leading-tight ${isActive ? "text-indigo-700" : "text-gray-700"}`}>
                                            {label}
                                        </span>
                                        <span className={`text-[10px] mt-0.5 ${isActive ? "text-indigo-500" : "text-gray-400"}`}>
                                            {cfg.piecesPerBox} {item.unit_of_measure}/box
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {configError && (
                            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={11} /> Choose a box config to continue
                            </p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        Add to order
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
