"use client";

// components/super-admin/warehouse/WarehouseEmployeePanel.tsx
//
// Task 2.7 — Warehouse employee management.
//
// Mirrors the employee right-panel from /admin/locations/[storageId] exactly,
// adapted for the warehouse context:
//   - Shows all employees currently assigned to the warehouse location
//   - Lets super admin search unassigned employees and assign them
//   - Lets super admin remove (unassign) an employee from the warehouse
//   - Invite link for new warehouse staff
//
// Data layer reused — nothing new:
//   useEmployeesByLocation(warehouseLocationId)  → assigned staff
//   useEmployees()                               → all org employees (for assign picker)
//   useAssignEmployee()                          → assign mutation
//   useUpdateEmployee()                          → unassign (set location to null)
//   useCreateInvitation()                        → invite new warehouse staff

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { Search, UserPlus, X, Warehouse } from "lucide-react";

import { useEmployeesByLocation } from "@/lib/hooks/queries/useEmployees";
import { useEmployees } from "@/lib/hooks/queries/useEmployees";
import { useAssignEmployee, useUpdateEmployee } from "@/lib/hooks/queries/useEmployees";
import { useCreateInvitation } from "@/lib/hooks/queries/useUsers";
import { useDebounce } from "@/lib/hooks/useDebounce";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WarehouseEmployeePanelProps {
    warehouseLocationId: string;
    warehouseLocationName: string;
    organizationId: string;
}

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function InitialAvatar({ name }: { name: string }) {
    const initial = name?.charAt(0)?.toUpperCase() ?? "?";
    return (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            {initial}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Warehouse className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">{message}</p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function WarehouseEmployeePanel({
    warehouseLocationId,
    warehouseLocationName,
    organizationId,
}: WarehouseEmployeePanelProps) {

    // ── Data ────────────────────────────────────────────────────────────────
    const { data: assignedEmployees = [], isLoading: assignedLoading } =
        useEmployeesByLocation(warehouseLocationId);

    const { data: allEmployees = [], isLoading: allLoading } = useEmployees();

    const assignMutation = useAssignEmployee();
    const updateMutation = useUpdateEmployee();   // used to unassign (null location)
    const inviteMutation = useCreateInvitation();

    // ── Search state ────────────────────────────────────────────────────────
    const [assignedSearch, setAssignedSearch] = useState("");
    const [pickerSearch, setPickerSearch] = useState("");
    const [showPicker, setShowPicker] = useState(false);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);

    const debouncedPickerSearch = useDebounce(pickerSearch, 300);

    // ── Derived lists ────────────────────────────────────────────────────────
    const assignedIds = useMemo(
        () => new Set(assignedEmployees.map((e: any) => e.id)),
        [assignedEmployees]
    );

    // Employees that are NOT already assigned to this warehouse
    const unassignedEmployees = useMemo(
        () => allEmployees.filter((e: any) => !assignedIds.has(e.id)),
        [allEmployees, assignedIds]
    );

    // Filter assigned employees by search
    const filteredAssigned = useMemo(() => {
        const q = assignedSearch.toLowerCase();
        if (!q) return assignedEmployees;
        return assignedEmployees.filter(
            (e: any) =>
                `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
                e.email?.toLowerCase().includes(q)
        );
    }, [assignedEmployees, assignedSearch]);

    // Filter picker list by debounced search
    const filteredUnassigned = useMemo(() => {
        const q = debouncedPickerSearch.toLowerCase();
        if (!q) return unassignedEmployees;
        return unassignedEmployees.filter(
            (e: any) =>
                `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
                e.email?.toLowerCase().includes(q)
        );
    }, [unassignedEmployees, debouncedPickerSearch]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    async function handleAssign(employeeId: string) {
        try {
            await assignMutation.mutateAsync({
                employeeId,
                locationId: warehouseLocationId,
            });
            toast.success("Employee assigned to warehouse");
            setShowPicker(false);
            setPickerSearch("");
        } catch {
            toast.error("Failed to assign employee");
        }
    }

    async function handleUnassign(employeeId: string, name: string) {
        if (
            !confirm(
                `Remove ${name} from ${warehouseLocationName}? They will no longer have access to warehouse inventory.`
            )
        )
            return;

        try {
            await updateMutation.mutateAsync({
                id: employeeId,
                updates: { assigned_location_id: null },
            });
            toast.success(`${name} removed from warehouse`);
        } catch {
            toast.error("Failed to remove employee");
        }
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setInviting(true);
        try {
            await inviteMutation.mutateAsync({
                email: inviteEmail.trim(),
                role: "employee",
                locationId: warehouseLocationId,
                organizationId,
            });
            toast.success(`Invitation sent to ${inviteEmail.trim()}`);
            setInviteEmail("");
            setShowInviteForm(false);
        } catch {
            toast.error("Failed to send invitation");
        } finally {
            setInviting(false);
        }
    }

    // ── Loading ───────────────────────────────────────────────────────────────
    if (assignedLoading || allLoading) {
        return (
            <div className="animate-pulse space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="h-4 w-32 rounded bg-zinc-700" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-zinc-700" />
                        <div className="space-y-1.5">
                            <div className="h-3 w-28 rounded bg-zinc-700" />
                            <div className="h-2.5 w-36 rounded bg-zinc-800" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                <div>
                    <h2 className="text-sm font-semibold text-white">
                        Warehouse Staff
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                        {assignedEmployees.length}{" "}
                        {assignedEmployees.length === 1
                            ? "employee"
                            : "employees"}{" "}
                        assigned
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setShowPicker((v) => !v);
                            setShowInviteForm(false);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign
                    </button>
                    <button
                        onClick={() => {
                            setShowInviteForm((v) => !v);
                            setShowPicker(false);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                    >
                        Invite new
                    </button>
                </div>
            </div>

            {/* ── Assign picker (existing employees not yet on warehouse) ── */}
            {showPicker && (
                <div className="border-b border-zinc-800 p-4">
                    <p className="mb-2 text-xs font-medium text-zinc-400">
                        Assign an existing employee to this warehouse
                    </p>
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search by name or email…"
                            value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)}
                            autoFocus
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredUnassigned.length === 0 ? (
                            <p className="py-4 text-center text-xs text-zinc-500">
                                {unassignedEmployees.length === 0
                                    ? "All employees are already assigned to this warehouse"
                                    : "No employees match your search"}
                            </p>
                        ) : (
                            filteredUnassigned.map((emp: any) => {
                                const name = `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || emp.email;
                                return (
                                    <button
                                        key={emp.id}
                                        onClick={() => handleAssign(emp.id)}
                                        disabled={assignMutation.isPending}
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        <InitialAvatar name={name} />
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-white">
                                                {name}
                                            </p>
                                            <p className="truncate text-xs text-zinc-500">
                                                {emp.email}
                                                {emp.assigned_location_id && (
                                                    <span className="ml-1 text-amber-400">
                                                        · currently at another location
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── Invite new employee form ────────────────────────────────── */}
            {showInviteForm && (
                <form
                    onSubmit={handleInvite}
                    className="border-b border-zinc-800 p-4 space-y-3"
                >
                    <p className="text-xs font-medium text-zinc-400">
                        Invite a new employee — they'll be assigned to this
                        warehouse on signup
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            placeholder="employee@email.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                            autoFocus
                            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={inviting || !inviteEmail.trim()}
                            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                            {inviting ? "Sending…" : "Send"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowInviteForm(false)}
                            className="rounded-lg border border-zinc-700 px-2 py-2 text-zinc-400 hover:bg-zinc-800"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </form>
            )}

            {/* ── Search assigned staff ───────────────────────────────────── */}
            {assignedEmployees.length > 3 && (
                <div className="border-b border-zinc-800 px-4 py-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search warehouse staff…"
                            value={assignedSearch}
                            onChange={(e) => setAssignedSearch(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>
                </div>
            )}

            {/* ── Assigned employee list ──────────────────────────────────── */}
            <div className="divide-y divide-zinc-800/60">
                {filteredAssigned.length === 0 ? (
                    <EmptyState
                        message={
                            assignedEmployees.length === 0
                                ? "No staff assigned to this warehouse yet. Use Assign or Invite to add warehouse employees."
                                : "No employees match your search"
                        }
                    />
                ) : (
                    filteredAssigned.map((emp: any) => {
                        const name =
                            `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() ||
                            emp.email;
                        return (
                            <div
                                key={emp.id}
                                className="flex items-center gap-3 px-5 py-3"
                            >
                                <InitialAvatar name={name} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-white">
                                        {name}
                                    </p>
                                    <p className="truncate text-xs text-zinc-500">
                                        {emp.email}
                                    </p>
                                </div>
                                {/* Remove button */}
                                <button
                                    onClick={() =>
                                        handleUnassign(emp.id, name)
                                    }
                                    disabled={updateMutation.isPending}
                                    title="Remove from warehouse"
                                    className="flex-shrink-0 rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-40"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Footer note ─────────────────────────────────────────────── */}
            <div className="border-t border-zinc-800 px-5 py-3">
                <p className="text-xs text-zinc-600">
                    Warehouse employees use the standard{" "}
                    <span className="text-zinc-400">/employee</span> dashboard
                    to count and update inventory — no separate app needed.
                </p>
            </div>
        </div>
    );
}