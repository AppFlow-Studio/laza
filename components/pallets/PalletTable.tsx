//super-admin/purchase_orders/new
"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import { PalletWithDetails } from "@/lib/supabase/queries/pallets";
import { PalletStatusBadge } from "./PalletStatusBadge";
import { TemperatureBadge } from "./TemperatureBadge";
import { FillLevelBar } from "./FillLevelBar";
import { PalletActionsMenu } from "./PalletActionsMenu";
import { format } from "date-fns";

interface PalletTableProps {
  pallets: PalletWithDetails[];
  isLoading: boolean;
}

type SortKey = "status" | "received_at" | "total_boxes";
type SortDir = "asc" | "desc";

export function PalletTable({ pallets, isLoading }: PalletTableProps) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("received_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  console.log(pallets)

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
      cmp =
        new Date(a.received_at ?? 0).getTime() -
        new Date(b.received_at ?? 0).getTime();
    } else if (sortKey === "status") {
      cmp = a.status.localeCompare(b.status);
    } else if (sortKey === "total_boxes") {
      cmp = a.total_boxes - b.total_boxes;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (!isLoading && pallets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
        <div className="mb-3 rounded-full bg-gray-100 p-4">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">No pallets found</p>
        <p className="mt-1 text-xs text-gray-400">
          Pallets are created when shipments are received.
        </p>
      </div>
    );
  }

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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <Th>Pallet ID</Th>
              <Th>Warehouse Name</Th>
              <Th>Storage Space</Th>
              <Th>Shipment (PO)</Th>
              <Th>Items</Th>
              <Th
                sortable
                onClick={() => handleSort("total_boxes")}
                className="cursor-pointer select-none"
              >
                Fill Level <SortIcon col="total_boxes" />
              </Th>
              <Th
                sortable
                onClick={() => handleSort("status")}
                className="cursor-pointer select-none"
              >
                Status <SortIcon col="status" />
              </Th>
              <Th
                sortable
                onClick={() => handleSort("received_at")}
                className="cursor-pointer select-none"
              >
                Arrived <SortIcon col="received_at" />
              </Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((pallet) => (
              <tr
                key={pallet.id}
                onClick={() =>
                  router.push(
                    `/super-admin/warehouse/pallets/${pallet.id}`
                  )
                }
                className={`cursor-pointer transition-colors hover:bg-indigo-50/40 ${
                  pallet.status === "retired" ? "opacity-50" : ""
                }`}
              >
                {/* Pallet Label */}
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    {pallet.pallet_label}
                  </span>
                </td>

                {/* warehouse name */}
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    {pallet?.warehouse?.name}
                  </span>
                </td>

                {/* Storage Space */}
                <td className="whitespace-nowrap px-4 py-3">
                  {pallet.storage_spaces ? (
                    <div className="flex items-center gap-2">
                      <TemperatureBadge
                        type={pallet.storage_spaces.temperature_type}
                      />
                      <span className="text-sm text-gray-700">
                        {pallet.storage_spaces.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>

                {/* PO */}
                <td className="whitespace-nowrap px-4 py-3">
                  {pallet.purchase_orders ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/super-admin/purchase-orders/${pallet.purchase_order_id}`
                        );
                      }}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {pallet.purchase_orders.po_number}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>

                {/* Items count */}
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {pallet.item_count}
                </td>

                {/* Fill Level */}
                <td className="px-4 py-3">
                  <FillLevelBar
                    current={pallet.total_boxes}
                    // Capacity = initial_box_count sum from pallet_inventory
                    capacity={
                      (pallet.pallet_inventory ?? []).reduce(
                        (s: number, r) => s + (r.initial_box_count ?? 0),
                        0
                      ) || pallet.total_boxes
                    }
                  />
                </td>

                {/* Status */}
                <td className="whitespace-nowrap px-4 py-3">
                  <PalletStatusBadge status={pallet.status as "active" | "empty" | "retired"} />
                </td>

                {/* Arrived */}
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {pallet.received_at
                    ? format(new Date(pallet.received_at), "MMM d, yyyy")
                    : "—"}
                </td>

                {/* Actions */}
                <td
                  className="whitespace-nowrap px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <PalletActionsMenu pallet={pallet} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
