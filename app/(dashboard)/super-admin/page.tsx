"use client";

import { useOrganizationUsers } from "@/lib/hooks/queries/useUsers";
import { useAlerts } from "@/lib/hooks/queries/useInventory";
import { useItems } from "@/lib/hooks/queries/useItems";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
// import { useAllTickets, usePendingTicketCount } from "@/lib/hooks/queries/useOrderTickets";
import StatsCard from "@/components/admin/dashboard/StatsCard";
import { Store, ClipboardList, AlertTriangle, Package } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

// Status badge helper — mirrors the style used elsewhere in the admin dashboard
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        draft: "bg-zinc-100 text-zinc-600",
        submitted: "bg-yellow-100 text-yellow-700",
        processing: "bg-blue-100 text-blue-700",
        fulfilled: "bg-green-100 text-green-700",
        confirmed: "bg-emerald-100 text-emerald-700",
        rejected: "bg-red-100 text-red-700",
        cancelled: "bg-zinc-100 text-zinc-500",
    };
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? "bg-zinc-100 text-zinc-600"}`}
        >
            {status}
        </span>
    );
}

export default function SuperAdminDashboard() {
    const { data: userInfo } = useUserInfo();

    // Stats
    const { data: warehouse } = useWarehouseLocation();
    const { data: items } = useItems();
    const { data: warehouseAlerts } = useAlerts({
        resolved: false,
        locationId: warehouse?.id,
    });
    // const { data: pendingCount } = usePendingTicketCount(orgId)
    const pendingCount = 0
    const allTickets = [0]
    const ticketsLoading = false

    // Store count: all locations that are type 'store'
    // const { data: allTickets, isLoading: ticketsLoading } = useAllTickets(orgId, {
    //     limit: 5,
    //     status: "submitted",
    // });

    const stats = [
        {
            title: "Total Stores",
            value: userInfo?.storeCount ?? 0,
            icon: Store,
            trend: undefined,
        },
        {
            title: "Pending Orders",
            value: pendingCount ?? 0,
            icon: ClipboardList,
            trend: undefined,
            className:
                pendingCount && pendingCount > 0
                    ? "border-yellow-200 bg-yellow-50"
                    : "",
        },
        {
            title: "Warehouse Alerts",
            value: warehouseAlerts?.length ?? 0,
            icon: AlertTriangle,
            trend: undefined,
            className:
                warehouseAlerts && warehouseAlerts.length > 0
                    ? "border-red-200 bg-red-50"
                    : "",
        },
        {
            title: "Total Items",
            value: items?.length ?? 0,
            icon: Package,
            trend: undefined,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <StatsCard key={stat.title} {...stat} />
                ))}
            </div>

            {/* Recent Submitted Tickets */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-zinc-900">
                        Recent Submitted Orders
                    </h2>
                    <Link
                        href="/super-admin/orders"
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        View all →
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-zinc-200 divide-y divide-zinc-100">
                    {ticketsLoading ? (
                        // Skeleton rows
                        Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between px-6 py-4 animate-pulse"
                            >
                                <div className="space-y-2">
                                    <div className="h-4 w-32 bg-zinc-100 rounded" />
                                    <div className="h-3 w-24 bg-zinc-100 rounded" />
                                </div>
                                <div className="h-5 w-20 bg-zinc-100 rounded-full" />
                            </div>
                        ))
                    ) : allTickets.length > 0 ? (
                        allTickets.map((index, ticket) => (
                            <Link
                                key={index}
                                href={`/super-admin/orders/${ticket.id}`}
                                className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 truncate">
                                        {ticket.locations?.name ?? "Unknown Store"}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {ticket.item_count ?? 0} item
                                        {ticket.item_count !== 1 ? "s" : ""}
                                        {" · "}
                                        {ticket.submitted_at
                                            ? formatDistanceToNow(
                                                new Date(ticket.submitted_at),
                                                { addSuffix: true }
                                            )
                                            : "just now"}
                                    </p>
                                </div>
                                <StatusBadge status={ticket.status} />
                            </Link>
                        ))
                    ) : (
                        <div className="px-6 py-10 text-center text-sm text-zinc-500">
                            No pending orders right now.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}