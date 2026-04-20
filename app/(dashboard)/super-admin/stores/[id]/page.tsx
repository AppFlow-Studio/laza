"use client";

import { useState, useMemo } from "react";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { useEmployeesByLocation } from "@/lib/hooks/queries/useEmployees";
import { useAlerts, useInventoryLogs } from "@/lib/hooks/queries/useInventory";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import {
    ArrowLeft,
    Package,
    AlertTriangle,
    Eye,
    Users,
    Clock,
    Thermometer,
    Wind,
    Snowflake,
    ArrowDownRight,
    ArrowUpRight,
    Bell,
} from "lucide-react";
import { LocationNotificationPreferences } from "@/components/location-notification-preferences";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import SearchBar from "@/components/admin/shared/SearchBar";
import { Tables } from "@/lib/supabase/types";

type StorageSpace = Tables<"storage_spaces">;

const TABS = [
    { key: "stock",          label: "In-Store Stock",  icon: Package },
    { key: "employees",      label: "Employees",       icon: Users },
    { key: "audit",          label: "Audit Logs",      icon: Clock },
    { key: "notifications",  label: "Notifications",   icon: Bell },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SuperAdminStoreDetailPage() {
    const params = useParams();
    const locationId = params.id as string;
    const router = useRouter();

    const { data: location, isLoading } = useLocationWithDetails(locationId);
    const { data: employees } = useEmployeesByLocation(locationId);
    const { data: alerts } = useAlerts({ resolved: false, locationId });
    const { data: logs } = useInventoryLogs({ locationId, limit: 100 });

    const [activeTab, setActiveTab] = useState<TabKey>("stock");

    const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

    const filteredEmployees = useMemo(() => {
        if (!employees) return [];
        if (!employeeSearchQuery) return employees;
        const query = employeeSearchQuery.toLowerCase();
        return employees.filter((employee) => {
            const fullName =
                employee.first_name && employee.last_name
                    ? `${employee.first_name} ${employee.last_name}`.toLowerCase()
                    : (employee.first_name || "").toLowerCase();
            const email = (employee.email || "").toLowerCase();
            return fullName.includes(query) || email.includes(query);
        });
    }, [employees, employeeSearchQuery]);

    const activeAlertCount = alerts?.length ?? 0;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton className="h-12 w-64" />
                <LoadingSkeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!location) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-500">Store not found</p>
                <Link href="/super-admin/stores">
                    <Button className="mt-4">Back to Stores</Button>
                </Link>
            </div>
        );
    }

    const address =
        typeof location.address === "string"
            ? JSON.parse(location.address)
            : location.address;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb">
                <ol className="flex items-center text-sm text-zinc-600 space-x-2">
                    <li>
                        <Link
                            href="/super-admin/stores"
                            className="flex items-center hover:underline"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            All Stores
                        </Link>
                    </li>
                    <li>
                        <span className="mx-2 text-zinc-400">/</span>
                    </li>
                    <li className="truncate font-semibold text-zinc-900">
                        {location.name}
                    </li>
                </ol>
            </nav>

            {/* Store header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-semibold text-zinc-900">
                                {location.name}
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600">
                                <Eye className="w-3 h-3" />
                                Read-only
                            </span>
                        </div>
                        <p className="text-zinc-600">
                            {address.street}, {address.city}, {address.state}{" "}
                            {address.zip}
                        </p>
                    </div>

                    {activeAlertCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            {activeAlertCount} active{" "}
                            {activeAlertCount === 1 ? "alert" : "alerts"}
                        </div>
                    )}
                </div>

                {/* Quick stats */}
                <div className="flex gap-6 mt-4 pt-4 border-t border-zinc-100">
                    <div>
                        <p className="text-2xl font-semibold text-zinc-900">
                            {location.storage_spaces?.length ?? 0}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Storage Spaces
                        </p>
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-zinc-900">
                            {employees?.length ?? 0}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Employees
                        </p>
                    </div>
                    {activeAlertCount > 0 && (
                        <div>
                            <p className="text-2xl font-semibold text-red-600">
                                {activeAlertCount}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Active Alerts
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-6">
                {/* Tab strip */}
                <div className="flex gap-1 border-b border-gray-200 mb-6">
                    {TABS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${
                                activeTab === key
                                    ? "border-indigo-600 text-indigo-600"
                                    : "border-transparent text-gray-400 hover:text-gray-700"
                            }`}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── Stock tab ── */}
                {activeTab === "stock" && (
                    <div className="grid grid-cols-2 gap-4">
                        {!location.storage_spaces?.length ? (
                            <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                                <Package
                                    size={32}
                                    className="text-gray-200 mb-3"
                                />
                                <p className="text-sm font-medium text-gray-400">
                                    No storage spaces configured
                                </p>
                            </div>
                        ) : (
                            location.storage_spaces.map((space: any) => (
                                <div
                                    key={space.id}
                                    onClick={() =>
                                        router.push(
                                            `/super-admin/stores/${locationId}/storage-spaces/${space.id}`,
                                        )
                                    }
                                    className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
                                >
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                                            space.temperature_type === "frozen"
                                                ? "bg-blue-50"
                                                : space.temperature_type ===
                                                    "refrigerated"
                                                  ? "bg-sky-50"
                                                  : "bg-amber-50"
                                        }`}
                                    >
                                        {space.temperature_type ===
                                            "frozen" && (
                                            <Snowflake
                                                size={16}
                                                className="text-blue-600"
                                            />
                                        )}
                                        {space.temperature_type ===
                                            "refrigerated" && (
                                            <Thermometer
                                                size={16}
                                                className="text-sky-600"
                                            />
                                        )}
                                        {space.temperature_type === "dry" && (
                                            <Wind
                                                size={16}
                                                className="text-amber-600"
                                            />
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {space.name}
                                    </p>
                                    <span
                                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                                            space.temperature_type === "frozen"
                                                ? "bg-blue-50 text-blue-700"
                                                : space.temperature_type ===
                                                    "refrigerated"
                                                  ? "bg-sky-50 text-sky-700"
                                                  : "bg-amber-50 text-amber-700"
                                        }`}
                                    >
                                        {space.temperature_type === "frozen"
                                            ? "❄ Frozen"
                                            : space.temperature_type ===
                                                "refrigerated"
                                              ? "🌡 Refrigerated"
                                              : "☀ Dry"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ── Employees tab ── */}
                {activeTab === "employees" && (
                    <div className="flex flex-col gap-3">
                        <div className="mb-4">
                            <SearchBar
                                placeholder="Search employees by name or email…"
                                onSearch={setEmployeeSearchQuery}
                            />
                        </div>
                        {employees?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Users
                                    size={32}
                                    className="text-gray-200 mb-3"
                                />
                                <p className="text-sm font-medium text-gray-400">
                                    No employees assigned
                                </p>
                            </div>
                        ) : filteredEmployees.length > 0 ? (
                            filteredEmployees?.map((emp) => (
                                <div
                                    key={emp.id}
                                    className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-xl"
                                >
                                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                                        {emp.first_name?.[0] ??
                                            emp.email?.[0]?.toUpperCase() ??
                                            "?"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">
                                            {[emp.first_name, emp.last_name]
                                                .filter(Boolean)
                                                .join(" ") || "—"}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {emp.email}
                                        </p>
                                    </div>
                                    <span
                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                            emp.is_active
                                                ? "bg-green-50 text-green-700"
                                                : "bg-gray-100 text-gray-400"
                                        }`}
                                    >
                                        {emp.is_active ? "Active" : "Inactive"}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-zinc-500 text-center py-4">
                                No employees match your search
                            </p>
                        )}
                    </div>
                )}

                {/* ── Notifications tab ── */}
                {activeTab === "notifications" && (
                    <LocationNotificationPreferences locationId={locationId} />
                )}

                {/* ── Audit logs tab ── */}
                {activeTab === "audit" && (
                    <div className="flex flex-col gap-2">
                        {logs?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Clock
                                    size={32}
                                    className="text-gray-200 mb-3"
                                />
                                <p className="text-sm font-medium text-gray-400">
                                    No activity yet
                                </p>
                            </div>
                        ) : (
                            logs?.map((log) => {
                                const isPositive = log.quantity_change > 0;
                                return (
                                    <div
                                        key={log.id}
                                        className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-xl"
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                isPositive
                                                    ? "bg-green-50"
                                                    : "bg-red-50"
                                            }`}
                                        >
                                            {isPositive ? (
                                                <ArrowUpRight
                                                    size={14}
                                                    className="text-green-600"
                                                />
                                            ) : (
                                                <ArrowDownRight
                                                    size={14}
                                                    className="text-red-500"
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {log.items?.name ??
                                                    "Unknown item"}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {log.action_type} ·{" "}
                                                {new Date(
                                                    log.created_at,
                                                ).toLocaleString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                        <span
                                            className={`text-sm font-bold flex-shrink-0 ${
                                                isPositive
                                                    ? "text-green-600"
                                                    : "text-red-500"
                                            }`}
                                        >
                                            {isPositive ? "+" : ""}
                                            {log.quantity_change}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
