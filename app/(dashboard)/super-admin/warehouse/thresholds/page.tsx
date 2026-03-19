"use client";

// app/(dashboard)/super-admin/warehouse/thresholds/page.tsx

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { Warehouse } from "lucide-react";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import {
    useNotificationPreferences,
    useUpdateNotificationPreferences,
} from "@/lib/hooks/queries/useNotificationPreferences";
import LowStockThresholdManager from "@/components/admin/settings/LowStockThresholdManager";

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function SectionSkeleton() {
    return (
        <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-6 space-y-3">
            <div className="h-4 w-40 rounded bg-zinc-200" />
            <div className="h-3 w-72 rounded bg-zinc-100" />
            <div className="mt-4 h-10 w-full rounded-lg bg-zinc-100" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Alert email panel
// ---------------------------------------------------------------------------

function WarehouseAlertEmailPanel({ orgId }: { orgId: string }) {
    const { data: prefs, isLoading } = useNotificationPreferences(orgId);
    const updatePrefs = useUpdateNotificationPreferences();

    const currentEmail: string =
        (prefs?.secondary_emails as unknown as Record<string, string> | null)
            ?.warehouse_alert_email ?? "";

    const [email, setEmail] = useState("");
    const [editing, setEditing] = useState(false);

    function handleEdit() {
        setEmail(currentEmail);
        setEditing(true);
    }

    async function handleSave() {
        if (!email.trim()) return;
        const updated = {
            ...((prefs?.secondary_emails as unknown as Record<
                string,
                string
            >) ?? {}),
            warehouse_alert_email: email.trim(),
        };
        try {
            await updatePrefs.mutateAsync({
                organizationId: orgId,
                updates: { secondary_emails: updated as unknown as string[] },
            });
            toast.success("Warehouse alert email updated");
            setEditing(false);
        } catch {
            toast.error("Failed to save — please try again");
        }
    }

    if (isLoading) return <SectionSkeleton />;

    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="mb-1 flex items-center gap-2">
                <span className="text-base">🏭</span>
                <h2 className="text-sm font-semibold text-zinc-900">
                    Warehouse Alert Recipient
                </h2>
            </div>
            <p className="mb-5 text-xs text-zinc-500 leading-relaxed">
                Low-stock alerts triggered by warehouse inventory changes will
                be sent to this address. Typically this is the Super Admin's
                email. Store-level alert recipients are configured separately
                under{" "}
                <span className="font-medium text-zinc-700">
                    Admin Settings → Low Stock
                </span>
                .
            </p>

            {!editing ? (
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5">
                    <span className="text-sm text-zinc-600">
                        {currentEmail || (
                            <span className="italic text-zinc-400">
                                No warehouse email set — using org primary email
                            </span>
                        )}
                    </span>
                    <button
                        onClick={handleEdit}
                        className="ml-4 text-xs font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                        {currentEmail ? "Edit" : "Set email"}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="superadmin@yourcompany.com"
                        autoFocus
                        className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={updatePrefs.isPending || !email.trim()}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                        >
                            {updatePrefs.isPending ? "Saving…" : "Save"}
                        </button>
                        <button
                            onClick={() => setEditing(false)}
                            className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WarehouseThresholdsPage() {
    const { orgId } = useAuth();
    const { data: warehouse, isLoading, error } = useWarehouseLocation();

    if (!orgId) return null;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse space-y-2">
                    <div className="h-7 w-52 rounded-lg bg-zinc-200" />
                    <div className="h-4 w-96 rounded bg-zinc-100" />
                </div>
                <SectionSkeleton />
                <SectionSkeleton />
            </div>
        );
    }

    if (error || !warehouse) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="rounded-full bg-zinc-100 p-4">
                    <Warehouse className="h-8 w-8 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-700">
                    No warehouse location found
                </p>
                <p className="max-w-sm text-xs text-zinc-500">
                    The warehouse hasn't been set up yet. Complete Task 1.14
                    (seed warehouse data) and this page will become available.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900">
                    Warehouse Thresholds
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Configure low-stock alert thresholds for{" "}
                    <span className="font-medium text-zinc-700">
                        {warehouse.name}
                    </span>
                    . Warehouse thresholds should be significantly higher than
                    store thresholds — the warehouse must maintain enough stock
                    to cover the{" "}
                    <span className="font-medium text-zinc-700">
                        ~45-day overseas lead time
                    </span>{" "}
                    plus a safety buffer.
                </p>
            </div>

            {/* Context callout */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs leading-relaxed text-amber-800">
                    <span className="font-semibold">
                        Why higher thresholds?{" "}
                    </span>
                    A store might alert at 5 units of Nutella. The warehouse
                    should alert at 200+ units — enough runway to place and
                    receive an overseas order before running out. Set thresholds
                    based on average weekly consumption × (lead time + safety
                    buffer in weeks).
                </p>
            </div>

            {/* Alert recipient */}
            <WarehouseAlertEmailPanel orgId={orgId} />

            {/* Item thresholds */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6">
                <div className="mb-1 flex items-center gap-2">
                    <span className="text-base">📊</span>
                    <h2 className="text-sm font-semibold text-zinc-900">
                        Item Thresholds
                    </h2>
                </div>
                <p className="mb-6 text-xs text-zinc-500 leading-relaxed">
                    Set per-item or per-category minimums for the warehouse.
                    These override the organization-wide{" "}
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-700">
                        min_quantity
                    </code>{" "}
                    on each item when evaluating warehouse stock.
                </p>

                <LowStockThresholdManager
                    organizationId={orgId}
                    locationId={warehouse.id}
                    locationLabel="Warehouse"
                    context="warehouse"
                />
            </div>
        </div>
    );
}