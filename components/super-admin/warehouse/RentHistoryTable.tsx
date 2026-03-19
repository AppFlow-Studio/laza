"use client";

import { useRentSnapshots } from "@/lib/hooks/queries/useWarehouse";
import { useOrganization } from "@clerk/nextjs";
import { format } from "date-fns";

export function RentHistoryTable() {
    const { organization } = useOrganization();
    const { data: snapshots, isLoading } = useRentSnapshots(
        organization?.id ?? "",
    );

    if (isLoading) return <div>Loading rent history...</div>;
    if (!snapshots?.length) return <div>No rent snapshots yet.</div>;

    const total = snapshots.reduce((sum, s) => sum + Number(s.total_cost), 0);

    return (
        <div className="rounded-lg border">
            <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                    <tr>
                        <th className="px-4 py-3 text-left font-medium">
                            Month
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                            Active Pallets
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                            Rate / Pallet
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                            Total Cost
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {snapshots.map((snap) => (
                        <tr
                            key={snap.id}
                            className="border-b last:border-0 hover:bg-muted/30"
                        >
                            <td className="px-4 py-3">
                                {format(
                                    new Date(snap.snapshot_date),
                                    "MMMM yyyy",
                                )}
                            </td>
                            <td className="px-4 py-3 text-right">
                                {snap.active_pallet_count}
                            </td>
                            <td className="px-4 py-3 text-right">
                                ${Number(snap.rate_per_pallet).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                                ${Number(snap.total_cost).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t bg-muted/50">
                    <tr>
                        <td colSpan={3} className="px-4 py-3 font-medium">
                            Total
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                            ${total.toFixed(2)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
