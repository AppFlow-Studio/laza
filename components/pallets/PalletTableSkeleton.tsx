"use client";

export function PalletTableSkeleton() {
  return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
            <tr className="bg-gray-50">
              {["Pallet ID", "Warehouse", "Shipment", "Items", "Fill Level", "Status", "Arrived", ""].map(
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
            {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-gray-100" />
                      </td>
                  ))}
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
  );
}