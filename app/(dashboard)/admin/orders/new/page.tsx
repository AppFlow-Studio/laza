"use client";

/**
 * TASK 3.2 — Store Admin: New Order Creation
 * File: app/(dashboard)/admin/orders/new/page.tsx
 */

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Search,
    Package,
    ShoppingCart,
    X,
    AlertCircle,
    Boxes,
    CheckCircle2,
    Loader2,
    Truck,
    Store,
} from "lucide-react";
import { toast } from "react-hot-toast";

// ─── Real hooks ───────────────────────────────────────────────────────────────
import {
    useWarehouseCatalog,
    useWarehouseLocation,
} from "@/lib/hooks/queries/useWarehouse";
import { useCategories } from "@/lib/hooks/queries/useCategories";
import { useCreateTicket } from "@/lib/hooks/queries/useOrderTickets";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { WarehouseCatalogItem } from "@/lib/supabase/queries/warehouse";
import { CreateTicketInput } from "@/lib/supabase/queries/orderTickets";
import { useOrganization } from "@clerk/nextjs";

// ─── Types ────────────────────────────────────────────────────────────────────

// delivery_type lives on order_tickets (added Task 1.43, Schema v2 Section 5.7)
// "company" → warehouse delivers, $65/pallet, payment hold placed at fulfillment
// "self"    → store self-pickup, $0 cost, skips in_transit status entirely
//             fulfilled → delivered → confirmed  (no in_transit step)
type DeliveryType = "company" | "self";

// Cart entry — only items WITH box_quantity can be added
type CartEntry = {
    item: WarehouseCatalogItem & { box_quantity: number }; // narrowed: non-null
    boxes: number; // INTEGER only — validated
};

// ─── Validation ───────────────────────────────────────────────────────────────
function validateBoxQty(val: string | number): {
    ok: boolean;
    value?: number;
    error?: string;
} {
    const n = Number(val);
    if (val === "" || val === null || val === undefined)
        return { ok: false, error: "Required" };
    if (!Number.isInteger(n))
        return { ok: false, error: "Whole boxes only — no decimals" };
    if (n < 1) return { ok: false, error: "Minimum 1 box" };
    if (n > 999) return { ok: false, error: "Maximum 999 boxes" };
    return { ok: true, value: n };
}

// ─── DeliveryTypeSelector ─────────────────────────────────────────────────────
function DeliveryTypeSelector({
    value,
    onChange,
}: {
    value: DeliveryType;
    onChange: (v: DeliveryType) => void;
}) {
    const options: {
        value: DeliveryType;
        label: string;
        sublabel: string;
        icon: React.ReactNode;
    }[] = [
        {
            value: "company",
            label: "Company delivery",
            sublabel: "Warehouse delivers to your store",
            icon: <Truck size={15} className="flex-shrink-0" />,
        },
        {
            value: "self",
            label: "Self-pickup",
            sublabel: "You collect directly from the warehouse",
            icon: <Store size={15} className="flex-shrink-0" />,
        },
    ];

    return (
        <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-gray-500">
                Delivery method
            </label>
            <div className="grid grid-cols-1 gap-2">
                {options.map((opt) => {
                    const active = value === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => onChange(opt.value)}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-100 ${
                                active
                                    ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                            <div
                                className={`mt-0.5 ${active ? "text-indigo-600" : "text-gray-400"}`}
                            >
                                {opt.icon}
                            </div>
                            <div className="min-w-0">
                                <div
                                    className={`text-xs font-semibold leading-tight ${active ? "text-indigo-700" : "text-gray-700"}`}
                                >
                                    {opt.label}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                                    {opt.sublabel}
                                </div>
                                {opt.value === "self" && active && (
                                    <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                                        No delivery cost
                                    </div>
                                )}
                                {opt.value === "company" && active && (
                                    <div className="text-[10px] text-amber-600 font-medium mt-1">
                                        Cost calculated at fulfillment
                                    </div>
                                )}
                            </div>
                            {/* Selected indicator dot */}
                            <div
                                className={`ml-auto mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${
                                    active
                                        ? "border-indigo-500 bg-indigo-500"
                                        : "border-gray-300 bg-white"
                                }`}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── CatalogItemRow ───────────────────────────────────────────────────────────
function CatalogItemRow({
    item,
    cartEntry,
    onAdd,
    onRemove,
    onQtyChange,
}: {
    item: WarehouseCatalogItem & { box_quantity: number };
    cartEntry?: CartEntry;
    onAdd: (
        item: WarehouseCatalogItem & { box_quantity: number },
        boxes: number,
    ) => void;
    onRemove: (itemId: number) => void;
    onQtyChange: (itemId: number, boxes: number) => void;
}) {
    const [inputVal, setInputVal] = useState(String(cartEntry?.boxes ?? 1));
    const [error, setError] = useState<string | null>(null);

    const inCart = !!cartEntry;
    const displayBoxes = parseInt(inputVal) || 1;

    const handleInputChange = (val: string) => {
        if (val.includes(".")) return;
        setInputVal(val);
        const v = validateBoxQty(val);
        setError(v.ok ? null : (v.error ?? null));
        if (v.ok && inCart) onQtyChange(item.id, v.value!);
    };

    const adjust = (delta: number) => {
        const next = Math.max(1, Math.min(999, displayBoxes + delta));
        setInputVal(String(next));
        setError(null);
        if (inCart) onQtyChange(item.id, next);
    };

    const handleAdd = () => {
        const v = validateBoxQty(inputVal);
        if (!v.ok) {
            setError(v.error ?? null);
            return;
        }
        setError(null);
        onAdd(item, v.value!);
    };

    return (
        <div
            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-100 ${
                inCart
                    ? "border-indigo-300 bg-indigo-50/40"
                    : "border-gray-200 bg-white hover:border-violet-200 hover:shadow-[0_1px_6px_rgba(99,102,241,0.07)]"
            }`}
        >
            {/* Item info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                        {item.name}
                    </span>
                    {inCart && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 size={9} /> In order
                        </span>
                    )}
                </div>
                {item.sku && (
                    <div className="mt-1">
                        <span
                            style={{
                                fontFamily: "var(--font-mono, monospace)",
                            }}
                            className="text-[10px] text-gray-400"
                        >
                            {item.sku}
                        </span>
                    </div>
                )}
                <div className="flex items-center gap-1 mt-1.5 text-[11px] text-gray-400">
                    <Boxes size={10} className="text-gray-300 flex-shrink-0" />
                    <span>
                        {item.box_quantity} {item.unit_of_measure} per box
                    </span>
                </div>
            </div>

            {/* Qty controls */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <div className="flex items-center">
                    <button
                        onClick={() => adjust(-1)}
                        className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-l-lg bg-white hover:bg-gray-50 hover:border-violet-300 hover:text-indigo-600 text-gray-500 text-sm font-medium transition-all"
                    >
                        −
                    </button>
                    <input
                        type="number"
                        min={1}
                        max={999}
                        step={1}
                        value={inputVal}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => {
                            if ([".", "e", "E", "-", "+"].includes(e.key))
                                e.preventDefault();
                        }}
                        className={`w-10 h-7 border-y text-center text-xs font-semibold text-gray-900 outline-none transition-all ${
                            error
                                ? "border-red-400 bg-red-50"
                                : "border-gray-200 bg-white focus:border-indigo-400"
                        }`}
                        style={
                            {
                                MozAppearance: "textfield",
                                appearance: "textfield",
                            } as React.CSSProperties
                        }
                    />
                    <button
                        onClick={() => adjust(1)}
                        className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-r-lg bg-white hover:bg-gray-50 hover:border-violet-300 hover:text-indigo-600 text-gray-500 text-sm font-medium transition-all"
                    >
                        +
                    </button>
                    <span className="ml-2 text-[11px] text-gray-400 w-16">
                        = {displayBoxes * item.box_quantity}{" "}
                        {item.unit_of_measure}
                    </span>
                </div>

                {error && (
                    <div className="flex items-center gap-1 text-[10px] text-red-500">
                        <AlertCircle size={9} /> {error}
                    </div>
                )}

                {inCart ? (
                    <button
                        onClick={() => onRemove(item.id)}
                        className="text-[11px] font-semibold text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                    >
                        <X size={10} /> Remove
                    </button>
                ) : (
                    <button
                        onClick={handleAdd}
                        className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors"
                    >
                        Add to order
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── CartRow ──────────────────────────────────────────────────────────────────
function CartRow({
    entry,
    onRemove,
}: {
    entry: CartEntry;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center gap-2.5 p-2.5 bg-white border border-gray-200 rounded-lg">
            <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Package size={11} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800 truncate">
                    {entry.item.name}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                    {entry.boxes} box{entry.boxes !== 1 ? "es" : ""} ·{" "}
                    <span className="text-indigo-600 font-semibold">
                        {entry.boxes * entry.item.box_quantity}{" "}
                        {entry.item.unit_of_measure}
                    </span>
                </div>
            </div>
            <button
                onClick={onRemove}
                className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded transition-all"
            >
                <X size={11} />
            </button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NewOrderPage() {
    const router = useRouter();

    // ── Auth / org context ──────────────────────────────────────────────────────
    const { data: userInfo } = useUserInfo();
    const requestingLocationId = userInfo?.assigned_location_id ?? ""; // exact column name
    const requestedBy = userInfo?.id ?? "";

    const { organization } = useOrganization();
    const organizationId = organization?.id ?? "";

    // ── Warehouse location ──────────────────────────────────────────────────────
    // getWarehouseLocation() filters location_type = 'warehouse'
    const { data: warehouseLocation } = useWarehouseLocation();
    const warehouseLocationId = warehouseLocation?.id ?? "";

    // ── Catalog — NO quantities by design ──────────────────────────────────────
    // getWarehouseCatalog() selects item details only (no item_locations join).
    // RLS also blocks store admins from reading warehouse current_quantity.
    const { data: rawCatalogItems, isLoading: catalogLoading } =
        useWarehouseCatalog();

    console.log(rawCatalogItems); // NO BOX_QUANTITY THERE COMING !!!!!!!!!!

    // ── Categories ──────────────────────────────────────────────────────────────
    const { data: categories } = useCategories();

    // ── Create ticket mutation ──────────────────────────────────────────────────
    // createTicket() → INSERT order_tickets + order_ticket_items + order_ticket_logs
    const { mutate: createTicket, isPending: isSubmitting } = useCreateTicket();

    // ── Local state ─────────────────────────────────────────────────────────────
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<number | "">("");
    const [cart, setCart] = useState<Record<number, CartEntry>>({});
    const [notes, setNotes] = useState("");

    // delivery_type on order_tickets (Task 1.43, Schema v2 §5.7)
    // "company" → warehouse delivers, cost est. at fulfillment ($65/pallet)
    // "self"    → store picks up, $0 cost, skips in_transit in the status flow
    const [deliveryType, setDeliveryType] = useState<DeliveryType>("company");

    // ── Filter: only items with box_quantity set are orderable ──────────────────
    const orderableItems = useMemo(
        () =>
            (rawCatalogItems ?? []).filter(
                (
                    item,
                ): item is WarehouseCatalogItem & { box_quantity: number } =>
                    item.box_quantity !== null && item.box_quantity > 0,
            ),
        [rawCatalogItems],
    );

    // ── Catalog filtering ────────────────────────────────────────────────────────
    const filteredItems = useMemo(() => {
        const q = search.toLowerCase();
        return orderableItems.filter((item) => {
            const matchSearch =
                !q ||
                item.name.toLowerCase().includes(q) ||
                (item.sku ?? "").toLowerCase().includes(q);
            // category_id is a direct BIGINT on the item row
            const matchCat =
                !categoryFilter ||
                item.category?.forEach(
                    (category) => category.id === categoryFilter,
                );
            return matchSearch && matchCat;
        });
    }, [orderableItems, search, categoryFilter]);

    // ── Cart stats ───────────────────────────────────────────────────────────────
    const cartEntries = Object.values(cart);
    const totalItems = cartEntries.length;
    const totalBoxes = cartEntries.reduce((s, e) => s + e.boxes, 0);
    const hasItems = totalItems > 0;

    // ── Cart handlers ────────────────────────────────────────────────────────────
    const handleAdd = useCallback(
        (
            item: WarehouseCatalogItem & { box_quantity: number },
            boxes: number,
        ) => {
            setCart((prev) => ({ ...prev, [item.id]: { item, boxes } }));
        },
        [],
    );

    const handleRemove = useCallback((itemId: number) => {
        setCart((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
        });
    }, []);

    const handleQtyChange = useCallback((itemId: number, boxes: number) => {
        setCart((prev) =>
            prev[itemId]
                ? { ...prev, [itemId]: { ...prev[itemId], boxes } }
                : prev,
        );
    }, []);

    // ── Build payload ────────────────────────────────────────────────────────────
    const buildPayload = (
        status: "draft" | "submitted",
    ): CreateTicketInput => ({
        organizationId,
        requestingLocationId,
        warehouseLocationId,
        requestedBy,
        initialStatus: status,
        // delivery_type stored on order_tickets row (Task 1.43)
        // Tells the fulfillment RPC and status flow which path to take:
        //   "company" → fulfilled → in_transit → delivered → confirmed
        //   "self"    → fulfilled → delivered → confirmed  (no in_transit)
        deliveryType,
        notes: notes.trim() || undefined,
        items: cartEntries.map((e) => ({
            itemId: e.item.id,
            quantityBoxes: e.boxes,
            quantityUnits: e.boxes * e.item.box_quantity, // pre-calculated for DB insert
        })),
    });

    // ── Guards ────────────────────────────────────────────────────────────────────
    const missingContext =
        !organizationId || !requestingLocationId || !warehouseLocationId;

    console.log(organizationId);
    console.log(requestingLocationId);
    console.log(warehouseLocationId);
    

    // ── Actions ──────────────────────────────────────────────────────────────────
    const handleDraft = async () => {
        if (missingContext) {
            toast.error("Missing location context — try refreshing");
            return;
        }
        try {
            await createTicket(buildPayload("draft"));
            toast.success("Draft saved");
            router.push("/admin/orders");
        } catch {
            toast.error("Failed to save draft");
        }
    };

    const handleSubmit = async () => {
        if (missingContext) {
            toast.error("Missing location context — try refreshing");
            return;
        }
        try {
            await createTicket(buildPayload("submitted"));
            toast.success("Order submitted to warehouse");
            router.push("/admin/orders");
        } catch {
            toast.error("Failed to submit order");
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen bg-white">
            {/* ── Top bar ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-violet-300 px-3 py-1.5 rounded-lg transition-all"
                >
                    <ArrowLeft size={12} /> Orders
                </button>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                        New Order
                    </h1>
                    <p className="text-[11px] text-gray-400">
                        Browse the warehouse catalog and build your order
                    </p>
                </div>
                {!warehouseLocationId && !catalogLoading && (
                    <div className="ml-auto flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                        <AlertCircle size={11} /> Warehouse not configured
                    </div>
                )}
            </div>

            {/* ── Two-column layout ── */}
            <div className="flex flex-1 min-h-0">
                {/* ── LEFT: Catalog ── */}
                <div className="flex-1 flex flex-col border-r border-gray-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
                        <div className="relative flex-1">
                            <Search
                                size={13}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                            />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or SKU…"
                                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(e) =>
                                setCategoryFilter(
                                    e.target.value
                                        ? Number(e.target.value)
                                        : "",
                                )
                            }
                            className="py-2 px-3 text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white text-gray-600 cursor-pointer transition-all"
                        >
                            <option value="">All categories</option>
                            {(categories ?? []).map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Item count */}
                    <div className="px-5 py-2 text-[11px] text-gray-300 flex-shrink-0">
                        {filteredItems.length} item
                        {filteredItems.length !== 1 ? "s" : ""} available to
                        order
                    </div>

                    {/* Items list */}
                    <div className="flex-1 overflow-y-auto px-5 pb-5">
                        {catalogLoading ? (
                            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-sm">
                                    Loading catalog…
                                </span>
                            </div>
                        ) : filteredItems.length === 0 &&
                          orderableItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                                    <Package
                                        size={18}
                                        className="text-gray-300"
                                    />
                                </div>
                                <p className="text-sm font-medium text-gray-400">
                                    No items in catalog
                                </p>
                                <p className="text-xs text-gray-300 mt-1">
                                    Items need a box_quantity set by the super
                                    admin before they can be ordered
                                </p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                                    <Search
                                        size={18}
                                        className="text-gray-300"
                                    />
                                </div>
                                <p className="text-sm font-medium text-gray-400">
                                    No items match
                                </p>
                                <p className="text-xs text-gray-300 mt-1">
                                    Try a different search or category
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 pt-1">
                                {filteredItems.map((item) => (
                                    <CatalogItemRow
                                        key={item.id}
                                        item={item}
                                        cartEntry={cart[item.id]}
                                        onAdd={handleAdd}
                                        onRemove={handleRemove}
                                        onQtyChange={handleQtyChange}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Order summary ── */}
                <div className="w-72 flex flex-col flex-shrink-0 bg-gray-50/50">
                    {/* Header + stats */}
                    <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-white flex-shrink-0">
                        <div className="flex items-center gap-2 mb-3">
                            <ShoppingCart
                                size={14}
                                className="text-indigo-500"
                            />
                            <span className="text-sm font-bold text-gray-900">
                                Order summary
                            </span>
                            {hasItems && (
                                <span className="ml-auto text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                    {totalItems}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { val: totalItems, label: "Line items" },
                                { val: totalBoxes, label: "Total boxes" },
                            ].map(({ val, label }) => (
                                <div
                                    key={label}
                                    className="bg-gray-100 rounded-lg px-3 py-2"
                                >
                                    <div className="text-lg font-bold text-gray-900 tracking-tight">
                                        {val}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                        {label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cart items */}
                    <div className="flex-1 overflow-y-auto px-3 py-3">
                        {!hasItems ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <ShoppingCart
                                    size={24}
                                    className="text-gray-200 mb-2"
                                />
                                <p className="text-xs font-medium text-gray-400">
                                    No items added yet
                                </p>
                                <p className="text-[11px] text-gray-300 mt-1">
                                    Browse the catalog and add box quantities
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {cartEntries.map((entry) => (
                                    <CartRow
                                        key={entry.item.id}
                                        entry={entry}
                                        onRemove={() =>
                                            handleRemove(entry.item.id)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Delivery type + notes + actions */}
                    <div className="px-3 pb-4 pt-3 border-t border-gray-100 bg-white flex-shrink-0 flex flex-col gap-3">
                        {/* Delivery type selector */}
                        <DeliveryTypeSelector
                            value={deliveryType}
                            onChange={setDeliveryType}
                        />

                        {/* Notes */}
                        <div>
                            <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                                Notes{" "}
                                <span className="font-normal text-gray-300">
                                    (optional)
                                </span>
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="e.g. Please prioritize Nutella…"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleSubmit}
                                disabled={
                                    !hasItems || isSubmitting || missingContext
                                }
                                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all hover:enabled:-translate-y-px hover:enabled:shadow-[0_4px_12px_rgba(99,102,241,.3)] flex items-center justify-center gap-2"
                            >
                                {isSubmitting && (
                                    <Loader2
                                        size={13}
                                        className="animate-spin"
                                    />
                                )}
                                Submit Order
                            </button>
                            <button
                                onClick={handleDraft}
                                disabled={
                                    !hasItems || isSubmitting || missingContext
                                }
                                className="w-full py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 text-sm font-semibold transition-all"
                            >
                                Save as Draft
                            </button>
                        </div>

                        <p className="text-[10px] text-gray-300 text-center leading-relaxed">
                            Submitting sends this order to the warehouse for
                            fulfillment. Store admins cannot see warehouse stock
                            levels.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
