"use client";

/**
 * TASK 3.9 — Employee Order Confirmation Flow
 * File: app/(dashboard)/employee/page.tsx  (replaces / extends existing Home)
 *
 * Adds an "Incoming Orders" section above the existing storage spaces grid.
 * Fulfilled tickets at the employee's location are shown as action cards.
 * Tapping "Confirm Receipt" opens ConfirmOrderSheet (teammate's component).
 *
 * What happens on confirmation (inside ConfirmOrderSheet → useConfirmTicket):
 *   1. confirm_order_receipt() RPC fires:
 *      - For each item: store item_locations.current_quantity += actual_boxes_received
 *      - inventory_log inserted (action_type: 'received', notes: 'Order ticket #X')
 *      - ticket status → 'confirmed', confirmed_by, confirmed_at set
 *   2. If actual ≠ expected: discrepancy logged in order_ticket_log notes
 *   3. React Query invalidates: tickets, inventory, inventoryLogs, employee-stats
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Package,
    Thermometer,
    Snowflake,
    Wind,
    CheckCircle2,
    Truck,
    ChevronRight,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useEmployeeLocation, useEmployeeStorageSpacesWithCounts, useEmployeeStats } from "@/lib/hooks/queries/useEmployee";
import { useTickets } from "@/lib/hooks/queries/useOrderTickets";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { ConfirmOrderSheet } from "@/components/orders/ConfirmOrderSheet";

// ─── Types ────────────────────────────────────────────────────────────────────
type StorageSpace = {
    id: string;
    name: string;
    temperature_type: "frozen" | "refrigerated" | "dry";
};

// Minimal shape we need from the fulfilled ticket
type FulfilledTicket = {
    id: string;
    fulfilled_at: string | null;
    order_ticket_items: {
        id: string;
        item_id: number;
        quantity_boxes: number; // ordered
        fulfilled_boxes: number | null; // what warehouse actually sent
        items: {
            id: number;
            name: string;
            short_label: string | null;
        } | null;
    }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shortId(uuid: string) {
    return `…${uuid.slice(-8).toUpperCase()}`;
}

function relativeDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diff / 3_600_000);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Greeting ─────────────────────────────────────────────────────────────────
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
}

// ─── Temperature badge ────────────────────────────────────────────────────────
function TempBadge({ type }: { type: "frozen" | "refrigerated" | "dry" }) {
    const config = {
        frozen: {
            label: "Frozen",
            icon: <Snowflake size={10} />,
            bg: "bg-blue-50 text-blue-700",
        },
        refrigerated: {
            label: "Refrigerated",
            icon: <Thermometer size={10} />,
            bg: "bg-sky-50 text-sky-700",
        },
        dry: {
            label: "Dry",
            icon: <Wind size={10} />,
            bg: "bg-amber-50 text-amber-700",
        },
    };
    const { label, icon, bg } = config[type];
    return (
        <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${bg}`}
        >
            {icon}
            {label}
        </span>
    );
}

// ─── Incoming order card ──────────────────────────────────────────────────────
function IncomingOrderCard({
    ticket,
    onConfirmPress,
}: {
    ticket: FulfilledTicket;
    onConfirmPress: (ticket: FulfilledTicket) => void;
}) {
    const itemCount = ticket.order_ticket_items.length;
    const totalBoxes = ticket.order_ticket_items.reduce(
        (s, i) => s + (i.fulfilled_boxes ?? i.quantity_boxes),
        0,
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <Truck size={9} /> Fulfilled
                        </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                        Order {shortId(ticket.id)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {ticket.fulfilled_at
                            ? relativeDate(ticket.fulfilled_at)
                            : "Recently"}{" "}
                        · {itemCount} item{itemCount !== 1 ? "s" : ""} ·{" "}
                        {totalBoxes} boxes
                    </p>
                </div>
                {/* Unread dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-violet-500 mt-1 flex-shrink-0" />
            </div>

            {/* Item preview chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {ticket.order_ticket_items.slice(0, 3).map((line) => {
                    const name =
                        line.items?.short_label ?? line.items?.name ?? "Item";
                    const boxes = line.fulfilled_boxes ?? line.quantity_boxes;
                    return (
                        <span
                            key={line.id}
                            className="bg-gray-100 text-gray-600 text-[11px] font-medium px-2 py-0.5 rounded-lg"
                        >
                            {name} × {boxes}
                        </span>
                    );
                })}
                {ticket.order_ticket_items.length > 3 && (
                    <span className="bg-gray-100 text-gray-400 text-[11px] font-medium px-2 py-0.5 rounded-lg">
                        +{ticket.order_ticket_items.length - 3} more
                    </span>
                )}
            </div>

            {/* CTA */}
            <button
                onClick={() => onConfirmPress(ticket)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-bold rounded-xl transition-all"
            >
                <CheckCircle2 size={15} />
                Confirm Receipt
            </button>
        </motion.div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EmployeeHomePage() {
    const router = useRouter();
    const { user } = useUser();

    const { data: userInfo } = useUserInfo();
    const { data: location } = useEmployeeLocation();
    const locationId = location?.id ?? "";

    const { data: storageSpaces } = useEmployeeStorageSpacesWithCounts(locationId);
    const { data: stats } = useEmployeeStats(
        userInfo?.id ?? "",
        locationId,
    );

    // ── Fulfilled tickets at this location ────────────────────────────────────
    // useTickets(locationId, { status: "fulfilled" }) scoped to this store.
    // RLS ensures employees only see their own location's tickets.
    // Only "fulfilled" status — employees confirm fulfilled, not other statuses.
    const { data: rawTickets } = useTickets(locationId, {
        status: "fulfilled",
    });
    const fulfilledTickets = (rawTickets ?? []) as FulfilledTicket[];

    // ── Sheet state ────────────────────────────────────────────────────────────
    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] =
        useState<FulfilledTicket | null>(null);

    function handleConfirmPress(ticket: FulfilledTicket) {
        setSelectedTicket(ticket);
        setSheetOpen(true);
    }

    function handleConfirmed(hasDiscrepancy: boolean) {
        // Sheet closes itself; navigate home or show a brief success state
        // The ticket will disappear from this list once React Query refetches
        // (useConfirmTicket invalidates ["tickets"] cache key)
        router.refresh();
    }

    // ── Address display ────────────────────────────────────────────────────────
    function formatAddress(raw: unknown): string {
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            const a = raw as Record<string, string>;
            return [a.street, a.city, a.state].filter(Boolean).join(", ");
        }
        return "";
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* ── Location header ── */}
            <div className="px-4 pt-10 pb-2">
                <p className="text-xl font-bold mb-6">
                    {getGreeting()}, {user?.firstName ?? "there"}
                </p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                    Your store
                </p>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {location?.name ?? "—"}
                </h1>
                {location?.address && (
                    <p className="text-xs text-gray-400 mt-0.5">
                        {formatAddress(location.address)}
                    </p>
                )}
            </div>

            {/* ── Quick stats ── */}
            <div className="flex gap-2.5 px-4 pt-4 pb-1 overflow-x-auto scrollbar-hide">
                {[
                    {
                        val:
                            // stats?.storageSpaceCount ??
                            storageSpaces?.length ??
                            0,
                        label: "Spaces",
                        bg: "bg-violet-50",
                        icon: <Package size={13} className="text-violet-600" />,
                    },
                    {
                        val: stats?.itemsManaged ?? 0,
                        label: "Items",
                        bg: "bg-green-50",
                        icon: (
                            <CheckCircle2
                                size={13}
                                className="text-green-600"
                            />
                        ),
                    },
                    // Incoming orders stat — highlighted if > 0
                    ...(fulfilledTickets.length > 0
                        ? [
                              {
                                  val: fulfilledTickets.length,
                                  label: "Incoming",
                                  bg: "bg-violet-100",
                                  icon: (
                                      <Truck
                                          size={13}
                                          className="text-violet-700"
                                      />
                                  ),
                                  highlight: true,
                              },
                          ]
                        : []),
                ].map(({ val, label, bg, icon, highlight }) => (
                    <div
                        key={label}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border flex-shrink-0 w-[49%] ${
                            highlight
                                ? "border-violet-300 bg-violet-100"
                                : `${bg} border-gray-200`
                        }`}
                    >
                        <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center ${bg}`}
                        >
                            {icon}
                        </div>
                        <div>
                            <div
                                className={`text-sm font-bold ${highlight ? "text-violet-700" : "text-gray-900"}`}
                            >
                                {val}
                            </div>
                            <div
                                className={`text-[10px] ${highlight ? "text-violet-600" : "text-gray-400"}`}
                            >
                                {label}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Incoming Orders section ─────────────────────────────────────────── */}
            {/* Only shown when there are fulfilled tickets waiting for confirmation */}
            {fulfilledTickets.length > 0 && (
                <div className="px-4 pt-5">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-gray-900">
                            Incoming Orders
                        </h2>
                        <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">
                            {fulfilledTickets.length}
                        </span>
                    </div>

                    <div className="flex flex-col gap-3">
                        {fulfilledTickets.map((ticket) => (
                            <IncomingOrderCard
                                key={ticket.id}
                                ticket={ticket}
                                onConfirmPress={handleConfirmPress}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Storage Spaces section ── */}
            <div className="px-4 pt-5">
                <h2 className="text-base font-bold text-gray-900 mb-3">
                    Storage Spaces
                </h2>

                {!storageSpaces || storageSpaces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                            <Package size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">
                            No storage spaces yet
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {(storageSpaces as any[]).map((space) => {
                            const itemLocs: any[] = space.item_locations ?? [];
                            const totalItems = itemLocs.length;
                            const lowStockCount = itemLocs.filter((il) => {
                                const min = il.min_quantity_override !== null && il.min_quantity_override !== undefined
                                    ? il.min_quantity_override
                                    : (il.items?.min_quantity ?? 0);
                                return (il.current_quantity ?? 0) <= min;
                            }).length;

                            return (
                            <motion.button
                                key={space.id}
                                whileTap={{ scale: 0.97 }}
                                onClick={() =>
                                    router.push(
                                        `/employee/storage-spaces/${space.id}`,
                                    )
                                }
                                className="bg-white border border-gray-200 rounded-2xl p-4 text-left active:bg-gray-50 transition-colors"
                            >
                                <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                                        space.temperature_type === "frozen"
                                            ? "bg-blue-50"
                                            : space.temperature_type ===
                                                "refrigerated"
                                              ? "bg-sky-50"
                                              : "bg-amber-50"
                                    }`}
                                >
                                    {space.temperature_type === "frozen" && (
                                        <Snowflake
                                            size={16}
                                            className="text-blue-600"
                                        />
                                    )}
                                    {space.temperature_type ===
                                        "refrigerated" && (
                                        <Thermometer
                                            size={16}
                                            className="text-sky-600"
                                        />
                                    )}
                                    {space.temperature_type === "dry" && (
                                        <Wind
                                            size={16}
                                            className="text-amber-600"
                                        />
                                    )}
                                </div>
                                <p className="text-sm font-bold text-gray-900 mb-1">
                                    {space.name}
                                </p>
                                <TempBadge type={space.temperature_type} />
                                <p className="text-xs text-gray-400 mt-1.5">
                                    {totalItems} item{totalItems !== 1 ? "s" : ""}
                                    {lowStockCount > 0 && (
                                        <span className="ml-1.5 text-red-500 font-semibold">
                                            · {lowStockCount} low
                                        </span>
                                    )}
                                </p>
                            </motion.button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── ConfirmOrderSheet — teammate's component (Task 3.9) ── */}
            {/* Opens as a bottom sheet when employee taps "Confirm Receipt"   */}
            {/* Calls useConfirmTicket() → confirm_order_receipt() RPC        */}
            {selectedTicket && (
                <ConfirmOrderSheet
                    open={sheetOpen}
                    onOpenChange={(open) => {
                        setSheetOpen(open);
                        if (!open) setSelectedTicket(null);
                    }}
                    ticketId={selectedTicket.id}
                    lineItems={selectedTicket.order_ticket_items.map(
                        (line) => ({
                            itemId: line.item_id,
                            itemName:
                                line.items?.short_label ??
                                line.items?.name ??
                                "Item",
                            // fulfilledBoxes is what the warehouse actually sent — this is
                            // what the employee should be counting, not quantity_boxes (ordered)
                            fulfilledBoxes:
                                line.fulfilled_boxes ?? line.quantity_boxes,
                        }),
                    )}
                    onConfirmed={handleConfirmed}
                />
            )}
        </div>
    );
}
