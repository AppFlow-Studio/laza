"use client";

/**
 * TASK 3.3 — Store Admin: Ticket Detail Page
 * File: app/(dashboard)/admin/orders/[palletId]/page.tsx
 */

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, Loader2, Truck,
  Send, FileEdit, Clock, Package, MapPin, ChevronRight,
  AlertTriangle, RotateCcw,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTicket, useCreateTicket } from "@/lib/hooks/queries/useOrderTickets";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { CancelOrderDialog } from "@/components/orders/CancelOrderDialog";

// ─── Types ────────────────────────────────────────────────────────────────────
type TicketStatus =
  | "draft" | "submitted" | "processing" | "fulfilled"
  | "in_transit" | "delivered" | "confirmed" | "rejected" | "cancelled";

type DeliveryType = "company" | "self";

// Shape from getTicketById() — includes items + logs join
type TicketItem = {
  id: string;
  item_id: number;
  quantity_boxes: number;
  quantity_units: number;
  fulfilled_boxes: number | null;
  fulfilled_units: number | null;
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
  // note: ticket_id is NOT selected in getTicketById() — omit it
  previous_status: TicketStatus | null;
  new_status: TicketStatus;
  changed_by: string;
  notes: string | null;
  created_at: string;
};

// address is a JSONB column — Supabase returns it as Json (unknown at runtime).
// We parse it ourselves in helpers below rather than trusting the type.
type LocationAddress = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

type TicketDelivery = {
  id: string;
  delivery_type: DeliveryType | null;
  delivered_by: string | null;
  estimated_pallet_count: number | null;
  actual_pallet_count: number | null;
  delivery_rate_at_time: number | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  payment_status: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  notes: string | null;
};

// Exactly mirrors the getTicketById() select shape — every joined table included.
// Use NonNullable<Awaited<ReturnType<typeof getTicketById>>> in production
// once the query file is regenerated after migrations (Task 1.13).
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
  // delivery_type lives on order_tickets (Task 1.43, Schema v2 §5.7)
  delivery_type: DeliveryType | null;
  submitted_at: string | null;
  fulfilled_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  is_auto_approved: boolean;
  parent_ticket_id: string | null;
  // address is JSONB → Supabase types it as `Json` (not a typed object)
  requesting_location: {
    id: string;
    name: string;
    address: unknown; // Json from Supabase — parse with parseAddress() helper
  } | null;
  warehouse_location: {
    id: string;
    name: string;
  } | null;
  order_ticket_items: TicketItem[];
  order_ticket_logs: TicketLog[];
  ticket_deliveries: TicketDelivery[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// address is JSONB — Supabase types it as `unknown`. Parse it safely.
function parseAddress(raw: unknown): LocationAddress {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as LocationAddress;
  }
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as LocationAddress; } catch { /* fall through */ }
  }
  return {};
}

function formatAddress(raw: unknown): string {
  const a = parseAddress(raw);
  return [a.street, a.city, a.state, a.zip].filter(Boolean).join(", ") || "—";
}

function shortId(uuid: string) {
  return `…${uuid.slice(-8).toUpperCase()}`;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}

function formatDateShort(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date(iso));
}

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_META: Record<TicketStatus, {
  label: string; badge: string; dot: string;
}> = {
  draft:       { label: "Draft",       badge: "bg-gray-100 text-gray-500",     dot: "bg-gray-300"    },
  submitted:   { label: "Submitted",   badge: "bg-blue-50 text-blue-700",      dot: "bg-blue-500"    },
  processing:  { label: "Processing",  badge: "bg-yellow-50 text-yellow-700",  dot: "bg-yellow-500"  },
  fulfilled:   { label: "Fulfilled",   badge: "bg-violet-50 text-violet-700",  dot: "bg-violet-500"  },
  in_transit:  { label: "In Transit",  badge: "bg-indigo-50 text-indigo-700",  dot: "bg-indigo-500"  },
  delivered:   { label: "Delivered",   badge: "bg-teal-50 text-teal-700",      dot: "bg-teal-500"    },
  confirmed:   { label: "Confirmed",   badge: "bg-green-50 text-green-700",    dot: "bg-green-500"   },
  rejected:    { label: "Rejected",    badge: "bg-red-50 text-red-700",        dot: "bg-red-500"     },
  cancelled:   { label: "Cancelled",   badge: "bg-gray-100 text-gray-400",     dot: "bg-gray-300"    },
};

// Timeline steps store admins see (excludes in_transit / delivered — those are
// warehouse-internal; store admin just sees fulfilled → confirmed)
const TIMELINE_STEPS: TicketStatus[] = [
  "draft", "submitted", "processing", "fulfilled", "confirmed",
];

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TicketStatus }) {
  const { label, badge } = STATUS_META[status] ?? { label: status, badge: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge}`}>
      {label}
    </span>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────
function StatusTimeline({ status }: { status: TicketStatus }) {
  const isTerminal = status === "rejected" || status === "cancelled";
  // Map in_transit / delivered / confirmed all to "fulfilled" position for display
  const displayStatus =
    status === "in_transit" || status === "delivered" ? "fulfilled" : status;
  const currentIdx = TIMELINE_STEPS.indexOf(
    isTerminal ? "submitted" : displayStatus
  );

  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-3">
        Order progress
      </p>
      <div className="flex items-start">
        {TIMELINE_STEPS.map((step, i) => {
          const isDone    = !isTerminal && i < currentIdx;
          const isActive  = !isTerminal && i === currentIdx;
          const isReject  = isTerminal  && step === "submitted";

          return (
            <div key={step} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {i < TIMELINE_STEPS.length - 1 && (
                <div
                  className="absolute top-[10px] left-[calc(50%+11px)] right-[calc(-50%+11px)] h-[2px] z-0"
                  style={{
                    background: isDone ? "#6366f1" : "#e5e7eb",
                  }}
                />
              )}

              {/* Dot */}
              <div
                className={`relative z-10 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                  isReject
                    ? "border-red-400 bg-red-400"
                    : isDone
                    ? "border-indigo-600 bg-indigo-600"
                    : isActive
                    ? "border-indigo-600 bg-white ring-4 ring-indigo-100"
                    : "border-gray-200 bg-white"
                }`}
              >
                {isReject ? (
                  <X size={10} className="text-white" />
                ) : isDone ? (
                  <CheckCircle2 size={10} className="text-white" strokeWidth={2.5} />
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-indigo-600" />
                ) : null}
              </div>

              {/* Label */}
              <span
                className={`mt-1.5 text-[10px] text-center leading-tight font-medium ${
                  isReject ? "text-red-500 font-semibold" :
                  isDone || isActive ? "text-gray-800 font-semibold" : "text-gray-400"
                }`}
              >
                {STATUS_META[step].label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status banner ────────────────────────────────────────────────────────────
function StatusBanner({ ticket }: { ticket: Ticket }) {
  const { status, rejection_reason, parent_ticket_id } = ticket;

  if (status === "draft") {
    return (
      <div className="flex items-start gap-2.5 p-3 bg-yellow-50 border border-yellow-200 rounded-xl mb-5 text-yellow-800 text-xs">
        <FileEdit size={14} className="flex-shrink-0 mt-0.5 text-yellow-600" />
        <span><strong>Draft</strong> — this order hasn't been submitted. Add items and submit when ready.</span>
      </div>
    );
  }
  if (status === "submitted") {
    return (
      <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-5 text-blue-800 text-xs">
        <Send size={14} className="flex-shrink-0 mt-0.5 text-blue-600" />
        <span>Submitted to the warehouse. You can <strong>cancel</strong> this order before it's picked up for processing.</span>
      </div>
    );
  }
  if (status === "processing") {
    return (
      <div className="flex items-start gap-2.5 p-3 bg-yellow-50 border border-yellow-200 rounded-xl mb-5 text-yellow-800 text-xs">
        <Loader2 size={14} className="flex-shrink-0 mt-0.5 text-yellow-600 animate-spin" />
        <span>The warehouse is <strong>reviewing this order</strong>. Cancellation is no longer possible.</span>
      </div>
    );
  }
  if (status === "fulfilled" || status === "in_transit" || status === "delivered") {
    const isPartial = ticket.order_ticket_items.some(
      (i) => i.fulfilled_boxes !== null && i.fulfilled_boxes < i.quantity_boxes
    );
    return (
      <div className="flex items-start gap-2.5 p-3 bg-violet-50 border border-violet-200 rounded-xl mb-5 text-violet-800 text-xs">
        <Truck size={14} className="flex-shrink-0 mt-0.5 text-violet-600" />
        <div>
          {isPartial ? (
            <><strong>Partially fulfilled.</strong> Some items were unavailable. A remainder ticket has been created for the shortfall.</>
          ) : (
            <><strong>Fulfilled</strong> — your order is on its way. Waiting for delivery confirmation.</>
          )}
          {parent_ticket_id && (
            <div className="mt-1.5">
              <Link
                href={`/admin/orders/${parent_ticket_id}`}
                className="underline text-violet-700 font-medium"
              >
                View remainder ticket →
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (status === "confirmed") {
    return (
      <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-200 rounded-xl mb-5 text-green-800 text-xs">
        <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5 text-green-600" />
        <span><strong>Confirmed</strong> — all items received and added to your store inventory.</span>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-5">
        <div className="flex items-center gap-1.5 text-red-700 font-bold text-[11px] uppercase tracking-wide mb-2">
          <XCircle size={13} /> Order rejected
        </div>
        <p className="text-sm text-red-800 leading-relaxed">
          {rejection_reason ?? "No reason provided."}
        </p>
      </div>
    );
  }
  if (status === "cancelled") {
    return (
      <div className="flex items-start gap-2.5 p-3 bg-gray-50 border border-gray-200 rounded-xl mb-5 text-gray-600 text-xs">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span>This order was <strong>cancelled</strong>.</span>
      </div>
    );
  }
  return null;
}

// ─── Items table ──────────────────────────────────────────────────────────────
function ItemsTable({
  ticket,
  isDraftEditing,
}: {
  ticket: Ticket;
  isDraftEditing: boolean;
}) {
  const { status, order_ticket_items } = ticket;
  const showFulfilled = ["fulfilled", "in_transit", "delivered", "confirmed"].includes(status);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="grid gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100"
        style={{
          gridTemplateColumns: showFulfilled
            ? "1fr 100px 90px 90px 70px"
            : isDraftEditing
            ? "1fr 120px"
            : "1fr 90px 90px",
        }}
      >
        {(showFulfilled
          ? ["Item", "SKU", "Ordered", "Fulfilled", ""]
          : isDraftEditing
          ? ["Item", "Qty (boxes)"]
          : ["Item", "SKU", "Qty (boxes)"]
        ).map((h) => (
          <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {order_ticket_items.map((line) => {
        const name = line.items?.short_label ?? line.items?.name ?? "Unknown item";
        const sku  = line.items?.sku;
        const isFullFilled  = line.fulfilled_boxes !== null && line.fulfilled_boxes >= line.quantity_boxes;
        const isPartialFill = line.fulfilled_boxes !== null && line.fulfilled_boxes > 0 && !isFullFilled;
        const isZeroFill    = line.fulfilled_boxes !== null && line.fulfilled_boxes === 0;

        const fulBadge = isFullFilled
          ? <span className="text-[10px] font-semibold bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">Full</span>
          : isPartialFill
          ? <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">Partial</span>
          : isZeroFill
          ? <span className="text-[10px] font-semibold bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">None</span>
          : null;

        const fulTextClass = isFullFilled
          ? "text-green-700 font-semibold"
          : isPartialFill
          ? "text-amber-700 font-semibold"
          : "text-gray-400";

        return (
          <div
            key={line.id}
            className="grid gap-3 items-center px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
            style={{
              gridTemplateColumns: showFulfilled
                ? "1fr 100px 90px 90px 70px"
                : isDraftEditing
                ? "1fr 120px"
                : "1fr 90px 90px",
            }}
          >
            {/* Name */}
            <div>
              <div className="text-sm font-semibold text-gray-900">{name}</div>
              {!isDraftEditing && sku && (
                <div style={{ fontFamily: "var(--font-mono, monospace)" }} className="text-[10px] text-gray-400 mt-0.5">
                  {sku}
                </div>
              )}
            </div>

            {/* SKU (non-draft, non-fulfilled views) */}
            {!showFulfilled && !isDraftEditing && (
              <div className="text-xs text-gray-600 font-semibold">{line.quantity_boxes} boxes</div>
            )}

            {/* Draft: editable qty */}
            {isDraftEditing && (
              <div className="flex items-center">
                <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded-l-md bg-white hover:bg-gray-50 text-gray-500 text-sm font-medium transition-all">−</button>
                <input
                  type="number"
                  defaultValue={line.quantity_boxes}
                  min={1}
                  max={999}
                  step={1}
                  onKeyDown={(e) => [".", "e", "E", "-", "+"].includes(e.key) && e.preventDefault()}
                  className="border border-gray-200 rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center h-[26px] w-9 text-xs font-semibold"
                />
                <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded-r-md bg-white hover:bg-gray-50 text-gray-500 text-sm font-medium transition-all">+</button>
              </div>
            )}

            {/* Fulfilled view */}
            {showFulfilled && (
              <>
                <div className="text-xs font-semibold text-gray-700">{line.quantity_boxes} boxes</div>
                <div className={`text-xs ${fulTextClass}`}>
                  {line.fulfilled_boxes ?? "—"} boxes
                </div>
                <div>{fulBadge}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Timeline log ─────────────────────────────────────────────────────────────
function TimelineLog({ logs }: { logs: TicketLog[] }) {
  if (!logs.length) {
    return <p className="text-xs text-gray-400 py-4 text-center">No activity yet.</p>;
  }
  return (
    <div className="flex flex-col gap-0">
      {logs.map((log, i) => {
        const meta = STATUS_META[log.new_status];
        const isLast = i === logs.length - 1;
        return (
          <div key={log.id} className="flex gap-3">
            {/* Line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${meta?.dot ?? "bg-gray-300"}`} />
              {!isLast && <div className="w-px flex-1 bg-gray-100 my-1" />}
            </div>
            {/* Content */}
            <div className="pb-4 flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-800">{meta?.label ?? log.new_status}</div>
              {log.notes && <div className="text-[11px] text-gray-500 mt-0.5">{log.notes}</div>}
              <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(log.created_at)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TicketDetailPage() {
  const router   = useRouter();
  const params   = useParams();
  const ticketId = params.id as string;

  const { data: userInfo }          = useUserInfo();
  const { data: warehouseLocation } = useWarehouseLocation();

  // useTicket(id) → getTicketById(id) — joins items + logs + deliveries.
  // Cast to our local Ticket type which mirrors the select shape exactly.
  const { data: rawTicket, isLoading } = useTicket(ticketId);
  const ticket = rawTicket as Ticket | undefined;

  // Mutations
  const { mutate: createTicket, isPending: isResubmitting } = useCreateTicket();

  const [activeTab, setActiveTab] = useState<"items" | "log">("items");

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] gap-2 text-gray-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading order…</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
        <Package size={32} className="text-gray-200 mb-3" />
        <p className="text-sm font-medium text-gray-500 mb-1">Order not found</p>
        <button onClick={() => router.back()} className="text-xs text-indigo-600 underline">← Back to orders</button>
      </div>
    );
  }

  const t = ticket;
  const { status } = t;
  const isDraft = status === "draft";

  // ── Derived values ──
  const totalBoxes = t.order_ticket_items.reduce((s, i) => s + i.quantity_boxes, 0);
  const hasPartialFulfillment = t.order_ticket_items.some(
    (i) => i.fulfilled_boxes !== null && i.fulfilled_boxes < i.quantity_boxes
  );

  // ── Resubmit as new draft (rejected flow) ──
  // Copies all items from the rejected ticket into a fresh draft
  const handleResubmit = () => {
    if (!userInfo || !warehouseLocation) return;
    createTicket(
      {
        organizationId:        t.organization_id,
        requestingLocationId:  t.requesting_location_id,
        warehouseLocationId:   warehouseLocation.id,
        requestedBy:           userInfo.userId ?? "",
        initialStatus:         "draft",
        deliveryType:          t.delivery_type ?? "company",
        notes:                 t.notes ?? undefined,
        items: t.order_ticket_items.map((i) => ({
          itemId:        i.item_id,
          quantityBoxes: i.quantity_boxes,
          quantityUnits: i.quantity_units,
        })),
      },
      {
        onSuccess: (newTicket) => {
          toast.success("Copied to a new draft");
          router.push(`/admin/orders/${newTicket.id}`);
        },
        onError: () => toast.error("Failed to resubmit"),
      }
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <button
          onClick={() => router.push("/admin/orders")}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-violet-300 px-3 py-1.5 rounded-lg transition-all"
        >
          <ArrowLeft size={12} /> Orders
        </button>

        {/* Ticket ID */}
        <span
          style={{ fontFamily: "var(--font-mono, monospace)" }}
          className="text-sm font-medium text-gray-600"
          title={t.id}
        >
          {shortId(t.id)}
        </span>

        <StatusBadge status={status} />

        {/* Partial fulfillment badge */}
        {hasPartialFulfillment && (
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
            Partial fill
          </span>
        )}

        {/* Auto-approved badge */}
        {t.is_auto_approved && (
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
            Auto-approved
          </span>
        )}

        {/* Action buttons — right side */}
        <div className="ml-auto flex items-center gap-2">
          {/* Cancel — only when submitted. Component self-hides for other statuses. */}
          <CancelOrderDialog
            ticketId={t.id}
            status={status}
            onCancelled={() => router.push("/admin/orders")}
          />

          {/* Submit — only on draft */}
          {status === "draft" && (
            <button
              onClick={() => {
                // In production: call useUpdateTicketStatus() to move draft → submitted
                toast.success("Order submitted");
                router.push("/admin/orders");
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all hover:-translate-y-px shadow-[0_2px_8px_rgba(99,102,241,.25)]"
            >
              <Send size={12} /> Submit Order
            </button>
          )}

          {/* Resubmit — only on rejected */}
          {status === "rejected" && (
            <button
              onClick={handleResubmit}
              disabled={isResubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 border border-indigo-300 bg-white rounded-lg hover:bg-violet-50 disabled:opacity-50 transition-all"
            >
              {isResubmitting
                ? <Loader2 size={12} className="animate-spin" />
                : <RotateCcw size={12} />
              }
              Resubmit as New Order
            </button>
          )}

          {/* View remainder ticket — for partial fulfillment */}
          {hasPartialFulfillment && t.parent_ticket_id && (
            <Link
              href={`/admin/orders/${t.parent_ticket_id}`}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-700 border border-violet-200 bg-violet-50 rounded-lg hover:bg-violet-100 transition-all"
            >
              Remainder ticket <ChevronRight size={11} />
            </Link>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-6 py-5 grid grid-cols-[1fr_272px] gap-5 max-w-6xl">

        {/* ── LEFT ── */}
        <div>
          {/* Timeline */}
          <StatusTimeline status={status} />

          {/* Status-specific banner */}
          <StatusBanner ticket={t} />

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-100 mb-4">
            {(["items", "log"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold capitalize transition-all border-b-2 -mb-px ${
                  activeTab === tab
                    ? "text-indigo-600 border-indigo-600"
                    : "text-gray-400 border-transparent hover:text-gray-700"
                }`}
              >
                {tab === "items" ? "Items" : "Activity log"}
              </button>
            ))}
          </div>

          {/* Items tab */}
          {activeTab === "items" && (
            <>
              <ItemsTable ticket={t} isDraftEditing={isDraft} />

              {/* Draft notes edit */}
              {isDraft && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">Notes</label>
                  <textarea
                    defaultValue={t.notes ?? ""}
                    rows={2}
                    placeholder="Add notes to this order…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none placeholder:text-gray-300"
                  />
                </div>
              )}
            </>
          )}

          {/* Log tab */}
          {activeTab === "log" && (
            <TimelineLog logs={t.order_ticket_logs ?? []} />
          )}
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="flex flex-col gap-3">

          {/* Order details card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Order details</p>
            <div className="flex flex-col divide-y divide-gray-50">
              {[
                {
                  key: "Location",
                  val: t.requesting_location?.name,
                  icon: <MapPin size={11} className="text-gray-300" />,
                },
                t.requesting_location?.address && {
                  key: "Address",
                  val: formatAddress(t.requesting_location.address),
                  icon: <MapPin size={11} className="text-gray-300 opacity-0" />,
                },
                {
                  key: "Created",
                  val: formatDateShort(t.created_at),
                  icon: <Clock size={11} className="text-gray-300" />,
                },
                t.submitted_at && {
                  key: "Submitted",
                  val: formatDateShort(t.submitted_at),
                  icon: <Send size={11} className="text-gray-300" />,
                },
                t.fulfilled_at && {
                  key: "Fulfilled",
                  val: formatDateShort(t.fulfilled_at),
                  icon: <Truck size={11} className="text-gray-300" />,
                },
                t.confirmed_at && {
                  key: "Confirmed",
                  val: formatDateShort(t.confirmed_at),
                  icon: <CheckCircle2 size={11} className="text-gray-300" />,
                },
                {
                  key: "Delivery",
                  // prefer ticket_deliveries[0].delivery_type if set, fallback to ticket field
                  val: (t.ticket_deliveries?.[0]?.delivery_type ?? t.delivery_type) === "self"
                    ? "Self-pickup"
                    : "Company delivery",
                  icon: <Truck size={11} className="text-gray-300" />,
                },
                {
                  key: "Items",
                  val: `${t.order_ticket_items.length} items · ${totalBoxes} boxes`,
                  icon: <Package size={11} className="text-gray-300" />,
                },
              ]
                .filter(Boolean)
                .map(({ key, val, icon }: any) => (
                  <div key={key} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      {icon}{key}
                    </div>
                    <span className="text-xs font-semibold text-gray-800 text-right max-w-[130px] truncate">
                      {val ?? "—"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Notes — readonly if not draft */}
          {t.notes && status !== "draft" && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Notes</p>
              <p className="text-xs text-gray-600 leading-relaxed">{t.notes}</p>
            </div>
          )}

          {/* Remainder ticket shortcut */}
          {hasPartialFulfillment && t.parent_ticket_id && (
            <div className="bg-white border border-violet-200 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 mb-2">Remainder ticket</p>
              <Link
                href={`/admin/orders/${t.parent_ticket_id}`}
                className="flex items-center gap-2 text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors"
              >
                <Package size={12} className="text-violet-400" />
                {shortId(t.parent_ticket_id)}
                <ChevronRight size={11} className="ml-auto text-violet-300" />
              </Link>
              <p className="text-[11px] text-violet-400 mt-1.5">
                The unfulfilled portion was resubmitted as a new ticket.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}