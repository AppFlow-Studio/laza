"use client";

import { PalletWithDetails } from "@/lib/supabase/queries/pallets";

type InventoryRow = PalletWithDetails["pallet_inventory"][number];

interface PalletContentsTableProps {
  inventory: InventoryRow[];
}

function getEffectivePpb(row: InventoryRow): number {
  return (
    row.pieces_per_box_override ??
    row.purchase_order_items?.pieces_per_box ??
    0
  );
}

export function PalletContentsTable({ inventory }: PalletContentsTableProps) {
  if (inventory.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
        <p className="text-sm text-gray-400">No items on this pallet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Contents ({inventory.length} item type{inventory.length !== 1 ? "s" : ""})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-50">
          <thead className="bg-gray-50">
            <tr>
              {["Item", "Category", "Boxes", "Units/Box", "Total Units", "Unit Cost", "Line Value"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {inventory.map((row) => {
              const ppb = getEffectivePpb(row);
              const totalUnits = row.box_count * ppb;
              const unitCost =
                (row as any).purchase_order_items?.unit_cost_after ??
                (row as any).items?.current_unit_cost;
              const lineValue = unitCost ? totalUnits * unitCost : null;

              return (
                <tr key={row.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {row.items?.short_label ?? row.items?.name ?? "—"}
                      </p>
                      {row.items?.sku && (
                        <p className="text-xs text-gray-400">{row.items.sku}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">—</td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900">
                    <span className="font-semibold">{row.box_count}</span>
                    <span className="text-gray-400">/{row.initial_box_count}</span>
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-600">
                    {ppb > 0 ? ppb : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900">
                    {ppb > 0 ? totalUnits.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-600">
                    {unitCost != null
                      ? `$${Number(unitCost).toFixed(4)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-900">
                    {lineValue != null
                      ? `$${lineValue.toFixed(2)}`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
