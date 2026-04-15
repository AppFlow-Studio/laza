"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, List, Layers, Ship, Package } from "lucide-react";
import { useState } from "react";
import { PalletWithDetails } from "@/lib/supabase/queries/pallets";
import { PalletStatusBadge } from "./PalletStatusBadge";
import { FillLevelBar } from "./FillLevelBar";
import { PalletActionsMenu } from "./PalletActionsMenu";
import { format } from "date-fns";

interface PalletTableProps {
  pallets: PalletWithDetails[];
  isLoading: boolean;
}

type SortKey = "status" | "received_at" | "total_boxes";
type SortDir = "asc" | "desc";
type ViewMode = "flat" | "grouped";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByShipment(pallets: PalletWithDetails[]) {
  const groups = new Map<string, { label: string; supplier: string | null; poId: string | null; pallets: PalletWithDetails[] }>();

  for (const pallet of pallets) {
    const key = pallet.purchase_order_id ?? "__none__";
    if (!groups.has(key)) {
      groups.set(key, {
        label: pallet.purchase_orders?.po_number ?? "No Shipment",
        supplier: pallet.purchase_orders?.supplier_name ?? null,
        poId: pallet.purchase_order_id ?? null,
        pallets: [],
      });
    }
    groups.get(key)!.pallets.push(pallet);
  }

  // Sort groups: named POs first (by most-recent received_at), then "No Shipment"
  return [...groups.entries()]
    .sort(([aKey, aGroup], [bKey, bGroup]) => {
      if (aKey === "__none__") return 1;
      if (bKey === "__none__") return -1;
      const aDate = Math.max(...aGroup.pallets.map(p => new Date(p.received_at ?? 0).getTime()));
      const bDate = Math.max(...bGroup.pallets.map(p => new Date(p.received_at ?? 0).getTime()));
      return bDate - aDate;
    })
    .map(([, group]) => group);
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
      <div className="mb-3 rounded-full bg-gray-100 p-4">
        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600">No pallets found</p>
      <p className="mt-1 text-xs text-gray-400">Pallets are created when shipments are received.</p>
    </div>
  );
}

// ─── View switcher ────────────────────────────────────────────────────────────

function ViewSwitcher({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
      <button
        onClick={() => onChange("flat")}
        title="Flat list"
        className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
          mode === "flat"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <List className="h-3.5 w-3.5" /> Flat
      </button>
      <button
        onClick={() => onChange("grouped")}
        title="Group by shipment"
        className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
          mode === "grouped"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <Layers className="h-3.5 w-3.5" /> By Shipment
      </button>
    </div>
  );
}

// ─── Flat table ───────────────────────────────────────────────────────────────

function FlatTable({ pallets }: { pallets: PalletWithDetails[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("received_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...pallets].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "received_at") {
      cmp = new Date(a.received_at ?? 0).getTime() - new Date(b.received_at ?? 0).getTime();
    } else if (sortKey === "status") {
      cmp = a.status.localeCompare(b.status);
    } else if (sortKey === "total_boxes") {
      cmp = a.total_boxes - b.total_boxes;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "asc" ? (
        <ChevronUp className="ml-1 inline h-3.5 w-3.5 text-indigo-500" />
      ) : (
        <ChevronDown className="ml-1 inline h-3.5 w-3.5 text-indigo-500" />
      )
    ) : (
      <ChevronDown className="ml-1 inline h-3.5 w-3.5 text-gray-300" />
    );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr className="bg-gray-50">
            <Th>Pallet ID</Th>
            <Th>Warehouse</Th>
            <Th>Shipment (PO)</Th>
            <Th>Items</Th>
            <Th sortable onClick={() => handleSort("total_boxes")} className="cursor-pointer select-none">
              Fill Level <SortIcon col="total_boxes" />
            </Th>
            <Th sortable onClick={() => handleSort("status")} className="cursor-pointer select-none">
              Status <SortIcon col="status" />
            </Th>
            <Th sortable onClick={() => handleSort("received_at")} className="cursor-pointer select-none">
              Arrived <SortIcon col="received_at" />
            </Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((pallet) => (
            <tr
              key={pallet.id}
              onClick={() => router.push(`/super-admin/warehouse/pallets/${pallet.id}`)}
              className={`cursor-pointer transition-colors hover:bg-indigo-50/40 ${pallet.status === "retired" ? "opacity-50" : ""}`}
            >
              <td className="whitespace-nowrap px-4 py-3">
                <span className="font-mono text-sm font-semibold text-gray-900">{pallet.pallet_label}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="text-sm text-gray-700">{pallet?.warehouse?.name ?? "—"}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {pallet.purchase_orders ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/super-admin/purchase-orders/${pallet.purchase_order_id}`); }}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    {pallet.purchase_orders.po_number}
                  </button>
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{pallet.item_count}</td>
              <td className="px-4 py-3">
                <FillLevelBar
                  current={pallet.total_boxes}
                  capacity={(pallet.pallet_inventory ?? []).reduce((s: number, r) => s + (r.initial_box_count ?? 0), 0) || pallet.total_boxes}
                />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <PalletStatusBadge status={pallet.status as "active" | "empty" | "retired"} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {pallet.received_at ? format(new Date(pallet.received_at), "MMM d, yyyy") : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <PalletActionsMenu pallet={pallet} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Grouped table ────────────────────────────────────────────────────────────

function GroupedTable({ pallets }: { pallets: PalletWithDetails[] }) {
  const router = useRouter();
  const groups = groupByShipment(pallets);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <Th>Pallet ID</Th>
            <Th>Warehouse</Th>
            <Th>Items</Th>
            <Th>Fill Level</Th>
            <Th>Status</Th>
            <Th>Arrived</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const totalBoxes = group.pallets.reduce((s, p) => s + p.total_boxes, 0);
            const latestDate = group.pallets
              .map(p => p.received_at)
              .filter(Boolean)
              .sort()
              .at(-1);

            return (
              <>
                {/* Shipment group header */}
                <tr key={`group-${group.id}`} className="bg-gray-50/80 border-y border-gray-100">
                  <td colSpan={7} className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-50">
                        {group.poId ? (
                          <Ship className="h-3.5 w-3.5 text-indigo-500" />
                        ) : (
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        {group.poId ? (
                          <button
                            onClick={() => router.push(`/super-admin/purchase-orders/${group.poId}`)}
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            {group.label}
                          </button>
                        ) : (
                          <span className="text-sm font-semibold text-gray-500">{group.label}</span>
                        )}
                        {group.supplier && (
                          <span className="text-xs text-gray-400">— {group.supplier}</span>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-3 text-xs text-gray-500 shrink-0">
                        <span>{group.pallets.length} pallet{group.pallets.length !== 1 ? "s" : ""}</span>
                        <span className="text-gray-300">·</span>
                        <span>{totalBoxes} boxes</span>
                        {latestDate && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span>{format(new Date(latestDate), "MMM d, yyyy")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Pallet rows indented under their group */}
                {group.pallets.map((pallet, idx) => {
                  const isLast = idx === group.pallets.length - 1;
                  return (
                    <tr
                      key={pallet.id}
                      onClick={() => router.push(`/super-admin/warehouse/pallets/${pallet.id}`)}
                      className={`cursor-pointer transition-colors hover:bg-indigo-50/40 ${pallet.status === "retired" ? "opacity-50" : ""} ${isLast ? "border-b border-gray-100" : ""}`}
                    >
                      {/* Indented pallet label with tree connector */}
                      <td className="whitespace-nowrap py-3 pl-10 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 select-none">{isLast ? "└" : "├"}</span>
                          <span className="font-mono text-sm font-semibold text-gray-900">{pallet.pallet_label}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="text-sm text-gray-700">{pallet?.warehouse?.name ?? "—"}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{pallet.item_count}</td>
                      <td className="px-4 py-3">
                        <FillLevelBar
                          current={pallet.total_boxes}
                          capacity={(pallet.pallet_inventory ?? []).reduce((s: number, r) => s + (r.initial_box_count ?? 0), 0) || pallet.total_boxes}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <PalletStatusBadge status={pallet.status as "active" | "empty" | "retired"} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {pallet.received_at ? format(new Date(pallet.received_at), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <PalletActionsMenu pallet={pallet} />
                      </td>
                    </tr>
                  );
                })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function PalletTable({ pallets, isLoading }: PalletTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("flat");

  if (!isLoading && pallets.length === 0) return <EmptyState />;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-2.5">
        <span className="text-xs text-gray-500">
          {pallets.length} pallet{pallets.length !== 1 ? "s" : ""}
        </span>
        <ViewSwitcher mode={viewMode} onChange={setViewMode} />
      </div>
      {viewMode === "flat" ? (
        <FlatTable pallets={pallets} />
      ) : (
        <GroupedTable pallets={pallets} />
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
  sortable,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  sortable?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
        align === "right" ? "text-right" : "text-left"
      } text-gray-500 ${className}`}
    >
      {children}
    </th>
  );
}