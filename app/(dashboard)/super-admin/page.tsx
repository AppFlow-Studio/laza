"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useReorderAlerts } from "@/lib/hooks/queries/useAnalytics";
import { useLocations } from "@/lib/hooks/queries/useLocations";
import { useItems } from "@/lib/hooks/queries/useItems";
import { useAllTickets } from "@/lib/hooks/queries/useOrderTickets";
import { useWarehouseStats } from "@/lib/hooks/queries/useWarehouse";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    accent?: "default" | "red" | "orange" | "yellow" | "green";
    href?: string;
    loading?: boolean;
}

function StatCard({
    label,
    value,
    icon,
    accent = "default",
    href,
    loading,
}: StatCardProps) {
    const accentStyles = {
        default: {
            bg: "bg-white",
            iconBg: "bg-gray-50",
            iconColor: "text-gray-500",
            valueColor: "text-gray-900",
            border: "border-gray-200",
        },
        red: {
            bg: "bg-red-50",
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
            valueColor: "text-red-700",
            border: "border-red-200",
        },
        orange: {
            bg: "bg-orange-50",
            iconBg: "bg-orange-100",
            iconColor: "text-orange-600",
            valueColor: "text-orange-700",
            border: "border-orange-200",
        },
        yellow: {
            bg: "bg-yellow-50",
            iconBg: "bg-yellow-100",
            iconColor: "text-yellow-600",
            valueColor: "text-yellow-700",
            border: "border-yellow-200",
        },
        green: {
            bg: "bg-green-50",
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
            valueColor: "text-green-700",
            border: "border-green-200",
        },
    };

    const styles = accentStyles[accent];

    const card = (
        <div
            className={`
        ${styles.bg} ${styles.border}
       h-28 border rounded-xl p-5 transition-all duration-150
        ${href ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}
      `}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 mb-1">{label}</p>
                    {loading ? (
                        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                    ) : (
                        <p
                            className={`text-2xl font-bold ${styles.valueColor}`}
                        >
                            {value}
                        </p>
                    )}
                </div>
                <div
                    className={`${styles.iconBg} ${styles.iconColor} p-2.5 rounded-lg`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{card}</Link>;
    }
    return card;
}

// ─── Urgency Badge ────────────────────────────────────────────────────────────

function UrgencyBadge({
    urgency,
}: {
    urgency: "critical" | "warning" | "watch";
}) {
    const config = {
        critical: "bg-red-100 text-red-700 border-red-200",
        warning: "bg-orange-100 text-orange-700 border-orange-200",
        watch: "bg-yellow-100 text-yellow-700 border-yellow-200",
    };
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config[urgency]}`}
        >
            {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
        </span>
    );
}

// ─── Reorder Alerts Preview Section ──────────────────────────────────────────

function ReorderAlertsPreview({ orgId }: { orgId: string }) {
    const { data: alerts, isLoading } = useReorderAlerts(orgId);

    const top3 = useMemo(() => {
        if (!alerts) return [];
        const order = { critical: 0, warning: 1, watch: 2 };
        return [...alerts]
            .sort((a, b) => {
                // Sort by urgency first, then by weeks_remaining ascending
                const urgencyDiff = order[a.urgency] - order[b.urgency];
                if (urgencyDiff !== 0) return urgencyDiff;
                return (
                    Number(a.weeks_remaining ?? 999) -
                    Number(b.weeks_remaining ?? 999)
                );
            })
            .slice(0, 3);
    }, [alerts]);

    const criticalCount = (alerts ?? []).filter(
        (a) => a.urgency === "critical",
    ).length;
    const totalCount = (alerts ?? []).length;

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <h2 className="text-base font-semibold text-gray-900">
                        Reorder Alerts
                    </h2>
                    {!isLoading && totalCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse" />
                            {criticalCount > 0
                                ? `${criticalCount} critical`
                                : `${totalCount} alerts`}
                        </span>
                    )}
                </div>
                <Link
                    href="/super-admin/analytics"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
                >
                    View all
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </Link>
            </div>

            {/* Body */}
            <div className="px-6 py-2">
                {isLoading ? (
                    <div className="space-y-3 py-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-12 bg-gray-100 rounded-lg animate-pulse"
                            />
                        ))}
                    </div>
                ) : top3.length === 0 ? (
                    <div className="flex items-center gap-3 py-6">
                        <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                            <svg
                                className="w-5 h-5 text-green-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700">
                                All items are well-stocked
                            </p>
                            <p className="text-xs text-gray-400">
                                No items are approaching their reorder
                                threshold.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {top3.map((alert) => (
                            <div
                                key={alert.item_id}
                                className="flex items-center justify-between py-3.5 first:pt-4 last:pb-4"
                            >
                                {/* Left: badge + name */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <UrgencyBadge urgency={alert.urgency} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {alert.item_name}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {alert.item_sku}
                                        </p>
                                    </div>
                                </div>

                                {/* Right: weeks remaining */}
                                <div className="flex items-center gap-4 shrink-0 ml-4">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-gray-400">
                                            In stock
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700">
                                            {Number(
                                                alert.current_warehouse_stock,
                                            ).toLocaleString()}
                                        </p>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer link — only when there are more than 3 */}
            {!isLoading && totalCount > 3 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                    <Link
                        href="/super-admin/analytics"
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                        + {totalCount - 3} more items need attention →
                    </Link>
                </div>
            )}
        </div>
    );
}

// ─── Recent Tickets Section ───────────────────────────────────────────────────

function RecentTickets({ orgId }: { orgId: string }) {
    const { data: tickets, isLoading } = useAllTickets(orgId, { limit: 5 });

    console.log(tickets);

    const statusConfig: Record<string, { label: string; className: string }> = {
        draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
        submitted: {
            label: "Submitted",
            className: "bg-blue-100 text-blue-700",
        },
        processing: {
            label: "Processing",
            className: "bg-indigo-100 text-indigo-700",
        },
        fulfilled: {
            label: "Fulfilled",
            className: "bg-purple-100 text-purple-700",
        },
        confirmed: {
            label: "Confirmed",
            className: "bg-green-100 text-green-700",
        },
        rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
        cancelled: {
            label: "Cancelled",
            className: "bg-gray-100 text-gray-500",
        },
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">
                    Recent Orders
                </h2>
                <Link
                    href="/super-admin/orders"
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 transition-colors"
                >
                    View all
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </Link>
            </div>

            <div className="divide-y divide-gray-50">
                {isLoading ? (
                    <div className="px-6 py-3 space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-10 bg-gray-100 rounded animate-pulse"
                            />
                        ))}
                    </div>
                ) : !tickets || tickets.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-400">
                        No recent order tickets.
                    </div>
                ) : (
                    tickets.map((ticket) => {
                        const status = statusConfig[ticket.status] ?? {
                            label: ticket.status,
                            className: "bg-gray-100 text-gray-600",
                        };
                        return (
                            <Link
                                key={ticket.id}
                                href={`/super-admin/orders/${ticket.id}`}
                                className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-sm font-mono text-gray-500 shrink-0">
                                        #
                                        {String(
                                            ticket.ticket_number ?? ticket.id,
                                        ).slice(-6)}
                                    </span>
                                    <span className="text-sm text-gray-700 truncate">
                                        {ticket.requesting_location?.name ??
                                            "Unknown store"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-3">
                                    <span className="text-xs text-gray-400 hidden sm:block">
                                        {new Date(
                                            ticket.created_at,
                                        ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </span>
                                    <span
                                        className={`inline-flex w-20 justify-center items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}
                                    >
                                        {status.label}
                                    </span>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
    stores: (
        <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
        </svg>
    ),
    orders: (
        <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
        </svg>
    ),
    items: (
        <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
        </svg>
    ),
    alerts: (
        <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
        </svg>
    ),
    reorder: (
        <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
        </svg>
    ),
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdminDashboardPage() {
    const { data: userInfo } = useUserInfo();
    const orgId = userInfo?.members.organization_id ?? "";

    const { data: locations, isLoading: locationsLoading } = useLocations();
    const { data: items, isLoading: itemsLoading } = useItems();
    const { data: allTickets, isLoading: ticketsLoading } =
        useAllTickets(orgId);
    const { data: warehouseLocation } = useWarehouseLocation();
    const { data: warehouseStats, isLoading: statsLoading } = useWarehouseStats(
        warehouseLocation?.id ?? "",
    );
    const { data: alerts, isLoading: alertsLoading } = useReorderAlerts(orgId);

    const storeCount = useMemo(
        () =>
            (locations ?? []).filter((l) => l.location_type === "store").length,
        [locations],
    );
    const pendingOrderCount = useMemo(
        () => (allTickets ?? []).filter((t) => t.status === "submitted").length,
        [allTickets],
    );
    const reorderAlertCount = (alerts ?? []).length;
    const criticalCount = (alerts ?? []).filter(
        (a) => a.urgency === "critical",
    ).length;

    // Determine accent color for the reorder card based on most severe urgency
    const reorderAccent: "red" | "orange" | "yellow" | "default" =
        criticalCount > 0
            ? "red"
            : (alerts ?? []).some((a) => a.urgency === "warning")
              ? "orange"
              : reorderAlertCount > 0
                ? "yellow"
                : "default";

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-xl font-semibold text-gray-900">
                    Dashboard
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Supply chain overview for your organization
                </p>
            </div>

            {/* Stats grid — 5 cards, wraps at smaller sizes */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard
                    label="Total Stores"
                    value={storeCount}
                    icon={Icons.stores}
                    loading={locationsLoading}
                    href="/super-admin/stores"
                />
                <StatCard
                    label="Pending Orders"
                    value={pendingOrderCount}
                    icon={Icons.orders}
                    loading={ticketsLoading}
                    accent={pendingOrderCount > 0 ? "default" : "default"}
                    href="/super-admin/orders"
                />
                <StatCard
                    label="Warehouse Alerts"
                    value={warehouseStats?.low_stock_count ?? 0}
                    icon={Icons.alerts}
                    loading={statsLoading}
                    accent={
                        (warehouseStats?.low_stock_count ?? 0) > 0
                            ? "orange"
                            : "default"
                    }
                    href="/super-admin/warehouse"
                />
                <StatCard
                    label="Total Items"
                    value={(items ?? []).length}
                    icon={Icons.items}
                    loading={itemsLoading}
                    href="/super-admin/items"
                />
                {/* NEW: Reorder stat card */}
                <StatCard
                    label="Approaching Reorder"
                    value={alertsLoading ? "—" : reorderAlertCount}
                    icon={Icons.reorder}
                    accent={alertsLoading ? "default" : reorderAccent}
                    loading={alertsLoading}
                    href="/super-admin/analytics"
                />
            </div>

            {/* NEW: Reorder alerts preview — only render if we have data or loading */}
            {orgId && <ReorderAlertsPreview orgId={orgId} />}

            {/* Recent tickets */}
            {orgId && <RecentTickets orgId={orgId} />}
        </div>
    );
}
