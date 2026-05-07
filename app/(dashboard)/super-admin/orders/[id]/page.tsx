"use client";

/**
 * TASK 3.6 — Super Admin: Ticket Detail + Fulfillment
 * File: app/(dashboard)/super-admin/orders/[id]/page.tsx
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Loader2,
    Truck,
    Clock,
    Package,
    MapPin,
    Send,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    Boxes,
    Pencil,
    Check,
    X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import {
    useTicket,
    useFulfillTicket,
    usePartialFulfillTicket,
    useTicketItemCosts,
} from "@/lib/hooks/queries/useOrderTickets";
import {
    useWarehouseInventory,
    useWarehouseLocation,
} from "@/lib/hooks/queries/useWarehouse";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { RejectTicketDialog } from "@/components/orders/RejectTicketDialog";
import {
    getFriendlyErrorMessage,
    isStockConflictError,
    isConcurrentFulfillmentError,
} from "@/lib/utils/errorMessages";

// ─── Types ────────────────────────────────────────────────────────────────────
type TicketStatus =
    | "draft"
    | "submitted"
    | "processing"
    | "fulfilled"
    | "in_transit"
    | "delivered"
    | "confirmed"
    | "rejected"
    | "cancelled";

type TicketItem = {
    id: string;
    item_id: number;
    quantity_boxes: number;
    quantity_units: number;
    fulfilled_boxes: number | null;
    fulfilled_units: number | null;
    unit_price_at_time: number | null;
    price_locked_at: string | null;
    items: {
        id: number;
        name: string;
        sku: string | null;
        short_label: string | null;
        unit_of_measure: string;
        box_quantity: number | null;
    } | null;
};

type TicketLog = {
    id: string;
    previous_status: TicketStatus | null;
    new_status: TicketStatus;
    changed_by: string;
    notes: string | null;
    created_at: string;
};

type Ticket = {
    id: string;
    organization_id: string;
    requesting_location_id: string;
    warehouse_location_id: string;
    status: TicketStatus;
    requested_by: string;
    processed_by: string | null;
    confirmed_by: string | null;
    rejection_reason: string | null;
    notes: string | null;
    title: string | null;
    delivery_type: "company" | "self" | null;
    submitted_at: string | null;
    fulfilled_at: string | null;
    confirmed_at: string | null;
    created_at: string;
    updated_at: string;
    is_auto_approved: boolean;
    parent_ticket_id: string | null;
    requesting_location: { id: string; name: string; address: unknown } | null;
    warehouse_location: { id: string; name: string } | null;
    order_ticket_items: TicketItem[];
    order_ticket_logs: TicketLog[];
    ticket_deliveries: unknown[];
};

type WarehouseStockRow = {
    item_id: number;
    box_count: number;
    total_pieces: number | null;
    item_name: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shortId(uuid: string) {
    return `…${uuid.slice(-8).toUpperCase()}`;
}
function formatDate(iso: string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(iso));
}
function formatDateShort(iso: string) {
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(iso));
}
function parseAddress(raw: unknown): string {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const a = raw as Record<string, string>;
        return [a.street, a.city, a.state].filter(Boolean).join(", ") || "—";
    }
    if (typeof raw === "string") {
        try {
            const a = JSON.parse(raw) as Record<string, string>;
            return (
                [a.street, a.city, a.state].filter(Boolean).join(", ") || "—"
            );
        } catch {}
    }
    return "—";
}
function getStockStatus(
    line: TicketItem,
    stockMap: Map<number, number>,
): "ok" | "partial" | "none" {
    const stock = stockMap.get(line.item_id) ?? 0;
    console.log(stock, line)
    if (stock === 0) return "none";
    if (stock < line.quantity_units) return "partial";
    return "ok";
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<
    TicketStatus,
    { label: string; dot: string; badge: string }
> = {
    draft: {
        label: "Draft",
        dot: "bg-gray-300",
        badge: "bg-gray-100 text-gray-500",
    },
    submitted: {
        label: "Submitted",
        dot: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700",
    },
    processing: {
        label: "Processing",
        dot: "bg-yellow-500",
        badge: "bg-yellow-50 text-yellow-700",
    },
    fulfilled: {
        label: "Fulfilled",
        dot: "bg-violet-500",
        badge: "bg-violet-50 text-violet-700",
    },
    in_transit: {
        label: "In Transit",
        dot: "bg-indigo-500",
        badge: "bg-indigo-50 text-indigo-700",
    },
    delivered: {
        label: "Delivered",
        dot: "bg-teal-500",
        badge: "bg-teal-50 text-teal-700",
    },
    confirmed: {
        label: "Confirmed",
        dot: "bg-green-500",
        badge: "bg-green-50 text-green-700",
    },
    rejected: {
        label: "Rejected",
        dot: "bg-red-500",
        badge: "bg-red-50 text-red-700",
    },
    cancelled: {
        label: "Cancelled",
        dot: "bg-gray-300",
        badge: "bg-gray-100 text-gray-400",
    },
};

// ─── Inline title editor ──────────────────────────────────────────────────────
function TitleEditor({ ticket }: { ticket: Ticket }) {
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(ticket.title ?? "");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    const { mutate: saveTitle, isPending } = useMutation({
        mutationFn: async (newTitle: string) => {
            const { data, error } = await supabase
                .from("order_tickets")
                .update({ title: newTitle.trim() || null })
                .eq("id", ticket.id)
                .select("id, title");
            if (error) throw error;
            if (!data || data.length === 0)
                throw new Error(
                    "Update blocked — check RLS policy on order_tickets UPDATE",
                );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
            toast.success("Title saved");
            setEditing(false);
        },
        onError: (err: any) => {
            console.error("Title update failed:", err?.message);
            toast.error("Failed to save title");
        },
    });

    const handleSave = () => {
        if (value.trim() === (ticket.title ?? "")) {
            setEditing(false);
            return;
        }
        saveTitle(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") {
            setValue(ticket.title ?? "");
            setEditing(false);
        }
    };

    if (editing) {
        return (
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add order title…"
                    className="text-lg font-bold text-gray-900 bg-transparent border-b-2 border-indigo-400 outline-none w-full max-w-sm placeholder:text-gray-300 placeholder:font-normal placeholder:text-base"
                />
                <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 flex-shrink-0 transition-colors"
                >
                    {isPending ? (
                        <Loader2 size={10} className="animate-spin" />
                    ) : (
                        <Check size={10} />
                    )}
                </button>
                <button
                    onClick={() => {
                        setValue(ticket.title ?? "");
                        setEditing(false);
                    }}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex-shrink-0 transition-colors"
                >
                    <X size={10} />
                </button>
            </div>
        );
    }

    if (ticket.title) {
        return (
            <div className="flex items-center gap-2 min-w-0 flex-1 group">
                <div className="min-w-0">
                    <h1 className="text-lg font-bold text-gray-900 truncate">
                        {ticket.title}
                    </h1>
                    <p
                        className="text-[11px] text-gray-400"
                        style={{ fontFamily: "var(--font-mono, monospace)" }}
                    >
                        {shortId(ticket.id)}
                    </p>
                </div>
                <button
                    onClick={() => setEditing(true)}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex-shrink-0"
                    title="Edit title"
                >
                    <Pencil size={11} />
                </button>
            </div>
        );
    }

    // No title
    return (
        <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="min-w-0">
                <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-600 transition-colors group"
                >
                    <span className="text-sm font-medium italic">
                        Add title
                    </span>
                    <Pencil
                        size={11}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                </button>
                <p
                    className="text-[11px] text-gray-400 mt-0.5"
                    style={{ fontFamily: "var(--font-mono, monospace)" }}
                >
                    {shortId(ticket.id)}
                </p>
            </div>
        </div>
    );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
    const { label, badge } = STATUS_META[status] ?? STATUS_META.draft;
    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge}`}
        >
            {label}
        </span>
    );
}

// ── Availability banner ───────────────────────────────────────────────────────
function AvailabilityBanner({
    allOk,
    allNone,
    partialCount,
    isStale,
    onRefresh,
    isRefreshing,
}: {
    allOk: boolean;
    allNone: boolean;
    partialCount: number;
    isStale: boolean;
    onRefresh: () => void;
    isRefreshing: boolean;
}) {
    if (isStale)
        return (
            <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs">
                <AlertCircle
                    size={14}
                    className="flex-shrink-0 mt-0.5 text-blue-500"
                />
                <div className="flex-1">
                    <strong>Stock changed since this page loaded.</strong>{" "}
                    Quantities have been refreshed automatically — review before
                    fulfilling.
                </div>
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 border border-blue-300 bg-white rounded-lg px-2.5 py-1 hover:bg-blue-50 transition-colors flex-shrink-0"
                >
                    <RefreshCw
                        size={10}
                        className={isRefreshing ? "animate-spin" : ""}
                    />{" "}
                    Refresh
                </button>
            </div>
        );
    if (allOk)
        return (
            <div className="flex items-center gap-2.5 p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs">
                <CheckCircle2
                    size={14}
                    className="flex-shrink-0 text-green-600"
                />
                <span>All items available — ready to fulfill.</span>
            </div>
        );
    if (allNone)
        return (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                <XCircle
                    size={14}
                    className="flex-shrink-0 mt-0.5 text-red-500"
                />
                <span>
                    None of the requested items are in stock. Reject this order
                    or wait for warehouse restock.
                </span>
            </div>
        );
    return (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            <AlertCircle
                size={14}
                className="flex-shrink-0 mt-0.5 text-amber-600"
            />
            <span>
                <strong>
                    {partialCount} item{partialCount !== 1 ? "s have" : " has"}{" "}
                    insufficient stock.
                </strong>{" "}
                Use "Partial Fulfill" to send what's available and auto-create a
                remainder ticket for the rest.
            </span>
        </div>
    );
}

// ── Items table ───────────────────────────────────────────────────────────────
function ItemsTable({
    ticket,
    stockMap,
    costMap,
}: {
    ticket: Ticket;
    stockMap: Map<number, number>;
    costMap: Map<number, number>;
}) {
    const { status, order_ticket_items: lines } = ticket;
    const isPriceLocked = status !== "draft";
    const isActionable = status === "submitted" || status === "processing";

    const priceLockTimestamp = lines.find((i) => i.price_locked_at)?.price_locked_at;

    // Columns: Item | Unit price | Qty | Line total | Unit cost | Line cost | Margin | [Stock]
    const cols = isActionable
        ? "1fr 95px 75px 90px 90px 90px 105px 80px 90px"
        : "1fr 95px 75px 90px 90px 90px 105px 80px";
    const headers = isActionable
        ? ["Item", "Unit price", "Qty Boxes","Qty Units", "Line total", "Unit cost", "Line cost", "Margin", "Stock"]
        : ["Item", "Unit price", "Qty Boxes","Qty Units", "Line total", "Unit cost", "Line cost", "Margin"];

    const fmt = (n: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

    const totalBilled = lines.reduce((sum, item) => {
        if (!item.unit_price_at_time) return sum;
        const qty = item.fulfilled_units ?? item.quantity_units;
        return sum + item.unit_price_at_time * qty;
    }, 0);

    console.log('map',costMap)
    const totalCost = lines.reduce((sum, item) => {
        const unitCost = costMap.get(item.item_id);
        console.log('item', item)
        if (!unitCost) return sum;
        const qty = item.fulfilled_units ?? item.quantity_units;
        return sum + unitCost * qty;
    }, 0);
    console.log('totalCost', totalCost)

    const totalMargin = totalBilled - totalCost;
    const marginPct = totalCost > 0 ? (totalMargin / totalCost) * 100 : null;

    console.log(totalCost, totalBilled, totalMargin, marginPct);
    return (
        <div className="flex flex-col gap-2">
            {/* Prices locked callout */}
            {isPriceLocked && priceLockTimestamp && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1.5V4.5A3.5 3.5 0 0 0 8 1zm-2 3.5a2 2 0 1 1 4 0V6H6V4.5z" />
                    </svg>
                    <span>
                        Prices locked on{" "}
                        <strong>
                            {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(priceLockTimestamp))}
                        </strong>{" "}
                        at{" "}
                        <strong>
                            {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(priceLockTimestamp))}
                        </strong>
                    </span>
                </div>
            )}

            <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100" style={{ gridTemplateColumns: cols }}>
                    {headers.map((h) => (
                        <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</span>
                    ))}
                </div>

                {/* Rows */}
                {lines.map((line) => {
                    console.log(line)
                    const name = line.items?.short_label ?? line.items?.name ?? "Unknown";
                    const sku = line.items?.sku;
                    const qtyUnits = line.fulfilled_units ?? line.quantity_units;
                    const qtyBox = line.fulfilled_boxes ?? line.quantity_boxes;
                    const unitPrice = line.unit_price_at_time;
                    const lineTotal = line.line_total;
                    const unitCost = line.unit_cost_at_time;
                    const lineCost = line.line_cost;
                    const margin = lineTotal != null && lineCost != null ? lineTotal - lineCost : null;

                    const stockStatus = getStockStatus(line, stockMap);
                    const stockPill = stockStatus === "ok"
                        ? <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Available</span>
                        : stockStatus === "partial"
                        ? <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Partial</span>
                        : <span className="text-[10px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">No stock</span>;

                    const rowBg = isActionable
                        ? stockStatus === "ok" ? "bg-green-50/30" : stockStatus === "partial" ? "bg-amber-50/30" : "bg-red-50/30"
                        : "";

                    return (
                        <div
                            key={line.id}
                            className={`grid gap-3 items-center px-4 py-3 border-b border-gray-50 last:border-0 ${rowBg}`}
                            style={{ gridTemplateColumns: cols }}
                        >
                            <div>
                                <div className="text-sm font-semibold text-gray-900">{name}</div>
                                {sku && (
                                    <div style={{ fontFamily: "var(--font-mono, monospace)" }} className="text-[10px] text-gray-400 mt-0.5">
                                        {sku}
                                    </div>
                                )}
                            </div>
                            <div className="text-sm font-medium text-gray-700">
                                {unitPrice != null ? fmt(unitPrice) : <span className="text-gray-300">—</span>}
                            </div>
                            <div className="text-sm text-gray-600">{qtyBox} boxes</div>
                            <div className="text-sm text-gray-600">{qtyUnits} units</div>
                            <div className="text-sm font-semibold text-gray-900">
                                {lineTotal != null ? fmt(lineTotal) : <span className="text-gray-300">—</span>}
                            </div>
                            <div className="text-sm text-gray-500">
                                {unitCost != null ? fmt(unitCost) : <span className="text-gray-300">—</span>}
                            </div>
                            <div className="text-sm text-gray-500">
                                {lineCost != null ? fmt(lineCost) : <span className="text-gray-300">—</span>}
                            </div>
                            <div className={`text-sm font-semibold ${margin != null ? (margin > 0 ? "text-green-600" : "text-red-500") : "text-gray-300"}`}>
                                {margin != null ? fmt(margin) : "—"}
                            </div>
                            {isActionable && <div>{stockPill}</div>}
                        </div>
                    );
                })}

                {/* Footer */}
                {isPriceLocked && (
                    <div
                        className="grid gap-3 items-center px-4 py-3 bg-gray-50 border-t border-gray-100"
                        style={{ gridTemplateColumns: cols }}
                    >
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            {status === "fulfilled" || status === "confirmed" ? "Total billed" : "Subtotal"}
                        </div>
                        <div />
                        <div />
                        <div />
                        <div className="text-sm font-bold text-gray-900">{totalBilled > 0 ? fmt(totalBilled) : ""}</div>
                        <div />
                        <div className="text-sm font-semibold text-gray-700">{totalCost > 0 ? fmt(totalCost) : ""}</div>
                        <div className={`text-sm font-bold ${totalMargin > 0 ? "text-green-600" : totalMargin < 0 ? "text-red-500" : "text-gray-400"}`}>
                            {totalCost > 0 ? (
                                <>
                                    {fmt(totalMargin)}{" "}
                                    {marginPct != null && (
                                        <span className="text-[10px] font-semibold">({marginPct.toFixed(1)}%)</span>
                                    )}
                                </>
                            ) : ""}
                        </div>
                        {isActionable && <div />}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Activity log ──────────────────────────────────────────────────────────────
function ActivityLog({ logs }: { logs: TicketLog[] }) {
    if (!logs.length)
        return (
            <p className="text-xs text-gray-400 py-4 text-center">
                No activity yet.
            </p>
        );
    return (
        <div className="flex flex-col">
            {logs.map((log, i) => {
                const meta = STATUS_META[log.new_status] ?? STATUS_META.draft;
                const isLast = i === logs.length - 1;
                return (
                    <div key={log.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${meta.dot}`}
                            />
                            {!isLast && (
                                <div className="w-px flex-1 bg-gray-100 my-1" />
                            )}
                        </div>
                        <div className="pb-4 flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800">
                                {meta.label}
                            </div>
                            {log.notes && (
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                    {log.notes}
                                </div>
                            )}
                            <div className="text-[11px] text-gray-400 mt-0.5">
                                {formatDate(log.created_at)}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SuperAdminTicketDetailPage() {
    const router = useRouter();
    const params = useParams();
    const ticketId = params.id as string;

    const { data: userInfo } = useUserInfo();
    const { data: warehouseLocation } = useWarehouseLocation();

    const {
        data: rawTicket,
        isLoading: ticketLoading,
        refetch: refetchTicket,
    } = useTicket(ticketId);
    const ticket = rawTicket as Ticket | undefined;

    const warehouseLocationId = ticket?.warehouse_location_id ?? "";
    const {
        data: warehouseStock,
        isLoading: stockLoading,
        refetch: refetchStock,
    } = useWarehouseInventory(warehouseLocationId);

    console.log("stock" , warehouseStock)

    const { mutate: fulfillAll, isPending: isFulfillingAll } =
        useFulfillTicket();
    const { mutate: fulfillPartial, isPending: isFulfillingPartial } =
        usePartialFulfillTicket();

    const [isStaleData, setIsStaleData] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const stockMap = useMemo(() => {
        const map = new Map<number, number>();
        (warehouseStock as WarehouseStockRow[] | undefined)?.forEach((row) => {
            const pieces = row.total_pieces ?? 0;
            map.set(row.item_id, (map.get(row.item_id) ?? 0) + pieces);
        });
        return map;
    }, [warehouseStock]);

    const itemIds = useMemo(
        () => ticket?.order_ticket_items.map((i) => i.item_id) ?? [],
        [ticket],
    );
    const { data: itemCosts = [] } = useTicketItemCosts(itemIds, itemIds.length > 0);
    const costMap = useMemo(() => {
        const map = new Map<number, number>();
        itemCosts.forEach((r) => {
            if (r.current_unit_cost != null) map.set(r.id, r.current_unit_cost);
        });
        return map;
    }, [itemCosts]);

    const lines = ticket?.order_ticket_items ?? [];
    const allOk =
        lines.length > 0 &&
        lines.every((l) => getStockStatus(l, stockMap) === "ok");
    const anyOk = lines.some((l) => getStockStatus(l, stockMap) !== "none");
    const allNone =
        lines.length > 0 &&
        lines.every((l) => getStockStatus(l, stockMap) === "none");
    const partialCount = lines.filter(
        (l) => getStockStatus(l, stockMap) !== "ok",
    ).length;
    const totalBoxes = lines.reduce((s, l) => s + l.quantity_boxes, 0);
    const isBusy = isFulfillingAll || isFulfillingPartial;
    const canFulfillAll = allOk && !isBusy && !isStaleData;
    const canFulfillPartial = anyOk && !allOk && !isBusy && !isStaleData;
    const isLoading = ticketLoading || stockLoading;

    async function handleRefresh() {
        setIsRefreshing(true);
        await Promise.all([refetchTicket(), refetchStock()]);
        setIsStaleData(false);
        setIsRefreshing(false);
    }

    function handleFulfillError(err: Error) {
        const msg = err.message ?? "";
        if (isStockConflictError(msg)) {
            setIsStaleData(true);
            handleRefresh();
            toast.error(
                "Stock levels have changed. Data is being refreshed — please review and try again.",
            );
        } else if (isConcurrentFulfillmentError(msg)) {
            setIsStaleData(true);
            handleRefresh();
            toast.error(
                "This ticket was already fulfilled or modified. Refreshing data...",
            );
        } else {
            toast.error(getFriendlyErrorMessage(err));
        }
    }

    function handleFulfillAll() {
        if (!userInfo?.id) return;
        fulfillAll(
            { ticketId, adminUserId: userInfo.id, allowPartial: false },
            {
                onSuccess: () => {
                    toast.success("Order fulfilled successfully");
                    router.push("/super-admin/orders");
                },
                onError: handleFulfillError,
            },
        );
    }

    function handleFulfillPartial() {
        if (!userInfo?.id) return;
        fulfillPartial(
            { ticketId, adminUserId: userInfo.id },
            {
                onSuccess: (result: any) => {
                    if (result?.remainder_ticket_id)
                        toast.success(
                            "Partially fulfilled. Remainder ticket created for shortfall.",
                            { duration: 5000 },
                        );
                    else toast.success("Order fulfilled");
                    router.push("/super-admin/orders");
                },
                onError: handleFulfillError,
            },
        );
    }

    if (isLoading)
        return (
            <div className="flex items-center justify-center min-h-[400px] gap-2 text-gray-400">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Loading order…</span>
            </div>
        );

    if (!ticket)
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
                <Package size={32} className="text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-500 mb-1">
                    Order not found
                </p>
                <button
                    onClick={() => router.back()}
                    className="text-xs text-indigo-600 underline"
                >
                    ← Back to orders
                </button>
            </div>
        );

    const { status } = ticket;
    const isActionable = status === "submitted" || status === "processing";

    return (
        <div className="min-h-screen bg-white">
            {/* ── Stale data banner ── */}
            {isStaleData && (
                <div className="flex items-center gap-2 px-6 py-2.5 bg-blue-50 border-b border-blue-200 text-xs text-blue-800 font-medium">
                    <AlertCircle
                        size={13}
                        className="text-blue-500 flex-shrink-0"
                    />
                    Stock changed since this page loaded — quantities have been
                    refreshed.
                    <button
                        onClick={() => setIsStaleData(false)}
                        className="ml-auto text-blue-700 hover:text-blue-900 font-semibold"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* ── Top bar ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                {/* Back button */}
                <button
                    onClick={() => router.push("/super-admin/orders")}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-violet-300 px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
                >
                    <ArrowLeft size={12} /> Orders
                </button>

                {/* Title editor — shows title or "Add title" + ticket ID as subtitle */}
                <TitleEditor ticket={ticket} />

                {/* Status badge + auto-approved */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={status} />
                    {ticket.is_auto_approved && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Auto-approved
                        </span>
                    )}
                </div>

                {/* Fulfillment actions */}
                {isActionable && (
                    <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                        <RejectTicketDialog
                            ticketId={ticket.id}
                            onRejected={() =>
                                router.push("/super-admin/orders")
                            }
                        />
                        <button
                            onClick={handleFulfillPartial}
                            disabled={!canFulfillPartial}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
                        >
                            {isFulfillingPartial ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : (
                                <Boxes size={13} />
                            )}
                            Partial Fulfill
                        </button>
                        <button
                            onClick={handleFulfillAll}
                            disabled={!canFulfillAll}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all hover:enabled:-translate-y-px hover:enabled:shadow-[0_4px_12px_rgba(5,150,105,.3)]"
                        >
                            {isFulfillingAll ? (
                                <Loader2 size={13} className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={13} />
                            )}
                            Fulfill All
                        </button>
                    </div>
                )}
            </div>

            {/* ── Body ── */}
            <div className="px-6 py-5 flex flex-col gap-4">

                {/* Remainder-of banner */}
                {ticket.parent_ticket_id && (
                    <Link
                        href={`/super-admin/orders/${ticket.parent_ticket_id}`}
                        className="flex items-center gap-2.5 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                        <Package size={13} className="text-violet-400 flex-shrink-0" />
                        <span>Remainder of order</span>
                        <span
                            className="text-violet-400 font-normal"
                            style={{ fontFamily: "var(--font-mono, monospace)" }}
                        >
                            {shortId(ticket.parent_ticket_id)}
                        </span>
                        <span className="text-violet-400 font-normal">— auto-created for the unfulfilled portion</span>
                        <ChevronRight size={13} className="ml-auto text-violet-300 flex-shrink-0" />
                    </Link>
                )}

                {/* 4-col metadata card */}
                <div className="grid grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-white px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Store</p>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                            <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                            {ticket.requesting_location?.name ?? "—"}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 ml-[18px]">
                            {parseAddress(ticket.requesting_location?.address)}
                        </p>
                    </div>
                    <div className="bg-white px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Submitted by</p>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700 flex-shrink-0">
                                {(ticket.requested_by ?? "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Store Admin</p>
                                <p className="text-xs text-gray-400">
                                    {ticket.submitted_at ? formatDate(ticket.submitted_at) : "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Delivery</p>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                            <Truck size={13} className="text-gray-400 flex-shrink-0" />
                            {ticket.delivery_type === "self" ? "Self-pickup" : "Company delivery"}
                        </div>
                        {ticket.delivery_type !== "self" && (
                            <p className="text-xs text-gray-400 mt-0.5 ml-[18px]">Cost calculated at fulfillment</p>
                        )}
                    </div>
                    <div className="bg-white px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Order summary</p>
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-lg font-bold text-gray-900 leading-none">{lines.length}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">items</p>
                            </div>
                            <div className="w-px h-8 bg-gray-200" />
                            <div>
                                <p className="text-lg font-bold text-gray-900 leading-none">{totalBoxes}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">boxes</p>
                            </div>
                        </div>
                        <p
                            className="text-[10px] text-gray-400 mt-2"
                            style={{ fontFamily: "var(--font-mono, monospace)" }}
                        >
                            {shortId(ticket.id)}
                        </p>
                    </div>
                </div>

                {/* Availability banner + stock chips (actionable only) */}
                {isActionable && (
                    <div className="flex items-stretch gap-3">
                        <div className="flex-1">
                            <AvailabilityBanner
                                allOk={allOk}
                                allNone={allNone}
                                partialCount={partialCount}
                                isStale={isStaleData}
                                onRefresh={handleRefresh}
                                isRefreshing={isRefreshing}
                            />
                        </div>
                        <div className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl flex-shrink-0">
                            {[
                                {
                                    label: "Available",
                                    count: lines.filter((l) => getStockStatus(l, stockMap) === "ok").length,
                                    chip: "bg-green-100 text-green-700",
                                },
                                {
                                    label: "Partial",
                                    count: lines.filter((l) => getStockStatus(l, stockMap) === "partial").length,
                                    chip: "bg-amber-100 text-amber-700",
                                },
                                {
                                    label: "No stock",
                                    count: lines.filter((l) => getStockStatus(l, stockMap) === "none").length,
                                    chip: "bg-red-100 text-red-700",
                                },
                            ].map(({ label, count, chip }) => (
                                <div key={label} className="flex flex-col items-center gap-1">
                                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${chip}`}>
                                        {count}
                                    </span>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{label}</span>
                                </div>
                            ))}
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="ml-2 text-[10px] text-gray-400 hover:text-indigo-600 flex flex-col items-center gap-1 transition-colors"
                                title="Refresh warehouse stock"
                            >
                                <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Items table — full width */}
                <ItemsTable ticket={ticket} stockMap={stockMap} costMap={costMap} />

                {isActionable && (
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                        ⚠ Warehouse stock shown above reflects quantities at page load ({new Date().toLocaleTimeString()}).
                        The fulfillment RPC re-verifies stock at execution time.
                    </p>
                )}

                {ticket.notes && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                            Notes from store
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">{ticket.notes}</p>
                    </div>
                )}

                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                        Activity log
                    </p>
                    <ActivityLog logs={ticket.order_ticket_logs ?? []} />
                </div>
            </div>
        </div>
    );
}
