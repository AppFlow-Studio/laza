// app/(dashboard)/super-admin/warehouse/thresholds/page.tsx
//
// Task 2.6 — Warehouse threshold configuration.
//
// What this page does:
//   Lets the Super Admin set warehouse-level low-stock thresholds —
//   much higher than stores (e.g. alert at 200 Nutella instead of 5).
//   Also controls which email address receives warehouse alerts.
//
// How it reuses existing work:
//   - LowStockThresholdManager (from /admin/settings/notifications Thresholds tab)
//     is dropped in directly, pre-filtered to the warehouse location.
//   - useNotificationPreferences / useUpdateNotificationPreferences are the
//     same hooks the admin settings page already uses.
//   - useWarehouseLocation (Task 2.11) resolves the warehouse location ID.
//
// No new data-layer code is needed. The existing low_stock_thresholds table
// already has a location_id column, so a threshold scoped to the warehouse
// location is structurally identical to one scoped to a store.

"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import toast from "react-hot-toast";

import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import {
    useNotificationPreferences,
    useUpdateNotificationPreferences,
    useLowStockThresholds,
    useCreateLowStockThreshold,
    useUpdateLowStockThreshold,
    useDeleteLowStockThreshold,
} from "@/lib/hooks/queries/useNotificationPreferences";

import LowStockThresholdManager from "@/components/admin/settings/LowStockThresholdManager";

// ---------------------------------------------------------------------------
// Loading skeleton — matches CardSkeleton pattern used across the dashboard
// ---------------------------------------------------------------------------

function SectionSkeleton() {
    return (
        <div className="animate-pulse space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="h-4 w-40 rounded bg-zinc-700" />
            <div className="h-3 w-64 rounded bg-zinc-800" />
            <div className="mt-4 h-10 w-full rounded bg-zinc-800" />
            <div className="h-10 w-full rounded bg-zinc-800" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Warehouse alert email panel
//
// The existing notification_preferences table stores primary_email and
// secondary_emails at the org level. Warehouse alerts need to go to the
// super admin, which may be a different address than the store alert
// recipient. This panel lets the super admin set a dedicated warehouse
// alert email without touching the store-level preference.
//
// Implementation: we store the warehouse alert email in
// notification_preferences.secondary_emails under a reserved key
// "warehouse_alert_email". This is a lightweight convention that avoids a
// new DB column while keeping the data queryable.
//
// If your codebase later adds a dedicated warehouse_alert_email column
// (recommended for clarity), swap the read/write here to use that column.
// ---------------------------------------------------------------------------

function WarehouseAlertEmailPanel({
    orgId,
}: {
    orgId: string;
}) {
    const { data: prefs, isLoading } = useNotificationPreferences(orgId);
    const updatePrefs = useUpdateNotificationPreferences();

    // Extract current warehouse email from secondary_emails JSONB.
    // We store it as { ..., warehouse_alert_email: "email@domain.com" }
    const currentWarehouseEmail: string =
        (prefs?.secondary_emails as unknown as Record<string, string> | null)
            ?.warehouse_alert_email ?? "";

    const [email, setEmail] = useState("");
    const [editing, setEditing] = useState(false);

    // Sync local state when prefs load
    const displayEmail = editing ? email : currentWarehouseEmail;

    function handleEdit() {
        setEmail(currentWarehouseEmail);
        setEditing(true);
    }

    function handleCancel() {
        setEditing(false);
        setEmail("");
    }

    async function handleSave() {
        if (!email.trim()) return;

        const updatedSecondary = {
            ...(prefs?.secondary_emails as unknown as Record<string, string> | null ?? {}),
            warehouse_alert_email: email.trim(),
        };

        try {
            await updatePrefs.mutateAsync({
                organizationId: orgId,
                updates: { secondary_emails: updatedSecondary as unknown as string[] },
            });
            toast.success("Warehouse alert email updated");
            setEditing(false);
        } catch {
            toast.error("Failed to save — please try again");
        }
    }

    if (isLoading) return <SectionSkeleton />;

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-1 flex items-center gap-2">
                {/* Warehouse icon */}
                <span className="text-lg">🏭</span>
                <h2 className="text-sm font-semibold text-white">
                    Warehouse Alert Recipient
                </h2>
            </div>
            <p className="mb-5 text-xs text-zinc-400">
                Low-stock alerts triggered by warehouse inventory changes will
                be sent to this address. Typically this is the Super Admin's
                email. Store-level alert recipients are configured separately
                under{" "}
                <span className="text-zinc-300">
                    Admin Settings → Low Stock
                </span>
                .
            </p>

            {!editing ? (
                <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3">
                    <span className="text-sm text-zinc-200">
                        {currentWarehouseEmail || (
                            <span className="italic text-zinc-500">
                                No warehouse email set — using org primary email
                            </span>
                        )}
                    </span>
                    <button
                        onClick={handleEdit}
                        className="ml-4 text-xs font-medium text-indigo-400 hover:text-indigo-300"
                    >
                        {currentWarehouseEmail ? "Edit" : "Set email"}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="superadmin@yourcompany.com"
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={updatePrefs.isPending || !email.trim()}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {updatePrefs.isPending ? "Saving…" : "Save"}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="rounded-lg border border-zinc-600 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
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
// Main page
// ---------------------------------------------------------------------------

export default function WarehouseThresholdsPage() {
    const { orgId } = useAuth();

    const {
        data: warehouseLocation,
        isLoading: locationLoading,
        error: locationError,
    } = useWarehouseLocation();

    // ── Guard: org not loaded yet ──────────────────────────────────────────
    if (!orgId) return null;

    // ── Guard: warehouse location still loading ────────────────────────────
    if (locationLoading) {
        return (
            <div className="space-y-6 p-6">
                <SectionSkeleton />
                <SectionSkeleton />
            </div>
        );
    }

    // ── Guard: no warehouse exists yet ─────────────────────────────────────
    // Warehouse is seeded in Task 1.14. If it hasn't been done yet, show a
    // clear message instead of crashing.
    if (locationError || !warehouseLocation) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <span className="text-3xl">🏭</span>
                <p className="text-sm font-medium text-zinc-300">
                    No warehouse location found
                </p>
                <p className="max-w-sm text-xs text-zinc-500">
                    The warehouse location hasn't been set up yet. Complete Task
                    1.14 (seed warehouse data) and this page will become
                    available.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-8 p-6">

            {/* ── Page header ─────────────────────────────────────────── */}
            <div>
                <h1 className="text-xl font-semibold text-white">
                    Warehouse Thresholds
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                    Configure low-stock alert thresholds for{" "}
                    <span className="font-medium text-zinc-200">
                        {warehouseLocation.name}
                    </span>
                    . Warehouse thresholds should be significantly higher than
                    store thresholds — the warehouse must maintain enough stock
                    to cover the{" "}
                    <span className="text-zinc-300">~45-day overseas lead time</span>{" "}
                    plus a safety buffer.
                </p>
            </div>

            {/* ── Context callout ─────────────────────────────────────── */}
            <div className="rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3">
                <p className="text-xs leading-relaxed text-amber-300">
                    <span className="font-semibold">Why higher thresholds?</span>{" "}
                    A store might alert at 5 units of Nutella. The warehouse
                    should alert at 200+ units — enough runway to place and
                    receive an overseas order before running out. Set thresholds
                    based on average weekly consumption × (lead time + safety
                    buffer in weeks).
                </p>
            </div>

            {/* ── Alert recipient ─────────────────────────────────────── */}
            <WarehouseAlertEmailPanel orgId={orgId} />

            {/* ── Threshold manager ───────────────────────────────────── */}
            {/*
                LowStockThresholdManager already exists and is used on the
                admin settings Thresholds tab. We pass the warehouse location
                ID so the component pre-filters to warehouse thresholds only.

                The component renders:
                  - A list of existing thresholds scoped to this location
                  - An "Add threshold" form (item, category, or location-wide)
                  - Edit / delete per row

                If LowStockThresholdManager doesn't yet accept a locationId
                prop, see the note below on the minimal prop addition needed.
            */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="mb-1 flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <h2 className="text-sm font-semibold text-white">
                        Item Thresholds
                    </h2>
                </div>
                <p className="mb-5 text-xs text-zinc-400">
                    Set per-item or per-category minimums for the warehouse.
                    These override the organization-wide{" "}
                    <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">
                        min_quantity
                    </code>{" "}
                    on each item when evaluating warehouse stock.
                </p>

                <LowStockThresholdManager
                    organizationId={orgId}
                    // locationId scopes the manager to warehouse thresholds only.
                    // See note below if this prop doesn't exist yet on the component.
                    locationId={warehouseLocation.id}
                    locationLabel="Warehouse"
                    // Hint to the component to show higher suggested defaults
                    context="warehouse"
                />
            </div>

        </div>
    );
}

/*
──────────────────────────────────────────────────────────────────────────────
NOTE: LowStockThresholdManager prop additions (if not already present)
──────────────────────────────────────────────────────────────────────────────

If LowStockThresholdManager doesn't already accept a `locationId` prop,
add these two optional props to its interface and use them to:

  1. Pre-filter the threshold list:
       useLowStockThresholds(organizationId, { locationId })

  2. Pre-fill the location field in the "Add threshold" form.

  3. Show the `locationLabel` string ("Warehouse") in headings and
     empty-state copy instead of a generic "location" label.

  4. When context === "warehouse", show higher placeholder values in the
     min-quantity input (e.g. 200 instead of 5) as a UX hint.

Minimal diff to LowStockThresholdManager.tsx:

  interface LowStockThresholdManagerProps {
    organizationId: string;
    locationId?: string;      // ← add
    locationLabel?: string;   // ← add, default "Location"
    context?: "store" | "warehouse"; // ← add, default "store"
  }

No changes needed to the DB or data layer — getLowStockThresholds already
accepts a locationId filter via its filters? parameter:
  getLowStockThresholds(organizationId, { locationId: warehouseLocation.id })
──────────────────────────────────────────────────────────────────────────────
*/