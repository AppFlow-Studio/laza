//super-admin/purchase-orders/new

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, Plus, Trash2, Ship,
    Package, Hash, Search, ChevronDown, Warehouse, AlertCircle,
} from "lucide-react";
import {
    useCreatePurchaseOrder,
    useUpsertPurchaseOrderItems,
    useWarehouseLocations,
} from "@/lib/hooks/queries/usePurchaseOrders";
import { useItems } from "@/lib/hooks/queries/useItems";
import { useUser, useOrganization } from "@clerk/nextjs";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem {
    _key:              string;
    item_id:           number | null;
    item_name:         string;
    quantity_ordered:  string;
    unit_price_before: string;
    pieces_per_box:    string;
    cbm:               string;
}

function emptyLine(): LineItem {
    return {
        _key:              crypto.randomUUID(),
        item_id:           null,
        item_name:         "",
        quantity_ordered:  "",
        unit_price_before: "",
        pieces_per_box:    "",
        cbm:               "",
    };
}

// ─── Item Picker ──────────────────────────────────────────────────────────────

interface Item {
    id: number;
    name: string;
    short_label: string | null;
    sku: string | null;
    box_quantity: number | null;
}

interface ItemPickerProps {
    items: Item[];
    selectedId: number | null;
    usedIds: number[];
    onSelect: (item: Item) => void;
    placeholder?: string;
}

function ItemPicker({ items, selectedId, usedIds, onSelect, placeholder = "Search items…" }: ItemPickerProps) {
    const [open, setOpen]   = useState(false);
    const [query, setQuery] = useState("");
    const ref               = useRef<HTMLDivElement>(null);

    const selected = items.find((i) => i.id === selectedId);

    const filtered = items.filter((i) => {
        const term = query.toLowerCase();
        return (
            i.name.toLowerCase().includes(term) ||
            i.short_label?.toLowerCase().includes(term) ||
            i.sku?.toLowerCase().includes(term)
        );
    });

    useEffect(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        if (open) document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => { setOpen((o) => !o); setQuery(""); }}
                className={`w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm text-left transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    selected ? "border-zinc-200 bg-white text-zinc-900" : "border-zinc-200 bg-white text-zinc-400"
                }`}
            >
                <span className="truncate">{selected ? (selected.short_label ?? selected.name) : placeholder}</span>
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2">
                        <Search className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by name or SKU…"
                            className="flex-1 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
                        />
                    </div>
                    <ul className="max-h-52 overflow-y-auto divide-y divide-zinc-50">
                        {filtered.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-zinc-400 text-center">No items found</li>
                        ) : (
                            filtered.map((item) => {
                                const isUsed     = usedIds.includes(item.id) && item.id !== selectedId;
                                const isSelected = item.id === selectedId;
                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            disabled={isUsed}
                                            onClick={() => { onSelect(item); setOpen(false); }}
                                            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                                                isSelected ? "bg-indigo-50 text-indigo-700" : isUsed ? "opacity-40 cursor-not-allowed text-zinc-500" : "hover:bg-zinc-50 text-zinc-800"
                                            }`}
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium truncate">{item.short_label ?? item.name}</p>
                                                {item.sku && <p className="text-xs text-zinc-400 truncate">{item.sku}</p>}
                                            </div>
                                            {item.box_quantity && (
                                                <span className="flex-shrink-0 text-xs text-zinc-400">{item.box_quantity}/box</span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─── NumInput ─────────────────────────────────────────────────────────────────

function NumInput({
                      value, onChange, placeholder, prefix, step = "any", min = "0", presets, className = "",
                  }: {
    value: string; onChange: (v: string) => void; placeholder: string;
    prefix?: string; step?: string; min?: string; presets?: number[]; className?: string;
}) {
    const [open, setOpen]  = useState(false);
    const closeTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleFocus() {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        if (presets && presets.length > 0) setOpen(true);
    }
    function handleBlur() { closeTimer.current = setTimeout(() => setOpen(false), 150); }
    function handlePresetClick(preset: number) {
        const current = parseFloat(value) || 0;
        onChange(String(current + preset));
        if (closeTimer.current) clearTimeout(closeTimer.current);
    }

    return (
        <div className={`relative ${className}`}>
            {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">{prefix}</span>}
            <input
                type="number" step={step} min={min} value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={handleFocus} onBlur={handleBlur} placeholder={placeholder}
                className={`w-full rounded-lg border border-zinc-200 bg-white py-2 text-right text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${prefix ? "pl-7 pr-3" : "px-3"}`}
            />
            {open && presets && presets.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                    {presets.map((preset) => (
                        <button key={preset} type="button" onMouseDown={(e) => { e.preventDefault(); handlePresetClick(preset); }}
                                className="flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-indigo-50">
                            <span className="text-xs text-zinc-400">+</span>
                            <span className="font-medium text-zinc-700">{preset.toLocaleString()}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── DateInput ────────────────────────────────────────────────────────────────

function DateInput({ value, onChange, className }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string }) {
    const [type, setType] = useState<"text" | "date">(value ? "date" : "text");
    return (
        <input
            type={type}
            value={value}
            placeholder="mm/dd/yyyy"
            onFocus={() => setType("date")}
            onBlur={() => { if (!value) setType("text"); }}
            onChange={onChange}
            className={className}
        />
    );
}

// ─── Box division validation ──────────────────────────────────────────────────

function boxDivisionError(qty: string, ppb: string): string | null {
    const q = parseFloat(qty);
    const p = parseFloat(ppb);
    if (!q || !p || p <= 0) return null;
    if (q % p !== 0) {
        return `Boxes must divide evenly. ${q.toLocaleString()} ÷ ${p} = ${(q / p).toFixed(2)}, which isn't a whole box.`;
    }
    return null;
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-600">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewPurchaseOrderGlobalPage() {
    const router           = useRouter();
    const { user }         = useUser();
    const { organization } = useOrganization();

    const [warehouseId,     setWarehouseId]     = useState("");
    const [poNumber,        setPoNumber]        = useState("");
    const [supplierName,    setSupplierName]    = useState("China Supplier");
    const [orderDate,       setOrderDate]       = useState("");
    const [expectedArrival, setExpectedArrival] = useState("");
    const [officeFee,       setOfficeFee]       = useState("");
    const [shippingFee,     setShippingFee]     = useState("");
    const [notes,           setNotes]           = useState("");
    const [lines,           setLines]           = useState<LineItem[]>([emptyLine()]);

    const { data: allItems      = [] } = useItems();
    const { data: warehouses    = [], isLoading: warehousesLoading } = useWarehouseLocations(organization?.id);

    const createPO     = useCreatePurchaseOrder();
    const upsertItems  = useUpsertPurchaseOrderItems();
    const isSubmitting = createPO.isPending || upsertItems.isPending;

    function updateLine(key: string, patch: Partial<LineItem>) {
        setLines((prev) => prev.map((l) => l._key === key ? { ...l, ...patch } : l));
    }
    function removeLine(key: string) {
        setLines((prev) => prev.length > 1 ? prev.filter((l) => l._key !== key) : prev);
    }
    function handleItemSelect(key: string, item: Item) {
        updateLine(key, { item_id: item.id, item_name: item.short_label ?? item.name, pieces_per_box: item.box_quantity ? String(item.box_quantity) : "" });
    }

    const usedItemIds    = lines.filter((l) => l.item_id !== null).map((l) => l.item_id as number);
    const subtotalBefore = lines.reduce((sum, l) => sum + (parseFloat(l.quantity_ordered) || 0) * (parseFloat(l.unit_price_before) || 0), 0);
    const totalCBM       = lines.reduce((sum, l) => sum + (parseFloat(l.cbm) || 0), 0);
    const offFee         = parseFloat(officeFee)  || 0;
    const shipFee        = parseFloat(shippingFee) || 0;
    const grandTotal     = subtotalBefore + offFee + shipFee;

    async function handleSubmit(saveAsDraft: boolean) {
        if (!user?.id || !organization?.id) { toast.error("Not authenticated"); return; }
        if (!warehouseId) { toast.error("Please select a warehouse"); return; }
        if (!poNumber.trim()) { toast.error("PO number is required"); return; }

        const validLines = lines.filter((l) => l.item_id !== null && l.quantity_ordered && l.unit_price_before);
        if (validLines.length === 0) { toast.error("Add at least one line item"); return; }
        if (lines.some((l) => l.quantity_ordered && !l.item_id)) { toast.error("Each row with a quantity must have an item selected"); return; }
        if (validLines.some((l) => boxDivisionError(l.quantity_ordered, l.pieces_per_box))) {
            toast.error("Fix box division errors before submitting");
            return;
        }

        try {
            const po = await createPO.mutateAsync({
                organization_id:       organization.id,
                po_number:             poNumber.trim(),
                supplier_name:         supplierName.trim() || "China Supplier",
                status:                saveAsDraft ? "draft" : "submitted",
                order_date:            orderDate       || null,
                expected_arrival:      expectedArrival || null,
                office_fee:            offFee,
                shipping_fee:          shipFee,
                subtotal_before:       subtotalBefore,
                total_cbm:             totalCBM || null,
                notes:                 notes.trim() || null,
                created_by:            user.id,
                warehouse_location_id: warehouseId,   // ← from dropdown
            });

            const poItems = validLines.map((l) => {
                const qty           = parseFloat(l.quantity_ordered);
                const unitPrice     = parseFloat(l.unit_price_before);
                const totalBefore   = qty * unitPrice;
                const cbm           = l.cbm ? parseFloat(l.cbm) : null;
                const cbmShare      = cbm && totalCBM > 0 ? cbm / totalCBM : null;
                const allocOffice   = cbmShare != null ? cbmShare * offFee  : null;
                const allocShipping = cbmShare != null ? cbmShare * shipFee : null;
                const totalAfter    = totalBefore + (allocOffice ?? 0) + (allocShipping ?? 0);
                const unitAfter     = qty > 0 ? totalAfter / qty : null;
                const ppb           = l.pieces_per_box ? parseInt(l.pieces_per_box) : null;
                const cartons       = ppb && qty ? qty / ppb : null;
                return {
                    purchase_order_id: po.id, item_id: l.item_id as number,
                    quantity_ordered: qty, unit_price_before: unitPrice, total_price_before: totalBefore,
                    pieces_per_box: ppb ?? 0, cartons, cbm, cbm_share: cbmShare,
                    allocated_office_fee: allocOffice, allocated_shipping_fee: allocShipping,
                    total_cost_after: totalAfter, unit_cost_after: unitAfter, quantity_received: null,
                };
            });

            await upsertItems.mutateAsync(poItems);
            toast.success(saveAsDraft ? "Draft saved" : "Purchase order submitted");
            router.push(`/super-admin/purchase-orders/${po.id}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        }
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Back */}
            <Link href="/super-admin/purchase-orders" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Purchase Orders
            </Link>

            {/* Page title */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <Ship className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900">New Purchase Order</h1>
                    <p className="text-sm text-zinc-400">China shipment / raw materials</p>
                </div>
            </div>

            {/* ── PO Header ── */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 space-y-5">
                <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-zinc-400" /> Order Details
                </h2>

                {/* Warehouse selector */}
                <Field label="Warehouse" required>
                    {warehousesLoading ? (
                        <div className="h-9 rounded-lg bg-zinc-100 animate-pulse" />
                    ) : warehouses.length === 0 ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            No warehouses found. Add a warehouse location first.
                        </div>
                    ) : (
                        <div className="relative">
                            <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                            <select
                                value={warehouseId}
                                onChange={(e) => setWarehouseId(e.target.value)}
                                className={`${inputCls} pl-9 appearance-none`}
                            >
                                <option value="">Select a warehouse…</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                        </div>
                    )}
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="PO Number" required>
                        <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g. PO-2026-001" className={inputCls} />
                    </Field>
                    <Field label="Supplier Name">
                        <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="China Supplier" className={inputCls} />
                    </Field>
                    <Field label="Order Date">
                        <DateInput value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Expected Arrival">
                        <DateInput value={expectedArrival} onChange={(e) => setExpectedArrival(e.target.value)} className={inputCls} />
                    </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100">
                    <Field label="Office / Agent Fee ($)">
                        <NumInput value={officeFee} onChange={setOfficeFee} placeholder="5400.00" prefix="$" step="0.01" presets={[1000, 5000, 10000]} />
                    </Field>
                    <Field label="Shipping / Freight Fee ($)">
                        <NumInput value={shippingFee} onChange={setShippingFee} placeholder="37500.00" prefix="$" step="0.01" presets={[1000, 5000, 10000]} />
                    </Field>
                </div>

                {(offFee > 0 || shipFee > 0) && (
                    <p className="text-xs text-zinc-500">
                        Total fees: <span className="font-medium text-zinc-900">${(offFee + shipFee).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>{" "}
                        — allocated proportionally by CBM across all line items
                    </p>
                )}

                <Field label="Notes">
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes..." className={`${inputCls} resize-none`} />
                </Field>
            </div>

            {/* ── Line Items ── */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm ">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                    <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                        <Package className="w-4 h-4 text-zinc-400" /> Line Items
                        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 text-xs font-medium">{lines.length}</span>
                    </h2>
                    <button onClick={() => setLines((p) => [...p, emptyLine()])}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-medium rounded-lg transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                </div>

                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-6 py-2 bg-zinc-50 border-b border-zinc-100 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    <span>Item <span className="text-red-400">*</span></span>
                    <span className="text-right">Qty Ordered <span className="text-red-400">*</span></span>
                    <span className="text-right">Unit Price ($) <span className="text-red-400">*</span></span>
                    <span className="text-right">Pcs / Box</span>
                    <span className="text-right">CBM</span>
                    <span />
                </div>

                <div className="divide-y divide-zinc-100">
                    {lines.map((line, idx) => (
                        <div key={line._key} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-6 py-4 items-start">
                            <div>
                                <label className="sm:hidden block text-xs text-zinc-400 mb-1">Item *</label>
                                <ItemPicker items={(allItems as any[]).filter(i => i.is_warehouse_item) as Item[]} selectedId={line.item_id} usedIds={usedItemIds}
                                            onSelect={(item) => handleItemSelect(line._key, item)} placeholder={`Select item ${idx + 1}…`} />
                                {!line.item_id && line.quantity_ordered && <p className="mt-1 text-xs text-red-500">Item required</p>}
                            </div>
                            <div>
                                <label className="sm:hidden block text-xs text-zinc-400 mb-1">Qty Ordered *</label>
                                <NumInput value={line.quantity_ordered} onChange={(v) => updateLine(line._key, { quantity_ordered: v })} placeholder="100000" step="1" presets={[100, 1000, 10000]} />
                            </div>
                            <div>
                                <label className="sm:hidden block text-xs text-zinc-400 mb-1">Unit Price ($) *</label>
                                <NumInput value={line.unit_price_before} onChange={(v) => updateLine(line._key, { unit_price_before: v })} placeholder="0.0900" prefix="$" step="0.0001" />
                            </div>
                            <div>
                                <label className="sm:hidden block text-xs text-zinc-400 mb-1">Pcs / Box</label>
                                <NumInput value={line.pieces_per_box} onChange={(v) => updateLine(line._key, { pieces_per_box: v })} placeholder="250" step="1" min="1" presets={[100, 250, 500]}
                                    className={boxDivisionError(line.quantity_ordered, line.pieces_per_box) ? "ring-2 ring-red-400 rounded-lg" : ""} />
                                {(() => {
                                    const err = boxDivisionError(line.quantity_ordered, line.pieces_per_box);
                                    if (err) return (
                                        <div>
                                            <p className="mt-1 text-xs text-red-500">{err}</p>
                                            <p className="mt-0.5 text-xs text-zinc-400">If your supplier invoice shows a decimal box count, it&apos;s likely a rounding error on their end.</p>
                                        </div>
                                    );
                                    if (line.item_id && !line.pieces_per_box) return <p className="mt-1 text-xs text-amber-500">Required for receiving</p>;
                                    return null;
                                })()}
                            </div>
                            <div>
                                <label className="sm:hidden block text-xs text-zinc-400 mb-1">CBM</label>
                                <NumInput value={line.cbm} onChange={(v) => updateLine(line._key, { cbm: v })} placeholder="22.4" step="0.001" />
                            </div>
                            <button onClick={() => removeLine(line._key)} disabled={lines.length === 1}
                                    className="mt-1 p-1.5 rounded-lg text-zinc-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Live totals */}
                <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 space-y-1.5">
                    <div className="flex justify-between text-sm text-zinc-500">
                        <span>Subtotal (before fees)</span>
                        <span className="font-medium text-zinc-700">${subtotalBefore.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm text-zinc-500">
                        <span>Total CBM</span>
                        <span className="font-medium text-zinc-700">{totalCBM.toFixed(4)}</span>
                    </div>
                    {(offFee > 0 || shipFee > 0) && (
                        <>
                            <div className="flex justify-between text-sm text-zinc-500"><span>Office fee</span><span>${offFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                            <div className="flex justify-between text-sm text-zinc-500"><span>Shipping fee</span><span>${shipFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                        </>
                    )}
                    <div className="flex justify-between text-sm font-semibold text-zinc-900 pt-1.5 border-t border-zinc-200">
                        <span>Grand Total</span>
                        <span>${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center justify-between pb-8">
                <Link href="/super-admin/purchase-orders" className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800 transition-colors">Cancel</Link>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleSubmit(true)} disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors disabled:opacity-50">
                        Save as Draft
                    </button>
                    <button onClick={() => handleSubmit(false)} disabled={isSubmitting}
                            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
                        {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Submit Order
                    </button>
                </div>
            </div>
        </div>
    );
}