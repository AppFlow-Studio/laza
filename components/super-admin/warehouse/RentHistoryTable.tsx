"use client";

import { motion } from "framer-motion";
import { useRentSnapshots } from "@/lib/hooks/queries/useWarehouse";
import { useOrganization } from "@clerk/nextjs";
import { format } from "date-fns";

const fadeRow = {
    hidden: { opacity: 0, y: 6 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.24, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
    }),
};

export function RentHistoryTable() {
    const { organization } = useOrganization();
    const { data: snapshots, isLoading } = useRentSnapshots(
        organization?.id ?? "",
    );

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (!snapshots?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-white rounded-xl border border-gray-200">
                <p className="text-sm text-gray-400">No rent snapshots yet.</p>
                <p className="text-xs text-gray-300 mt-1">Snapshots are recorded monthly.</p>
            </div>
        );
    }

    const total = snapshots.reduce((sum, s) => sum + Number(s.total_cost), 0);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100">
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Month
                        </th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Active Pallets
                        </th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Rate / Pallet
                        </th>
                        <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Total Cost
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {snapshots.map((snap, i) => (
                        <motion.tr
                            key={snap.id}
                            custom={i}
                            variants={fadeRow}
                            initial="hidden"
                            animate="show"
                            className="hover:bg-gray-50/60 transition-colors"
                        >
                            <td className="px-5 py-3.5 font-medium text-gray-800">
                                {format(new Date(snap.snapshot_date), "MMMM yyyy")}
                            </td>
                            <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                                {snap.active_pallet_count}
                            </td>
                            <td className="px-5 py-3.5 text-right tabular-nums text-gray-700">
                                ${Number(snap.rate_per_pallet).toFixed(2)}
                            </td>
                            <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-gray-900">
                                ${Number(snap.total_cost).toFixed(2)}
                            </td>
                        </motion.tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                        <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-600">
                            Total
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-gray-900 tabular-nums">
                            ${total.toFixed(2)}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
