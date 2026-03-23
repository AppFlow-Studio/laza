"use client";

/**
 * TASK 3.5 — Super Admin: Orders Queue Page
 * File: app/(dashboard)/super-admin/orders/page.tsx
 *
 * The super admin's primary "inbox" — all tickets from all stores.
 * Default filter is "submitted" (needs action). Every other status
 * is reachable via filter chips.
 *
 * Sidebar badge:
 *   In your super-admin layout sidebar, add:
 *   import { usePendingTicketCount } from "@/lib/hooks/queries/useOrderTickets";
 *   const { data: pendingCount } = usePendingTicketCount();
 *   // Render pendingCount as a badge next to the "Orders" nav item.
 */

import { useState, useMemo } from "react";
import { useRouter }          from "next/navigation";
import {
  Package, ChevronRight, Clock, CheckCircle2,
  XCircle, Loader2, Send, Truck, AlertCircle,
  Search, FileEdit, LayoutGrid, List,
} from "lucide-react";
import { useAllTickets }          from "@/lib/hooks/queries/useOrderTickets";
import { useUserInfo }            from "@/lib/hooks/queries/useUserInfo";

// ─── Types ────────────────────────────────────────────────────────────────────
type TicketStatus =
  | "draft" | "submitted" | "processing" | "fulfilled"
  | "in_transit" | "delivered" | "confirmed" | "rejected" | "cancelled";

// Shape returned by getAllTickets() with the joins we need for this list view
type QueueTicket = {
  id: string;
  organization_id: string;
  requesting_location_id: string;
  status: TicketStatus;
  requested_by: string;
  submitted_at: string | null;
  created_at: string;
  is_auto_approved: boolean;
  notes: string | null;
  requesting_location: {
    id: string;
    name: string;
  } | null;
  // We compute item_count + total_boxes from these
  order_ticket_items: {
    id: string;
    quantity_boxes: number;
  }[];
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
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric",
  }).format(new Date(iso));
}

function getItemCount(ticket: QueueTicket) {
  return ticket.order_ticket_items?.length ?? 0;
}

function getTotalBoxes(ticket: QueueTicket) {
  return ticket.order_ticket_items?.reduce((s, i) => s + (i.quantity_boxes ?? 0), 0) ?? 0;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<TicketStatus, {
  label: string; badge: string; dot: string; icon: React.ReactNode;
}> = {
  draft:      { label: "Draft",      badge: "bg-gray-100 text-gray-500",    dot: "bg-gray-300",   icon: <FileEdit   size={10} /> },
  submitted:  { label: "Submitted",  badge: "bg-blue-50 text-blue-700",     dot: "bg-blue-500",   icon: <Send       size={10} /> },
  processing: { label: "Processing", badge: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500", icon: <Clock      size={10} className="animate-[spin_3s_linear_infinite]" /> },
  fulfilled:  { label: "Fulfilled",  badge: "bg-violet-50 text-violet-700", dot: "bg-violet-500", icon: <Truck      size={10} /> },
  in_transit: { label: "In Transit", badge: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500", icon: <Truck      size={10} /> },
  delivered:  { label: "Delivered",  badge: "bg-teal-50 text-teal-700",     dot: "bg-teal-500",   icon: <Package    size={10} /> },
  confirmed:  { label: "Confirmed",  badge: "bg-green-50 text-green-700",   dot: "bg-green-500",  icon: <CheckCircle2 size={10} /> },
  rejected:   { label: "Rejected",   badge: "bg-red-50 text-red-700",       dot: "bg-red-500",    icon: <XCircle    size={10} /> },
  cancelled:  { label: "Cancelled",  badge: "bg-gray-100 text-gray-400",    dot: "bg-gray-200",   icon: <XCircle    size={10} /> },
};

// Filter chip definitions — "submitted" maps to "needs action" label for clarity
const FILTER_CHIPS: { key: TicketStatus | "all"; label: string }[] = [
  { key: "all",       label: "All"           },
  { key: "submitted", label: "Needs action"  },
  { key: "processing",label: "Processing"    },
  { key: "fulfilled", label: "Fulfilled"     },
  { key: "confirmed", label: "Confirmed"     },
  { key: "rejected",  label: "Rejected"      },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
  const { label, badge, icon } = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge}`}>
      {icon}{label}
    </span>
  );
}

function FilterChip({
  label, active, count, onClick,
}: {
  label: string; active: boolean; count: number; onClick: () => void;
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
      <span className={`text-[10px] px-1 py-0.5 rounded ${
        active ? "bg-white/20 text-white/80" : "bg-gray-100 text-gray-400"
      }`}>
        {count}
      </span>
    </button>
  );
}

function StoreBadge({ name }: { name: string }) {
  // Deterministic pastel from store name first char
  const palettes: string[] = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-teal-100 text-teal-700",
  ];
  const idx = (name.charCodeAt(0) ?? 0) % palettes.length;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${palettes[idx]}`}>
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

// ─── Ticket row (list view) ───────────────────────────────────────────────────
function TicketRow({ ticket }: { ticket: QueueTicket }) {
  const router   = useRouter();
  const dateIso  = ticket.submitted_at ?? ticket.created_at;
  const itemCount = getItemCount(ticket);
  const totalBoxes = getTotalBoxes(ticket);

  return (
    <button
      onClick={() => router.push(`/super-admin/orders/${ticket.id}`)}
      className="group w-full text-left"
    >
      <div
        className={`grid gap-3 items-center px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50/70 transition-colors ${
          ticket.status === "submitted" ? "border-l-2 border-l-blue-400" : ""
        }`}
        style={{ gridTemplateColumns: "116px 1fr 130px 90px 1fr 148px 20px" }}
      >
        {/* Ticket ID */}
        <span
          style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}
          className="text-xs font-medium text-gray-500"
          title={ticket.id}
        >
          {shortId(ticket.id)}
        </span>

        {/* Store */}
        <div className="flex items-center gap-2 min-w-0">
          <StoreBadge name={ticket.requesting_location?.name ?? "?"} />
          <span className="text-sm font-semibold text-gray-900 truncate">
            {ticket.requesting_location?.name ?? "—"}
          </span>
        </div>

        {/* Submitted by — just the user ID for now; swap with user name lookup if available */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-indigo-700">
            {(ticket.requested_by ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <span className="text-xs text-gray-500 truncate" title={ticket.requested_by}>
            Admin
          </span>
        </div>

        {/* Date */}
        <span className="text-xs text-gray-400">{relativeDate(dateIso)}</span>

        {/* Contents */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-gray-800">{itemCount}</span> items
          </span>
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-gray-800">{totalBoxes}</span> boxes
          </span>
          {ticket.notes && (
            <span className="hidden xl:block text-[11px] text-gray-300 italic truncate max-w-[120px]">
              {ticket.notes}
            </span>
          )}
        </div>

        {/* Status + auto-approved */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={ticket.status} />
          {ticket.is_auto_approved && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              <CheckCircle2 size={8} />Auto
            </span>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight
          size={14}
          className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </button>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, iconBg, icon, highlight,
}: {
  label: string; value: number; iconBg: string;
  icon: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className={`bg-white border rounded-xl p-4 ${
      highlight ? "border-blue-200 ring-2 ring-blue-50" : "border-gray-200"
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${iconBg}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SuperAdminOrdersPage() {
  const router = useRouter();
  const { data: userInfo } = useUserInfo();
  const organizationId = userInfo?.organizationId ?? "";

  // Fetch all tickets across all stores
  // useAllTickets is from lib/hooks/queries/useOrderTickets.ts
  const { data: rawTickets, isLoading } = useAllTickets(organizationId);
  const tickets = (rawTickets ?? []) as QueueTicket[];

  // ── Local UI state ──
  // Default to "submitted" — the super admin's action queue
  const [activeFilter, setActiveFilter] = useState<TicketStatus | "all">("submitted");
  const [search, setSearch]             = useState("");
  const [storeFilter, setStoreFilter]   = useState("");
  const [dateFilter, setDateFilter]     = useState<"today" | "week" | "month" | "">("");

  // ── Unique store list for dropdown ──
  const stores = useMemo(() => {
    const names = new Set(tickets.map((t) => t.requesting_location?.name).filter(Boolean));
    return Array.from(names) as string[];
  }, [tickets]);

  // ── Count per status for chips + stat cards ──
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: tickets.length };
    FILTER_CHIPS.forEach(({ key }) => {
      if (key !== "all") {
        map[key] = tickets.filter((t) => t.status === key).length;
      }
    });
    return map;
  }, [tickets]);

  // ── Date boundary helper ──
  function isInDateRange(iso: string): boolean {
    if (!dateFilter) return true;
    const diff = Date.now() - new Date(iso).getTime();
    if (dateFilter === "today") return diff < 86_400_000;
    if (dateFilter === "week")  return diff < 7 * 86_400_000;
    if (dateFilter === "month") return diff < 30 * 86_400_000;
    return true;
  }

  // ── Filtered + searched list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((t) => {
      const matchStatus = activeFilter === "all" || t.status === activeFilter;
      const matchStore  = !storeFilter || t.requesting_location?.name === storeFilter;
      const matchDate   = isInDateRange(t.submitted_at ?? t.created_at);
      const matchSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        shortId(t.id).toLowerCase().includes(q) ||
        (t.requesting_location?.name ?? "").toLowerCase().includes(q);
      return matchStatus && matchStore && matchDate && matchSearch;
    });
  }, [tickets, activeFilter, storeFilter, dateFilter, search]);

  // ── Derived stats ──
  const submittedCount  = counts["submitted"]  ?? 0;
  const processingCount = counts["processing"] ?? 0;
  const fulfilledCount  = counts["fulfilled"]  ?? 0;
  const activeStores    = stores.length;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Orders</h1>
            <p className="text-xs text-gray-400 mt-1">All store orders across every location</p>
          </div>

          {/* Urgent attention banner */}
          {submittedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 font-medium flex-shrink-0">
              <AlertCircle size={13} className="text-yellow-600 flex-shrink-0" />
              {submittedCount} ticket{submittedCount !== 1 ? "s" : ""} need{submittedCount === 1 ? "s" : ""} your attention
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            value={activeStores}
            iconBg="bg-gray-100"
            icon={<Package size={15} className="text-gray-500" />}
          />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-6 py-3.5 border-b border-gray-100 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or store…"
            className="w-60 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Store filter */}
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="py-2 px-3 text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white text-gray-600 cursor-pointer"
        >
          <option value="">All stores</option>
          {stores.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Date filter */}
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
          className="py-2 px-3 text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-400 bg-white text-gray-600 cursor-pointer"
        >
          <option value="">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>

        {/* Status filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap ml-1">
          {FILTER_CHIPS.map(({ key, label }) => (
            <FilterChip
              key={key}
              label={label}
              active={activeFilter === key}
              count={key === "all" ? tickets.length : (counts[key] ?? 0)}
              onClick={() => setActiveFilter(key)}
            />
          ))}
        </div>
      </div>

      {/* ── Table ── */}
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
          <p className="text-sm font-medium text-gray-500 mb-1">No orders found</p>
          <p className="text-xs text-gray-300">
            {activeFilter === "submitted"
              ? "No tickets are waiting for your review right now."
              : "Try a different filter or search term."}
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div
            className="hidden sm:grid gap-3 px-5 py-2 bg-gray-50 border-b border-gray-100"
            style={{ gridTemplateColumns: "116px 1fr 130px 90px 1fr 148px 20px" }}
          >
            {["Ticket ID", "Store", "Submitted by", "Date", "Contents", "Status", ""].map((h) => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y-0">
            {filtered.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>

          {/* Footer count */}
          <p className="text-center text-[11px] text-gray-300 py-4">
            Showing {filtered.length} of {tickets.length} orders
          </p>
        </>
      )}
    </div>
  );
}