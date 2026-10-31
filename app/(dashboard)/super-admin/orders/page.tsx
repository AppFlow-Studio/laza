"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    Package,
    ChevronRight,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Send,
    Truck,
    AlertCircle,
    Search,
    FileEdit,
    Plus,
    LayoutGrid,
    List,
    Columns,
    CalendarDays,
    MapPin,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAllTickets } from "@/lib/hooks/queries/useOrderTickets";
import { useOrganization } from "@clerk/nextjs";
import Link from "next/link";

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

type ViewMode = "list" | "grid" | "status";

type QueueTicket = {
    id: string;
    organization_id: string;
    requesting_location_id: string;
    status: TicketStatus;
    requested_by: string;
    submitted_at: string | null;
    created_at: string;
    is_auto_approved: boolean;
    has_discrepancy: boolean;
    title: string | null;
    notes: string | null;
    requesting_location: { id: string; name: string } | null;
    order_ticket_items: { id: string; quantity_boxes: number }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shortId(uuid: string) {
    return `…${uuid.slice(-8).toUpperCase()}`;
}
function relativeDate(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    }).format(new Date(iso));
}
function getItemCount(t: QueueTicket) {
    return t.order_ticket_items?.length ?? 0;
}
function getTotalBoxes(t: QueueTicket) {
    return (
        t.order_ticket_items?.reduce(
            (s, i) => s + (i.quantity_boxes ?? 0),
            0,
        ) ?? 0
    );
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<
    TicketStatus,
    { label: string; badge: string; dot: string; accent: string; icon: React.ReactNode }
> = {
    draft: {
        label: "Draft",
        badge: "bg-gray-100 text-gray-500",
        dot: "bg-gray-300",
        accent: "bg-gray-300",
        icon: <FileEdit size={10} />,
    },
    submitted: {
        label: "Submitted",
        badge: "bg-blue-50 text-blue-700",
        dot: "bg-blue-500",
        accent: "bg-blue-500",
        icon: <Send size={10} />,
    },
    processing: {
        label: "Processing",
        badge: "bg-yellow-50 text-yellow-700",
        dot: "bg-yellow-500",
        accent: "bg-yellow-400",
        icon: <Clock size={10} className="animate-[spin_3s_linear_infinite]" />,
    },
    fulfilled: {
        label: "Fulfilled",
        badge: "bg-violet-50 text-violet-700",
        dot: "bg-violet-500",
        accent: "bg-violet-500",
        icon: <Truck size={10} />,
    },
    in_transit: {
        label: "In Transit",
        badge: "bg-indigo-50 text-indigo-700",
        dot: "bg-indigo-500",
        accent: "bg-indigo-500",
        icon: <Truck size={10} />,
    },
    delivered: {
        label: "Delivered",
        badge: "bg-teal-50 text-teal-700",
        dot: "bg-teal-500",
        accent: "bg-teal-500",
        icon: <Package size={10} />,
    },
    confirmed: {
        label: "Confirmed",
        badge: "bg-green-50 text-green-700",
        dot: "bg-green-500",
        accent: "bg-green-500",
        icon: <CheckCircle2 size={10} />,
    },
    rejected: {
        label: "Rejected",
        badge: "bg-red-50 text-red-700",
        dot: "bg-red-500",
        accent: "bg-red-500",
        icon: <XCircle size={10} />,
    },
    cancelled: {
        label: "Cancelled",
        badge: "bg-gray-100 text-gray-400",
        dot: "bg-gray-200",
        accent: "bg-gray-200",
        icon: <XCircle size={10} />,
    },
};

const FILTER_CHIPS: { key: TicketStatus | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "submitted", label: "Needs action" },
    { key: "processing", label: "Processing" },
    { key: "fulfilled", label: "Fulfilled" },
    { key: "confirmed", label: "Confirmed" },
    { key: "rejected", label: "Rejected" },
    { key: "discrepancy" as any, label: "Discrepancies" },
];

const KANBAN_STATUSES: TicketStatus[] = ["draft", "submitted", "processing", "fulfilled", "confirmed"];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
    const { label, badge, icon } = STATUS_META[status] ?? STATUS_META.draft;
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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-100 ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-indigo-600 hover:bg-violet-50"}`}
        >
            {label}
            <span
                className={`text-[10px] px-1 py-0.5 rounded ${active ? "bg-white/20 text-white/80" : "bg-gray-100 text-gray-400"}`}
            >
                {count}
            </span>
        </button>
    );
}

function StoreBadge({ name }: { name: string }) {
    const palettes = [
        "bg-violet-100 text-violet-700",
        "bg-blue-100 text-blue-700",
        "bg-emerald-100 text-emerald-700",
        "bg-amber-100 text-amber-700",
        "bg-rose-100 text-rose-700",
        "bg-teal-100 text-teal-700",
    ];
    const idx = (name.charCodeAt(0) ?? 0) % palettes.length;
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${palettes[idx]}`}
        >
            {name.slice(0, 2).toUpperCase()}
        </span>
    );
}

function StatCard({
    label,
    value,
    sub,
    iconBg,
    icon,
    highlight,
}: {
    label: string;
    value: number;
    sub?: string;
    iconBg: string;
    icon: React.ReactNode;
    highlight?: boolean;
}) {
    return (
        <div
            className={`bg-white border rounded-xl p-4 ${highlight ? "border-blue-200 ring-2 ring-blue-50" : "border-gray-200"}`}
        >
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

function TicketCard({ ticket, router }: { ticket: QueueTicket; router: ReturnType<typeof useRouter> }) {
    const { accent } = STATUS_META[ticket.status] ?? STATUS_META.draft;
    const dateToShow = ticket.submitted_at ?? ticket.created_at;
    return (
        <button
            onClick={() => router.push(`/super-admin/orders/${ticket.id}`)}
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
                                <p className="text-xs text-gray-300 italic">No title</p>
                            )}
                            <div
                                className="text-[10px] text-gray-400 mt-0.5"
                                style={{ fontFamily: "var(--font-mono, monospace)" }}
                                title={ticket.id}
                            >
                                <span className="text-gray-300">#</span>{shortId(ticket.id)}
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
                                <span className="text-[11px] text-gray-400">Store</span>
                                <span className="text-xs font-semibold text-gray-800 truncate max-w-[110px]">
                                    {ticket.requesting_location.name}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center py-1 border-b border-gray-50">
                            <span className="text-[11px] text-gray-400">Items</span>
                            <span className="text-xs font-semibold text-gray-800">{getItemCount(ticket)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                            <span className="text-[11px] text-gray-400">Boxes</span>
                            <span className="text-xs font-semibold text-gray-800">{getTotalBoxes(ticket)}</span>
                        </div>
                        {ticket.has_discrepancy && (
                            <div className="flex items-center gap-1 text-[11px] text-orange-600 font-medium py-1">
                                <AlertCircle size={10} /> Discrepancy
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}

function KanbanView({ tickets, router }: { tickets: QueueTicket[]; router: ReturnType<typeof useRouter> }) {
    return (
        <div className="flex gap-3 overflow-x-auto pb-4">
            {KANBAN_STATUSES.map((status) => {
                const group = tickets.filter((t) => t.status === status);
                const { label, dot, accent } = STATUS_META[status];
                return (
                    <div key={status} className="flex-shrink-0 w-72">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className={`w-2 h-2 rounded-full ${dot}`} />
                            <span className="text-xs font-semibold text-gray-700">{label}</span>
                            <span className="ml-auto text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                {group.length}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {group.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-300">
                                    No {label.toLowerCase()} orders
                                </div>
                            ) : (
                                group.map((ticket) => {
                                    const dateToShow = ticket.submitted_at ?? ticket.created_at;
                                    return (
                                        <button
                                            key={ticket.id}
                                            onClick={() => router.push(`/super-admin/orders/${ticket.id}`)}
                                            className="w-full text-left group"
                                        >
                                            <div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-violet-300 hover:shadow-[0_2px_12px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-150">
                                                <div className={`h-[3px] w-full ${accent}`} />
                                                <div className="p-3.5">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                                        {ticket.title ?? <span className="text-gray-300 italic text-xs font-normal">No title</span>}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400">
                                                        <span>{relativeDate(dateToShow)}</span>
                                                        <span>{getItemCount(ticket)} items · {getTotalBoxes(ticket)} boxes</span>
                                                    </div>
                                                    {ticket.requesting_location && (
                                                        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-gray-400">
                                                            <MapPin size={9} className="shrink-0" />
                                                            {ticket.requesting_location.name}
                                                        </div>
                                                    )}
                                                    {ticket.has_discrepancy && (
                                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-500 font-medium">
                                                            <AlertCircle size={9} /> Discrepancy
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SuperAdminOrdersPage() {
    const router = useRouter();
    const { organization } = useOrganization();
    const organizationId = organization?.id ?? "";

    const { data: rawTickets, isLoading } = useAllTickets(organizationId, {
        excludeCancelled: true,
    });
    const tickets = (rawTickets ?? []) as QueueTicket[];

    const [activeFilter, setActiveFilter] = useState<TicketStatus | "all" | "discrepancy">(
        "submitted",
    );
    const [search, setSearch] = useState("");
    const [storeFilter, setStoreFilter] = useState("");
    const [dateFilter, setDateFilter] = useState<
        "today" | "week" | "month" | ""
    >("");
    const [viewMode, setViewMode] = useState<ViewMode>("list");

    const stores = useMemo(
        () =>
            Array.from(
                new Set(
                    tickets
                        .map((t) => t.requesting_location?.name)
                        .filter(Boolean),
                ),
            ) as string[],
        [tickets],
    );

    const counts = useMemo(() => {
        const map: Record<string, number> = { all: tickets.length };
        FILTER_CHIPS.forEach(({ key }) => {
            if (key !== "all") {
                if (key === "discrepancy") {
                    map[key] = tickets.filter((t) => t.has_discrepancy).length;
                } else {
                    map[key] = tickets.filter((t) => t.status === key).length;
                }
            }
        });
        return map;
    }, [tickets]);

    function isInDateRange(iso: string): boolean {
        if (!dateFilter) return true;
        const diff = Date.now() - new Date(iso).getTime();
        if (dateFilter === "today") return diff < 86_400_000;
        if (dateFilter === "week") return diff < 7 * 86_400_000;
        if (dateFilter === "month") return diff < 30 * 86_400_000;
        return true;
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return tickets.filter((t) => {
            const matchStatus =
                activeFilter === "all"
                    ? true
                    : activeFilter === "discrepancy"
                      ? t.has_discrepancy
                      : t.status === activeFilter;
            const matchStore =
                !storeFilter || t.requesting_location?.name === storeFilter;
            const matchDate = isInDateRange(t.submitted_at ?? t.created_at);
            const matchSearch =
                !q ||
                t.id.toLowerCase().includes(q) ||
                shortId(t.id).toLowerCase().includes(q) ||
                (t.requesting_location?.name ?? "").toLowerCase().includes(q) ||
                (t.title ?? "").toLowerCase().includes(q);
            return matchStatus && matchStore && matchDate && matchSearch;
        });
    }, [tickets, activeFilter, storeFilter, dateFilter, search]);

    const submittedCount = counts["submitted"] ?? 0;
    const processingCount = counts["processing"] ?? 0;
    const fulfilledCount = counts["fulfilled"] ?? 0;

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
                            All store orders across every location
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode("grid")}
                                title="Grid view"
                                className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-indigo-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50 hover:text-indigo-600"}`}
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                title="List view"
                                className={`w-8 h-8 flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-indigo-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50 hover:text-indigo-600"}`}
                            >
                                <List size={14} />
                            </button>

                        </div>
                        <Link
                            href="/super-admin/orders/new"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(99,102,241,.3)]"
                        >
                            <Plus size={13} /> New Order
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <StatCard
                        label="Awaiting review"
                        value={submittedCount}
                        iconBg="bg-blue-50"
                        icon={<Send size={15} className="text-blue-600" />}
                        highlight={submittedCount > 0}
                    />
                    <StatCard
                        label="Processing"
                        value={processingCount}
                        iconBg="bg-yellow-50"
                        icon={<Clock size={15} className="text-yellow-600" />}
                    />
                    <StatCard
                        label="Fulfilled"
                        value={fulfilledCount}
                        iconBg="bg-violet-50"
                        icon={<Truck size={15} className="text-violet-600" />}
                    />
                    <StatCard
                        label="Stores active"
                        value={stores.length}
                        iconBg="bg-gray-100"
                        icon={<Package size={15} className="text-gray-500" />}
                    />
                </div>
            </div>

            {/* ── Body ── */}
            <div className="px-6 py-5">
                {/* Search + attention banner */}
                <div className="flex items-center gap-3 flex-wrap mb-5">
                    <div className="flex-1 relative">
                        <Search
                            size={13}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by ID, title or store…"
                            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {submittedCount > 0 && (
                        <div className="ml-auto flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 font-medium shrink-0">
                            <AlertCircle
                                size={13}
                                className="text-yellow-600 shrink-0"
                            />
                            {submittedCount} ticket
                            {submittedCount !== 1 ? "s" : ""} need
                            {submittedCount === 1 ? "s" : ""} your attention
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap mb-5">
                    <select
                        value={storeFilter}
                        onChange={(e) => setStoreFilter(e.target.value)}
                        className="py-2 px-3 text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white text-gray-600 cursor-pointer"
                    >
                        <option value="">All stores</option>
                        {stores.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>

                    <select
                        value={dateFilter}
                        onChange={(e) =>
                            setDateFilter(e.target.value as typeof dateFilter)
                        }
                        className="py-2 px-3 text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white text-gray-600 cursor-pointer"
                    >
                        <option value="">All time</option>
                        <option value="today">Today</option>
                        <option value="week">This week</option>
                        <option value="month">This month</option>
                    </select>

                    <div className="flex items-center gap-1.5 flex-wrap">
                        {FILTER_CHIPS.map(({ key, label }) => (
                            <FilterChip
                                key={key}
                                label={label}
                                active={activeFilter === key}
                                count={
                                    key === "all"
                                        ? tickets.length
                                        : (counts[key] ?? 0)
                                }
                                onClick={() =>
                                    setActiveFilter(key as any)
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* ── Content ── */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-24 gap-2 text-gray-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Loading orders…</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                            <Package size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 mb-1">
                            No orders found
                        </p>
                        <p className="text-xs text-gray-300">
                            {activeFilter === "submitted"
                                ? "No tickets are waiting for your review right now."
                                : "Try a different filter or search term."}
                        </p>
                    </div>
                ) : viewMode === "status" ? (
                    /* ── KANBAN / STATUS VIEW ── */
                    <KanbanView tickets={filtered} router={router} />
                ) : viewMode === "grid" ? (
                    /* ── GRID VIEW ── */
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filtered.map((t) => (
                            <TicketCard key={t.id} ticket={t} router={router} />
                        ))}
                    </div>
                ) : (
                    /* ── TABLE VIEW ── */
                    <>
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
                                        <TableHead className="pl-5 pr-3 w-28 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
                                            Ticket ID
                                        </TableHead>
                                        <TableHead className="px-3 w-44 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
                                            Title
                                        </TableHead>
                                        <TableHead className="px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
                                            Store
                                        </TableHead>
                                        <TableHead className="px-3 w-32 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
                                            Submitted by
                                        </TableHead>
                                        <TableHead className="px-3 w-24 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
                                            Date
                                        </TableHead>
                                        <TableHead className="px-3 w-44 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
                                            Contents
                                        </TableHead>
                                        <TableHead className="px-3 w-40 text-[11px] font-bold uppercase tracking-wider text-gray-400 py-3.5">
                                            Status
                                        </TableHead>
                                        <TableHead className="pr-5 pl-2 w-6" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((ticket) => {
                                        const dateIso =
                                            ticket.submitted_at ??
                                            ticket.created_at;
                                        const itemCount = getItemCount(ticket);
                                        const totalBoxes =
                                            getTotalBoxes(ticket);
                                        let { dot } =
                                            STATUS_META[ticket.status] ??
                                            STATUS_META.draft;
                                        if (ticket.has_discrepancy) {
                                            dot = "bg-orange-500 animate-pulse";
                                        }

                                        return (
                                            <TableRow
                                                key={ticket.id}
                                                onClick={() =>
                                                    router.push(
                                                        `/super-admin/orders/${ticket.id}`,
                                                    )
                                                }
                                                className="group cursor-pointer border-b border-gray-100 hover:bg-gray-50/70 transition-colors h-14"
                                            >
                                                {/* Ticket ID */}
                                                <TableCell className="pl-5 pr-3">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`w-2 h-2 rounded-full shrink-0 ${dot}`}
                                                        />
                                                        <span
                                                            style={{
                                                                fontFamily:
                                                                    "var(--font-mono, 'JetBrains Mono', monospace)",
                                                            }}
                                                            className="text-sm font-medium text-gray-500"
                                                            title={ticket.id}
                                                        >
                                                            {shortId(ticket.id)}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Title */}
                                                <TableCell className="px-3 max-w-0">
                                                    <span
                                                        className="block text-sm font-medium truncate"
                                                        title={ticket.title ?? ""}
                                                    >
                                                        {ticket.title ? (
                                                            <span className="text-gray-800">
                                                                {ticket.title}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300 italic">
                                                                No title
                                                            </span>
                                                        )}
                                                    </span>
                                                </TableCell>

                                                {/* Store */}
                                                <TableCell className="px-3">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <StoreBadge
                                                            name={
                                                                ticket
                                                                    .requesting_location
                                                                    ?.name ??
                                                                "?"
                                                            }
                                                        />
                                                        <span className="text-sm font-semibold text-gray-900 truncate">
                                                            {ticket
                                                                .requesting_location
                                                                ?.name ?? "—"}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Submitted by */}
                                                <TableCell className="px-3">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-[9px] font-bold text-indigo-700">
                                                            {(
                                                                ticket.requested_by ??
                                                                "?"
                                                            )
                                                                .slice(0, 2)
                                                                .toUpperCase()}
                                                        </div>
                                                        <span
                                                            className="text-sm text-gray-500 truncate"
                                                            title={
                                                                ticket.requested_by
                                                            }
                                                        >
                                                            Admin
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Date */}
                                                <TableCell className="px-3">
                                                    <div className="flex items-center gap-1 text-sm text-gray-400 whitespace-nowrap">
                                                        <CalendarDays size={11} className="flex-shrink-0" />
                                                        {relativeDate(dateIso)}
                                                    </div>
                                                </TableCell>

                                                {/* Contents */}
                                                <TableCell className="px-3">
                                                    <div className="flex flex-col gap-0.5 min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm text-gray-500">
                                                                <span className="font-semibold text-gray-800">
                                                                    {itemCount}
                                                                </span>{" "}
                                                                items
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                <span className="font-semibold text-gray-800">
                                                                    {totalBoxes}
                                                                </span>{" "}
                                                                boxes
                                                            </span>
                                                        </div>
                                                        {ticket.notes && (
                                                            <span
                                                                className="text-[11px] text-gray-400 italic truncate max-w-[160px] cursor-default"
                                                                title={ticket.notes}
                                                            >
                                                                <span className="not-italic font-medium text-gray-300 mr-0.5">
                                                                    Notes:
                                                                </span>
                                                                {ticket.notes}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Status */}
                                                <TableCell className="px-3">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <StatusBadge
                                                            status={ticket.status}
                                                        />
                                                        {ticket.is_auto_approved && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                                                <CheckCircle2 size={8} />{" "}
                                                                Auto
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Arrow */}
                                                <TableCell className="pr-5 pl-2">
                                                    <ChevronRight
                                                        size={14}
                                                        className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <p className="text-center text-[11px] text-gray-300 mt-4">
                            Showing {filtered.length} of {tickets.length} orders
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
