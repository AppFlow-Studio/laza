"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Package,
    Plus,
    ChevronRight,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Send,
    Archive,
    FileEdit,
    Truck,
    Search,
    CalendarDays,
    LayoutGrid,
    List,
    MapPin,
} from "lucide-react";
import { useAllTickets } from "@/lib/hooks/queries/useOrderTickets";
import { useOrganization } from "@clerk/nextjs";

// ─── Types ────────────────────────────────────────────────────────────────────
type TicketStatus =
    | "draft"
    | "submitted"
    | "processing"
    | "fulfilled"
    | "confirmed"
    | "rejected"
    | "cancelled";

type ViewMode = "list" | "grid";

type RawTicket = {
    id: string;
    organization_id: string;
    requesting_location_id: string;
    warehouse_location_id: string;
    status: TicketStatus;
    requested_by: string;
    processed_by: string | null;
    confirmed_by: string | null;
    rejection_reason: string | null;
    title: string | null;
    notes: string | null;
    submitted_at: string | null;
    fulfilled_at: string | null;
    confirmed_at: string | null;
    created_at: string;
    updated_at: string;
    is_auto_approved: boolean;
    has_discrepancy?: boolean;
    parent_ticket_id?: string | null;
    requesting_location: {
        id: string;
        name: string;
        address: { street: string; city: string; state: string; zip: string };
    } | null;
    order_ticket_items: {
        id: string;
        ticket_id: string;
        item_id: number;
        quantity_boxes: number;
        quantity_units: number;
        fulfilled_boxes: number | null;
        fulfilled_units: number | null;
        items: {
            id: number;
            name: string;
            sku: string;
            category_id: number;
            box_quantity: number;
            short_label: string | null;
        } | null;
    }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getItemCount(ticket: RawTicket): number {
    return ticket.order_ticket_items?.length ?? 0;
}

function getTotalBoxes(ticket: RawTicket): number {
    return (
        ticket.order_ticket_items?.reduce(
            (sum, line) => sum + (line.quantity_boxes ?? 0),
            0,
        ) ?? 0
    );
}

function shortId(uuid: string): string {
    return uuid.slice(-8).toUpperCase();
}

function relativeDate(iso: string) {
    const days = Math.floor(
        (Date.now() - new Date(iso).getTime()) / 86_400_000,
    );
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    }).format(new Date(iso));
}

// ─── Grid layout — single source of truth ─────────────────────────────────────
// dot | ID | Title | Date | Location | Contents | Status | Arrow
const GRID_COLS = "10px 100px 1fr 86px 100px 160px 130px 20px";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
    TicketStatus,
    {
        label: string;
        icon: React.ReactNode;
        badge: string;
        dot: string;
        accent: string;
    }
> = {
    draft: {
        label: "Draft",
        icon: <FileEdit size={10} />,
        badge: "bg-gray-100 text-gray-500",
        dot: "bg-gray-300",
        accent: "bg-gray-300",
    },
    submitted: {
        label: "Submitted",
        icon: <Send size={10} />,
        badge: "bg-blue-50 text-blue-700",
        dot: "bg-blue-500",
        accent: "bg-blue-500",
    },
    processing: {
        label: "Processing",
        icon: <Loader2 size={10} className="animate-spin" />,
        badge: "bg-yellow-50 text-yellow-700",
        dot: "bg-yellow-500",
        accent: "bg-yellow-400",
    },
    fulfilled: {
        label: "Fulfilled",
        icon: <Truck size={10} />,
        badge: "bg-violet-50 text-violet-700",
        dot: "bg-violet-500",
        accent: "bg-violet-500",
    },
    confirmed: {
        label: "Confirmed",
        icon: <CheckCircle2 size={10} />,
        badge: "bg-green-50 text-green-700",
        dot: "bg-green-500",
        accent: "bg-green-500",
    },
    rejected: {
        label: "Rejected",
        icon: <XCircle size={10} />,
        badge: "bg-red-50 text-red-700",
        dot: "bg-red-500",
        accent: "bg-red-500",
    },
    cancelled: {
        label: "Cancelled",
        icon: <Archive size={10} />,
        badge: "bg-gray-100 text-gray-400",
        dot: "bg-gray-200",
        accent: "bg-gray-200",
    },
};

const ALL_STATUSES: TicketStatus[] = [
    "draft",
    "submitted",
    "processing",
    "fulfilled",
    "confirmed",
    "rejected",
    "cancelled",
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
    const { label, icon, badge } = STATUS_CONFIG[status];
    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge}`}
        >
            {icon}
            {label}
        </span>
    );
}

function FilterChip({
    label,
    active,
    count,
    onClick,
}: {
    label: string;
    active: boolean;
    count: number;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-100 ${
                active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-indigo-600 hover:bg-violet-50"
            }`}
        >
            {label}
            <span
                className={`text-[10px] px-1 py-0.5 rounded ${
                    active
                        ? "bg-white/20 text-white/80"
                        : "bg-gray-100 text-gray-400"
                }`}
            >
                {count}
            </span>
        </button>
    );
}

// ─── List row ─────────────────────────────────────────────────────────────────
function TicketRow({ ticket }: { ticket: RawTicket }) {
    const router = useRouter();
    const { dot } = STATUS_CONFIG[ticket.status];
    const dateToShow = ticket.submitted_at ?? ticket.created_at;
    const itemCount = getItemCount(ticket);
    const totalBoxes = getTotalBoxes(ticket);

    return (
        <button
            onClick={() => router.push(`/admin/orders/${ticket.id}`)}
            className="group w-full text-left"
        >
            <div
                className="grid gap-3 items-center px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-violet-300 hover:shadow-[0_1px_8px_rgba(99,102,241,0.08)] hover:-translate-y-px transition-all duration-100"
                style={{ gridTemplateColumns: GRID_COLS }}
            >
                {/* 1 — Status dot */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />

                {/* 2 — Ticket ID */}
                <span
                    style={{
                        fontFamily:
                            "var(--font-mono, 'JetBrains Mono', monospace)",
                    }}
                    className="text-xs font-medium text-gray-600 truncate"
                    title={ticket.id}
                >
                    …{shortId(ticket.id)}
                </span>

                {/* 3 — Title */}
                <span
                    className="text-xs font-medium truncate"
                    title={ticket.title ?? ""}
                >
                    {ticket.title ? (
                        <span className="text-gray-800">{ticket.title}</span>
                    ) : (
                        <span className="text-gray-300 italic">No title</span>
                    )}
                </span>

                {/* 4 — Date */}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <CalendarDays size={11} className="flex-shrink-0" />
                    {relativeDate(dateToShow)}
                </div>

                {/* 5 — Location */}
                <div className="flex items-center gap-1 text-xs text-gray-400 truncate">
                    <MapPin size={11} className="flex-shrink-0 text-gray-300" />
                    <span className="truncate">
                        {ticket.requesting_location?.name ?? "—"}
                    </span>
                </div>

                {/* 6 — Contents */}
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-800">
                            {itemCount}
                        </span>{" "}
                        items
                    </span>
                    <span className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-800">
                            {totalBoxes}
                        </span>{" "}
                        boxes
                    </span>
                    {ticket.is_auto_approved && (
                        <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            Auto
                        </span>
                    )}
                </div>

                {/* 7 — Status badge */}
                <div className="shrink-0">
                    <StatusBadge status={ticket.status} />
                </div>

                {/* 8 — Arrow */}
                <ChevronRight
                    size={14}
                    className="shrink-0 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all"
                />
            </div>
        </button>
    );
}

// ─── Grid card ────────────────────────────────────────────────────────────────
function TicketCard({ ticket }: { ticket: RawTicket }) {
    const router = useRouter();
    const { accent } = STATUS_CONFIG[ticket.status];
    const dateToShow = ticket.submitted_at ?? ticket.created_at;
    const itemCount = getItemCount(ticket);
    const totalBoxes = getTotalBoxes(ticket);

    return (
        <button
            onClick={() => router.push(`/admin/orders/${ticket.id}`)}
            className="group w-full text-left"
        >
            <div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-violet-300 hover:shadow-[0_2px_12px_rgba(99,102,241,0.1)] hover:-translate-y-0.5 transition-all duration-150">
                <div className={`h-[3px] w-full ${accent}`} />
                <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1 mr-2">
                            {ticket.title ? (
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {ticket.title}
                                </p>
                            ) : (
                                <p className="text-xs text-gray-300 italic">
                                    No title
                                </p>
                            )}
                            <div
                                className="text-[10px] text-gray-400 mt-0.5"
                                style={{
                                    fontFamily: "var(--font-mono, monospace)",
                                }}
                                title={ticket.id}
                            >
                                <span className="text-gray-300">#</span>…
                                {shortId(ticket.id)}
                            </div>
                        </div>
                        <StatusBadge status={ticket.status} />
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-gray-300 mb-3">
                        <CalendarDays size={10} />
                        {relativeDate(dateToShow)}
                    </div>

                    <div className="space-y-1.5">
                        {ticket.requesting_location && (
                            <div className="flex justify-between items-center py-1 border-b border-gray-50">
                                <span className="text-[11px] text-gray-400">
                                    Location
                                </span>
                                <span className="text-xs font-semibold text-gray-800 truncate max-w-[110px]">
                                    {ticket.requesting_location.name}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center py-1 border-b border-gray-50">
                            <span className="text-[11px] text-gray-400">
                                Items
                            </span>
                            <span className="text-xs font-semibold text-gray-800">
                                {itemCount}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                            <span className="text-[11px] text-gray-400">
                                Boxes
                            </span>
                            <span className="text-xs font-semibold text-gray-800">
                                {totalBoxes}
                            </span>
                        </div>
                        {ticket.notes && (
                            <div className="flex justify-between items-center py-1">
                                <span className="text-[11px] text-gray-400">
                                    Note
                                </span>
                                <span className="text-[11px] text-gray-400 italic truncate max-w-[120px]">
                                    {ticket.notes}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}

function StatCard({
    label,
    value,
    sub,
    iconBg,
    icon,
}: {
    label: string;
    value: number;
    sub?: string;
    iconBg: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${iconBg}`}
            >
                {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">
                {value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-gray-300 mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminOrdersPage() {
    const { organization } = useOrganization();
    const organizationId = organization?.id ?? "";

    const { data: tickets, isLoading } = useAllTickets(organizationId, {});

    const [activeFilter, setActiveFilter] = useState<TicketStatus | "all">(
        "all",
    );
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [search, setSearch] = useState("");

    const counts = useMemo(() => {
        const map: Record<string, number> = { all: tickets?.length ?? 0 };
        ALL_STATUSES.forEach((s) => {
            map[s] = tickets?.filter((t) => t.status === s).length ?? 0;
        });
        return map;
    }, [tickets]);

    const filtered = useMemo(() => {
        if (!tickets) return [];
        return (tickets as RawTicket[]).filter((t) => {
            const matchStatus =
                activeFilter === "all" || t.status === activeFilter;
            const matchSearch =
                !search ||
                t.id.toLowerCase().includes(search.toLowerCase()) ||
                shortId(t.id).toLowerCase().includes(search.toLowerCase()) ||
                (t.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
                (t.requesting_location?.name ?? "")
                    .toLowerCase()
                    .includes(search.toLowerCase());
            return matchStatus && matchSearch;
        });
    }, [tickets, activeFilter, search]);

    const pendingAction = (counts.submitted ?? 0) + (counts.fulfilled ?? 0);
    const boxesConfirmed = useMemo(
        () =>
            (tickets as RawTicket[] | undefined)
                ?.filter((t) => t.status === "confirmed")
                .reduce((sum, t) => sum + getTotalBoxes(t), 0) ?? 0,
        [tickets],
    );

    return (
        <div className="min-h-screen bg-white">
            {/* ── Header ── */}
            <div className="px-6 pt-6 pb-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                            Orders
                        </h1>
                        <p className="text-xs text-gray-400 mt-1">
                            Request inventory from the central warehouse
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`w-8 h-8 flex items-center justify-center transition-colors ${
                                    viewMode === "grid"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-white text-gray-400 hover:bg-gray-50 hover:text-indigo-600"
                                }`}
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`w-8 h-8 flex items-center justify-center transition-colors ${
                                    viewMode === "list"
                                        ? "bg-indigo-600 text-white"
                                        : "bg-white text-gray-400 hover:bg-gray-50 hover:text-indigo-600"
                                }`}
                            >
                                <List size={14} />
                            </button>
                        </div>
                        <Link
                            href="/admin/orders/new"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(99,102,241,.3)]"
                        >
                            <Plus size={13} /> New Order
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <StatCard
                        label="Total orders"
                        value={counts.all}
                        iconBg="bg-violet-50"
                        icon={<Package size={15} className="text-violet-600" />}
                    />
                    <StatCard
                        label="Need attention"
                        value={pendingAction}
                        iconBg="bg-yellow-50"
                        icon={<Clock size={15} className="text-yellow-600" />}
                        sub="Submitted or fulfilled"
                    />
                    <StatCard
                        label="Boxes confirmed"
                        value={boxesConfirmed}
                        iconBg="bg-green-50"
                        icon={
                            <CheckCircle2
                                size={15}
                                className="text-green-600"
                            />
                        }
                        sub="This month"
                    />
                    <StatCard
                        label="Active drafts"
                        value={counts.draft ?? 0}
                        iconBg="bg-gray-100"
                        icon={<FileEdit size={15} className="text-gray-500" />}
                    />
                </div>
            </div>

            {/* ── Body ── */}
            <div className="px-6 py-5">
                <div className="flex items-center gap-3 flex-wrap mb-5">
                    <div className="relative">
                        <Search
                            size={13}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by ID, title or location…"
                            className="w-64 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <FilterChip
                            label="All"
                            active={activeFilter === "all"}
                            count={counts.all}
                            onClick={() => setActiveFilter("all")}
                        />
                        {ALL_STATUSES.map((s) => (
                            <FilterChip
                                key={s}
                                label={STATUS_CONFIG[s].label}
                                active={activeFilter === s}
                                count={counts[s] ?? 0}
                                onClick={() => setActiveFilter(s)}
                            />
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Loading orders…</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                            <Package size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 mb-1">
                            No orders found
                        </p>
                        <p className="text-xs text-gray-300">
                            Try a different filter or search term
                        </p>
                    </div>
                ) : viewMode === "list" ? (
                    <>
                        {/* Column headers — same GRID_COLS as rows */}
                        <div
                            className="hidden sm:grid gap-3 px-4 mb-2"
                            style={{ gridTemplateColumns: GRID_COLS }}
                        >
                            {[
                                "",
                                "Ticket ID",
                                "Title",
                                "Date",
                                "Location",
                                "Contents",
                                "Status",
                                "",
                            ].map((h, i) => (
                                <span
                                    key={i}
                                    className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold"
                                >
                                    {h}
                                </span>
                            ))}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {filtered.map((t) => (
                                <TicketRow key={t.id} ticket={t} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filtered.map((t) => (
                            <TicketCard key={t.id} ticket={t} />
                        ))}
                    </div>
                )}

                {!isLoading && filtered.length > 0 && (
                    <p className="text-center text-[11px] text-gray-300 mt-4">
                        Showing {filtered.length} of {counts.all} orders
                    </p>
                )}
            </div>
        </div>
    );
}