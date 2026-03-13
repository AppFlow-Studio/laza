"use client";

// components/super-admin/warehouse/WarehouseEmployeePanel.tsx

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { Search, UserPlus, Mail, X, Warehouse } from "lucide-react";
import {
    useEmployeesByLocation,
    useEmployees,
    useAssignEmployee,
    useUpdateEmployee,
} from "@/lib/hooks/queries/useEmployees";
import { useCreateInvitation } from "@/lib/hooks/queries/useUsers";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils";

interface WarehouseEmployeePanelProps {
    warehouseLocationId: string;
    warehouseLocationName: string;
    organizationId: string;
}

function InitialAvatar({ name }: { name: string }) {
    return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
    );
}

export default function WarehouseEmployeePanel({
    warehouseLocationId,
    warehouseLocationName,
    organizationId,
}: WarehouseEmployeePanelProps) {
    const { data: assignedEmployees = [], isLoading: assignedLoading } =
        useEmployeesByLocation(warehouseLocationId);
    const { data: allEmployees = [], isLoading: allLoading } = useEmployees();
    const assignMutation = useAssignEmployee();
    const updateMutation = useUpdateEmployee();
    const inviteMutation = useCreateInvitation();

    const [assignedSearch, setAssignedSearch] = useState("");
    const [pickerSearch, setPickerSearch] = useState("");
    const [showPicker, setShowPicker] = useState(false);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const debouncedPickerSearch = useDebounce(pickerSearch, 300);

    const assignedIds = useMemo(
        () => new Set(assignedEmployees.map((e: any) => e.id)),
        [assignedEmployees],
    );

    const unassignedEmployees = useMemo(
        () => allEmployees.filter((e: any) => !assignedIds.has(e.id)),
        [allEmployees, assignedIds],
    );

    const filteredAssigned = useMemo(() => {
        const q = assignedSearch.toLowerCase();
        if (!q) return assignedEmployees;
        return assignedEmployees.filter(
            (e: any) =>
                `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
                e.email?.toLowerCase().includes(q),
        );
    }, [assignedEmployees, assignedSearch]);

    const filteredUnassigned = useMemo(() => {
        const q = debouncedPickerSearch.toLowerCase();
        if (!q) return unassignedEmployees;
        return unassignedEmployees.filter(
            (e: any) =>
                `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
                e.email?.toLowerCase().includes(q),
        );
    }, [unassignedEmployees, debouncedPickerSearch]);

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
        if (!confirm(`Remove ${name} from ${warehouseLocationName}?`)) return;
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

    if (assignedLoading || allLoading) {
        return (
            <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="h-4 w-32 rounded bg-zinc-200" />
                    <div className="h-8 w-24 rounded-lg bg-zinc-100" />
                </div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-zinc-200" />
                        <div className="space-y-1.5 flex-1">
                            <div className="h-3 w-28 rounded bg-zinc-200" />
                            <div className="h-2.5 w-44 rounded bg-zinc-100" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <div>
                    <h2 className="text-sm font-semibold text-zinc-900">
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
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setShowPicker((v) => !v);
                            setShowInviteForm(false);
                        }}
                        className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            showPicker
                                ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                        )}
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign
                    </button>
                    <button
                        onClick={() => {
                            setShowInviteForm((v) => !v);
                            setShowPicker(false);
                        }}
                        className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                            showInviteForm
                                ? "bg-indigo-700 text-white"
                                : "bg-indigo-600 text-white hover:bg-indigo-500",
                        )}
                    >
                        <Mail className="h-3.5 w-3.5" />
                        Invite new
                    </button>
                </div>
            </div>

            {/* Assign picker */}
            {showPicker && (
                <div className="border-b border-zinc-200 bg-zinc-50 p-4 space-y-3">
                    <p className="text-xs font-medium text-zinc-500">
                        Assign an existing employee to this warehouse
                    </p>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email…"
                            value={pickerSearch}
                            onChange={(e) => setPickerSearch(e.target.value)}
                            autoFocus
                            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto -mx-1">
                        {filteredUnassigned.length === 0 ? (
                            <p className="py-6 text-center text-xs text-zinc-400">
                                {unassignedEmployees.length === 0
                                    ? "All employees are already assigned here"
                                    : "No employees match your search"}
                            </p>
                        ) : (
                            filteredUnassigned.map((emp: any) => {
                                const name =
                                    `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() ||
                                    emp.email;
                                return (
                                    <button
                                        key={emp.id}
                                        onClick={() => handleAssign(emp.id)}
                                        disabled={assignMutation.isPending}
                                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white disabled:opacity-50 transition-colors"
                                    >
                                        <InitialAvatar name={name} />
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-zinc-900">
                                                {name}
                                            </p>
                                            <p className="truncate text-xs text-zinc-500">
                                                {emp.email}
                                                {emp.assigned_location_id && (
                                                    <span className="ml-1 text-amber-500">
                                                        · at another location
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

            {/* Invite form */}
            {showInviteForm && (
                <form
                    onSubmit={handleInvite}
                    className="border-b border-zinc-200 bg-zinc-50 p-4 space-y-3"
                >
                    <p className="text-xs font-medium text-zinc-500">
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
                            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <button
                            type="submit"
                            disabled={inviting || !inviteEmail.trim()}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                            {inviting ? "Sending…" : "Send invite"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowInviteForm(false)}
                            className="rounded-lg border border-zinc-200 bg-white px-2 py-2 text-zinc-400 hover:bg-zinc-50 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </form>
            )}

            {/* Search assigned staff (only when list is long) */}
            {assignedEmployees.length > 4 && (
                <div className="border-b border-zinc-200 px-4 py-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search warehouse staff…"
                            value={assignedSearch}
                            onChange={(e) => setAssignedSearch(e.target.value)}
                            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Employee list */}
            <div className="divide-y divide-zinc-100">
                {filteredAssigned.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-14 text-center">
                        <div className="rounded-full bg-zinc-100 p-3">
                            <Warehouse className="h-6 w-6 text-zinc-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-600">
                                {assignedEmployees.length === 0
                                    ? "No staff assigned yet"
                                    : "No employees match your search"}
                            </p>
                            {assignedEmployees.length === 0 && (
                                <p className="mt-1 text-xs text-zinc-400">
                                    Use Assign or Invite new to add warehouse
                                    employees
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    filteredAssigned.map((emp: any) => {
                        const name =
                            `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() ||
                            emp.email;
                        return (
                            <div
                                key={emp.id}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 transition-colors"
                            >
                                <InitialAvatar name={name} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-zinc-900">
                                        {name}
                                    </p>
                                    <p className="truncate text-xs text-zinc-500">
                                        {emp.email}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleUnassign(emp.id, name)}
                                    disabled={updateMutation.isPending}
                                    title="Remove from warehouse"
                                    className="flex-shrink-0 rounded-lg p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-3">
                <p className="text-xs text-zinc-400">
                    Warehouse employees use the standard{" "}
                    <code className="rounded bg-zinc-200 px-1 font-mono text-zinc-600">
                        /employee
                    </code>{" "}
                    dashboard to count and update inventory — no separate app
                    needed.
                </p>
            </div>
        </div>
    );
}