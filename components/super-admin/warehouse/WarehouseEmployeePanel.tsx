"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
    Search,
    UserPlus,
    Mail,
    X,
    Warehouse,
    ChevronRight,
    ArrowLeft,
} from "lucide-react";
import {
    useEmployeesByLocation,
    useEmployees,
    useAssignEmployee,
    useUpdateEmployee,
} from "@/lib/hooks/queries/useEmployees";
import { useCreateInvitation } from "@/lib/hooks/queries/useUsers";
import { useWarehouses } from "@/lib/hooks/queries/useWarehouse";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { cn } from "@/lib/utils";

interface WarehouseEmployeePanelProps {
    organizationId: string;
}

type ActivePanel = null | "assign" | "invite";
type Step = "select-warehouse" | "select-employee" | "invite-form";

function InitialAvatar({ name }: { name: string }) {
    return (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
            {name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
    );
}

function WarehousePickerStep({
    warehouses,
    onSelect,
}: {
    warehouses: any[];
    onSelect: (warehouse: any) => void;
}) {
    const [search, setSearch] = useState("");
    const filtered = warehouses.filter((w) =>
        w.name.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="space-y-3">
            <p className="text-xs text-zinc-500 font-medium">
                Select a warehouse
            </p>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Search warehouses…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                    <p className="py-6 text-center text-xs text-zinc-400">
                        No warehouses found
                    </p>
                ) : (
                    filtered.map((w) => (
                        <button
                            key={w.id}
                            onClick={() => onSelect(w)}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-white px-4 py-3 text-left hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                                    <Warehouse className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-zinc-900">
                                        {w.name}
                                    </p>
                                    {w.address && (
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            {typeof w.address === "string"
                                                ? JSON.parse(w.address).city
                                                : w.address?.city}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-indigo-400 transition-colors" />
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}

function EmployeePickerStep({
    warehouseName,
    warehouseId,
    organizationId,
    onBack,
    onAssigned,
}: {
    warehouseName: string;
    warehouseId: string;
    organizationId: string;
    onBack: () => void;
    onAssigned: () => void;
}) {
    const { data: allEmployees = [] } = useEmployees();
    const { data: assignedHere = [] } = useEmployeesByLocation(warehouseId);
    const assignMutation = useAssignEmployee();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);

    const assignedHereIds = useMemo(
        () => new Set(assignedHere.map((e: any) => e.id)),
        [assignedHere],
    );

    const available = useMemo(() => {
        const q = debouncedSearch.toLowerCase();
        return allEmployees.filter((e: any) => {
            const nameMatch =
                `${e.first_name ?? ""} ${e.last_name ?? ""}`
                    .toLowerCase()
                    .includes(q) || e.email?.toLowerCase().includes(q);
            return !assignedHereIds.has(e.id) && (!q || nameMatch);
        });
    }, [allEmployees, assignedHereIds, debouncedSearch]);

    async function handleAssign(emp: any) {
        try {
            await assignMutation.mutateAsync({
                employeeId: emp.id,
                locationId: warehouseId,
            });
            const name =
                `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() ||
                emp.email;
            toast.success(`${name} assigned to ${warehouseName}`);
            onAssigned();
        } catch {
            toast.error("Failed to assign employee");
        }
    }

    return (
        <div className="space-y-3">
            <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
                <ArrowLeft className="h-3 w-3" />
                Back
            </button>

            <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                <Warehouse className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                <p className="text-xs font-medium text-indigo-700">
                    {warehouseName}
                </p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-3 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
                {available.length === 0 ? (
                    <p className="py-6 text-center text-xs text-zinc-400">
                        No available employees found
                    </p>
                ) : (
                    available.map((emp: any) => {
                        const name =
                            `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() ||
                            emp.email;
                        return (
                            <button
                                key={emp.id}
                                onClick={() => handleAssign(emp)}
                                disabled={assignMutation.isPending}
                                className="flex w-full items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2.5 text-left hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50 transition-all"
                            >
                                <InitialAvatar name={name} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-zinc-900">
                                        {name}
                                    </p>
                                    <p className="truncate text-xs text-zinc-400">
                                        {emp.email}
                                    </p>
                                </div>
                                {emp.assigned_location_id && (
                                    <span className="text-xs text-amber-500 whitespace-nowrap">
                                        reassigning
                                    </span>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function InviteFormStep({
    warehouseName,
    warehouseId,
    organizationId,
    onBack,
    onInvited,
}: {
    warehouseName: string;
    warehouseId: string;
    organizationId: string;
    onBack: () => void;
    onInvited: () => void;
}) {
    const inviteMutation = useCreateInvitation();
    const [email, setEmail] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        try {
            const result = await inviteMutation.mutateAsync({
                email: email.trim(),
                role: "employee",
                assigned_location_id: warehouseId,
                organizationId,
            });

            if (result.success) {
                toast.success(`Invitation sent to ${email.trim()}`);
                onInvited();
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("Failed to send invitation");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
                <ArrowLeft className="h-3 w-3" />
                Back
            </button>

            <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                <Warehouse className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                <p className="text-xs font-medium text-indigo-700">
                    {warehouseName}
                </p>
            </div>

            {/* <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                        First name
                    </label>
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                </div>
                <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                        Last name
                    </label>
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                </div>
            </div> */}

            <div>
                <label className="block text-xs text-zinc-500 mb-1">
                    Email <span className="text-red-400">*</span>
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="employee@email.com"
                    required
                    autoFocus
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
            </div>

            <button
                type="submit"
                disabled={inviteMutation.isPending || !email.trim()}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
                {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
            </button>
        </form>
    );
}

export default function WarehouseEmployeePanel({
    organizationId,
}: WarehouseEmployeePanelProps) {
    const { data: warehouses = [], isLoading: warehousesLoading } =
        useWarehouses();
    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
    const [step, setStep] = useState<Step>("select-warehouse");

    // All assigned employees across all warehouses
    const updateMutation = useUpdateEmployee();

    function openPanel(panel: ActivePanel) {
        setActivePanel(panel);
        setSelectedWarehouse(null);
        setStep("select-warehouse");
    }

    function closePanel() {
        setActivePanel(null);
        setSelectedWarehouse(null);
        setStep("select-warehouse");
    }

    function handleWarehouseSelect(warehouse: any) {
        setSelectedWarehouse(warehouse);
        setStep(activePanel === "assign" ? "select-employee" : "invite-form");
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
                        Manage employees across all warehouses
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() =>
                            activePanel === "assign"
                                ? closePanel()
                                : openPanel("assign")
                        }
                        className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            activePanel === "assign"
                                ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                        )}
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign
                    </button>
                    <button
                        onClick={() =>
                            activePanel === "invite"
                                ? closePanel()
                                : openPanel("invite")
                        }
                        className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                            activePanel === "invite"
                                ? "bg-indigo-700 text-white"
                                : "bg-indigo-600 text-white hover:bg-indigo-500",
                        )}
                    >
                        <Mail className="h-3.5 w-3.5" />
                        Invite new
                    </button>
                </div>
            </div>

            {/* Active panel */}
            {activePanel && (
                <div className="border-b border-zinc-200 bg-zinc-50 p-4">
                    {step === "select-warehouse" && (
                        <WarehousePickerStep
                            warehouses={warehouses}
                            onSelect={handleWarehouseSelect}
                        />
                    )}
                    {step === "select-employee" && selectedWarehouse && (
                        <EmployeePickerStep
                            warehouseName={selectedWarehouse.name}
                            warehouseId={selectedWarehouse.id}
                            organizationId={organizationId}
                            onBack={() => setStep("select-warehouse")}
                            onAssigned={closePanel}
                        />
                    )}
                    {step === "invite-form" && selectedWarehouse && (
                        <InviteFormStep
                            warehouseName={selectedWarehouse.name}
                            warehouseId={selectedWarehouse.id}
                            organizationId={organizationId}
                            onBack={() => setStep("select-warehouse")}
                            onInvited={closePanel}
                        />
                    )}
                </div>
            )}

            {/* Per-warehouse staff list */}
            {warehousesLoading ? (
                <div className="animate-pulse p-5 space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="space-y-2">
                            <div className="h-3 w-28 rounded bg-zinc-200" />
                            {[1, 2].map((j) => (
                                <div
                                    key={j}
                                    className="flex items-center gap-3"
                                >
                                    <div className="h-9 w-9 rounded-full bg-zinc-200" />
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-3 w-28 rounded bg-zinc-200" />
                                        <div className="h-2.5 w-44 rounded bg-zinc-100" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="divide-y divide-zinc-100">
                    {warehouses.map((warehouse) => (
                        <WarehouseStaffSection
                            key={warehouse.id}
                            warehouse={warehouse}
                            onUnassign={async (empId, name) => {
                                if (
                                    !confirm(
                                        `Remove ${name} from ${warehouse.name}?`,
                                    )
                                )
                                    return;
                                try {
                                    await updateMutation.mutateAsync({
                                        id: empId,
                                        updates: { assigned_location_id: null },
                                    });
                                    toast.success(
                                        `${name} removed from ${warehouse.name}`,
                                    );
                                } catch {
                                    toast.error("Failed to remove employee");
                                }
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-3">
                <p className="text-xs text-zinc-400">
                    Warehouse employees use the standard{" "}
                    <code className="rounded bg-zinc-200 px-1 font-mono text-zinc-600">
                        /employee
                    </code>{" "}
                    dashboard to count and update inventory.
                </p>
            </div>
        </div>
    );
}

function WarehouseStaffSection({
    warehouse,
    onUnassign,
}: {
    warehouse: any;
    onUnassign: (empId: string, name: string) => void;
}) {
    const { data: employees = [], isLoading } = useEmployeesByLocation(
        warehouse.id,
    );

    return (
        <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50">
                    <Warehouse className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <p className="text-xs font-semibold text-zinc-700">
                    {warehouse.name}
                </p>
                <span className="text-xs text-zinc-400">
                    · {isLoading ? "…" : employees.length}{" "}
                    {employees.length === 1 ? "employee" : "employees"}
                </span>
            </div>

            {isLoading ? (
                <div className="space-y-2 pl-8">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 animate-pulse"
                        >
                            <div className="h-8 w-8 rounded-full bg-zinc-100" />
                            <div className="h-3 w-32 rounded bg-zinc-100" />
                        </div>
                    ))}
                </div>
            ) : employees.length === 0 ? (
                <p className="pl-8 text-xs text-zinc-400">No staff assigned</p>
            ) : (
                <div className="space-y-1 pl-8">
                    {employees.map((emp: any) => {
                        const name =
                            `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() ||
                            emp.email;
                        return (
                            <div
                                key={emp.id}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-50 transition-colors group"
                            >
                                <InitialAvatar name={name} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-zinc-900">
                                        {name}
                                    </p>
                                    <p className="truncate text-xs text-zinc-400">
                                        {emp.email}
                                    </p>
                                </div>
                                <button
                                    onClick={() => onUnassign(emp.id, name)}
                                    title="Remove from warehouse"
                                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 rounded-lg p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500 transition-all"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
