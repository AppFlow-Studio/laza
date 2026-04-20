"use client";

// components/super-admin/warehouse/WarehouseExpensesPanel.tsx
// Extracted from app/(dashboard)/super-admin/warehouse/expenses/page.tsx

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
    Plus,
    Settings2,
    Truck,
    Container,
    Warehouse,
    PackageOpen,
    MoreHorizontal,
    CheckCircle2,
    X,
    Pencil,
    Check,
    Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";

import {
    getWarehouseExpenses,
    createWarehouseExpense,
    getExpenseSummary,
    getExpenseRates,
    updateExpenseRate,
    type ExpenseType,
    type WarehouseExpenseFilters,
} from "@/lib/supabase/queries/warehouseExpenses";
import { updateWarehouseExpenseTitleAction } from "@/lib/supabase/actions/warehouseExpenseActions";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { RentHistoryTable } from "@/components/super-admin/warehouse/RentHistoryTable";
import { getFriendlyErrorMessage } from "@/lib/utils/errorMessages";

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_TYPES: {
    value: ExpenseType;
    label: string;
    icon: React.ReactNode;
}[] = [
    {
        value: "pallet_delivery",
        label: "Pallet Delivery",
        icon: <Truck className="w-4 h-4" />,
    },
    {
        value: "container_unload",
        label: "Container Unload",
        icon: <Container className="w-4 h-4" />,
    },
    {
        value: "delivery",
        label: "Delivery to Warehouse",
        icon: <PackageOpen className="w-4 h-4" />,
    },
    {
        value: "pallet_rent",
        label: "Pallet Rent",
        icon: <Warehouse className="w-4 h-4" />,
    },
    {
        value: "other",
        label: "Other",
        icon: <MoreHorizontal className="w-4 h-4" />,
    },
];

const TYPE_COLORS: Record<ExpenseType, string> = {
    pallet_delivery: "bg-blue-100 text-blue-700",
    container_unload: "bg-purple-100 text-purple-700",
    delivery: "bg-orange-100 text-orange-700",
    pallet_rent: "bg-green-100 text-green-700",
    other: "bg-gray-100 text-gray-700",
};

const TYPE_CARD_STYLES: Record<
    ExpenseType,
    { bg: string; border: string; text: string; icon: string }
> = {
    pallet_delivery: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-900",
        icon: "text-blue-500",
    },
    container_unload: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-900",
        icon: "text-purple-500",
    },
    delivery: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-900",
        icon: "text-orange-500",
    },
    pallet_rent: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-900",
        icon: "text-green-500",
    },
    other: {
        bg: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-900",
        icon: "text-gray-500",
    },
};

// ─── Inline hooks ─────────────────────────────────────────────────────────────

function useExpenses(
    organizationId: string,
    warehouseLocationId: string,
    filters?: Omit<WarehouseExpenseFilters, "warehouseLocationId">,
) {
    return useQuery({
        queryKey: [
            "warehouse-expenses",
            organizationId,
            { ...filters, warehouseLocationId },
        ],
        queryFn: () =>
            getWarehouseExpenses(organizationId, {
                ...filters,
                warehouseLocationId,
            }),
        enabled: !!organizationId && !!warehouseLocationId,
        staleTime: 60 * 1000,
    });
}

function useExpenseSummary(organizationId: string) {
    const now = new Date();
    const from = format(startOfMonth(now), "yyyy-MM-dd");
    const to = format(endOfMonth(now), "yyyy-MM-dd");
    return useQuery({
        queryKey: ["warehouse-expense-summary", organizationId, from, to],
        queryFn: () => getExpenseSummary(organizationId, { from, to }),
        enabled: !!organizationId,
        staleTime: 60 * 1000,
    });
}

function useExpenseRates(organizationId: string) {
    return useQuery({
        queryKey: ["warehouse-expense-rates", organizationId],
        queryFn: () => getExpenseRates(organizationId),
        enabled: !!organizationId,
        staleTime: 5 * 60 * 1000,
    });
}

function useCreateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createWarehouseExpense,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["warehouse-expenses"] });
            queryClient.invalidateQueries({
                queryKey: ["warehouse-expense-summary"],
            });
            toast.success("Expense recorded");
        },
        onError: (err: unknown) => toast.error(getFriendlyErrorMessage(err)),
    });
}

function useUpdateRate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            organizationId,
            expenseType,
            newRate,
        }: {
            organizationId: string;
            expenseType: ExpenseType;
            newRate: number;
        }) => updateExpenseRate(organizationId, expenseType, newRate),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["warehouse-expense-rates"],
            });
            toast.success("Rate updated");
        },
        onError: (err: unknown) => toast.error(getFriendlyErrorMessage(err)),
    });
}

// Inline expense title update — server action
function useUpdateExpenseTitle(organizationId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, title }: { id: string; title: string }) => {
            await updateWarehouseExpenseTitleAction(id, title.trim() || null);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["warehouse-expenses", organizationId],
            });
            toast.success("Title saved");
        },
        onError: (err: any) => {
            console.error("Expense title update failed:", err?.message);
            toast.error("Failed to save title");
        },
    });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
    type,
    amount,
    count,
}: {
    type: ExpenseType;
    amount: number;
    count: number;
}) {
    const config = EXPENSE_TYPES.find((t) => t.value === type)!;
    const style = TYPE_CARD_STYLES[type];
    return (
        <div
            className={`rounded-xl border ${style.border} ${style.bg} p-4 flex flex-col gap-2`}
        >
            <div className={`flex items-center gap-2 ${style.icon}`}>
                {config.icon}
                <span className={`text-sm font-medium ${style.text}`}>
                    {config.label}
                </span>
            </div>
            <p className={`text-2xl font-bold ${style.text}`}>
                $
                {amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}
            </p>
            <p className="text-xs text-gray-500">
                {count} {count === 1 ? "entry" : "entries"} this month
            </p>
        </div>
    );
}

function ExpenseTypeBadge({ type }: { type: ExpenseType }) {
    const config = EXPENSE_TYPES.find((t) => t.value === type);
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[type]}`}
        >
            {config?.icon}
            {config?.label ?? type}
        </span>
    );
}

// ─── Inline expense title editor ──────────────────────────────────────────────
function ExpenseTitleEditor({
    expense,
    organizationId,
}: {
    expense: any;
    organizationId: string;
}) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(expense.title ?? "");
    const inputRef = useRef<HTMLInputElement>(null);
    const { mutate: updateTitle, isPending } =
        useUpdateExpenseTitle(organizationId);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    const handleSave = () => {
        if (value.trim() === (expense.title ?? "")) {
            setEditing(false);
            return;
        }
        updateTitle(
            { id: expense.id, title: value },
            { onSuccess: () => setEditing(false) },
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") {
            setValue(expense.title ?? "");
            setEditing(false);
        }
    };

    if (editing) {
        return (
            <div className="flex items-center gap-2 mb-0.5">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a title…"
                    className="text-sm font-semibold text-gray-800 bg-transparent border-b-2 border-indigo-400 outline-none w-full max-w-xs placeholder:text-gray-300 placeholder:font-normal"
                />
                <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 flex-shrink-0 transition-colors"
                >
                    {isPending ? (
                        <Loader2 size={9} className="animate-spin" />
                    ) : (
                        <Check size={9} />
                    )}
                </button>
                <button
                    onClick={() => {
                        setValue(expense.title ?? "");
                        setEditing(false);
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex-shrink-0 transition-colors"
                >
                    <X size={9} />
                </button>
            </div>
        );
    }

    if (expense.title) {
        return (
            <div className="flex items-center gap-1.5 mb-0.5 group">
                <p className="text-sm font-semibold text-gray-800">
                    {expense.title}
                </p>
                <button
                    onClick={() => setEditing(true)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex-shrink-0"
                    title="Edit title"
                >
                    <Pencil size={10} />
                </button>
            </div>
        );
    }

    // No title — clickable placeholder
    return (
        <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 mb-0.5 group text-left"
        >
            <p className="text-sm font-medium text-gray-400 italic group-hover:text-indigo-600 transition-colors">
                Add a title
            </p>
            <Pencil
                size={10}
                className="text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0"
            />
        </button>
    );
}

// ─── Add Expense Form ─────────────────────────────────────────────────────────

interface AddExpenseFormProps {
    organizationId: string;
    warehouseLocationId: string;
    rates: Array<{ expense_type: string; default_rate: number }>;
    onClose: () => void;
}

function AddExpenseForm({
    organizationId,
    warehouseLocationId,
    rates,
    onClose,
}: AddExpenseFormProps) {
    const { mutate: createExpense, isPending } = useCreateExpense();
    const { data: userInfo } = useUserInfo();

    const [title, setTitle] = useState("");
    const [titleError, setTitleError] = useState(false);
    const [expenseType, setExpenseType] =
        useState<ExpenseType>("pallet_delivery");
    const [palletCount, setPalletCount] = useState("");
    const [customTotal, setCustomTotal] = useState("");
    const [useCustomTotal, setUseCustomTotal] = useState(false);
    const [isSelfDelivered, setIsSelfDelivered] = useState(false);
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notes, setNotes] = useState("");
    const [periodStart, setPeriodStart] = useState("");
    const [periodEnd, setPeriodEnd] = useState("");

    const currentRate =
        rates.find((r) => r.expense_type === expenseType)?.default_rate ?? 0;

    const autoTotal = useMemo(() => {
        if (isSelfDelivered && expenseType === "delivery") return 0;
        const count = parseFloat(palletCount) || 0;
        return count * currentRate;
    }, [palletCount, currentRate, isSelfDelivered, expenseType]);

    const finalAmount = useCustomTotal
        ? parseFloat(customTotal) || 0
        : autoTotal;

    const handleSubmit = () => {
        if (!userInfo?.id) return;

        // ── Validation ──
        if (!title.trim()) {
            setTitleError(true);
            toast.error("Please add a title for this expense");
            return;
        }
        if (finalAmount < 0) {
            toast.error("Amount cannot be negative");
            return;
        }

        createExpense(
            {
                organization_id: organizationId,
                warehouse_location_id: warehouseLocationId,
                expense_type: expenseType,
                title: title.trim(),
                amount: finalAmount,
                pallet_count: palletCount ? parseInt(palletCount) : null,
                rate_per_pallet: useCustomTotal ? null : currentRate,
                expense_date: date,
                is_self_delivered:
                    expenseType === "delivery" ? isSelfDelivered : null,
                notes: notes || null,
                period_start:
                    expenseType === "pallet_rent" && periodStart
                        ? periodStart
                        : null,
                period_end:
                    expenseType === "pallet_rent" && periodEnd
                        ? periodEnd
                        : null,
                purchase_order_id: null,
                created_by: userInfo.id,
            },
            { onSuccess: onClose },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Record Expense
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-5 space-y-5">
                    {/* Title — required */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (e.target.value.trim()) setTitleError(false);
                            }}
                            placeholder="e.g. April rent, PO-12 delivery…"
                            className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${titleError ? "border-red-400 bg-red-50 placeholder:text-red-300" : "border-gray-200"}`}
                        />
                        {titleError && (
                            <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                                <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                    !
                                </span>
                                Title is required
                            </p>
                        )}
                    </div>

                    {/* Expense Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expense Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {EXPENSE_TYPES.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => {
                                        setExpenseType(t.value);
                                        setUseCustomTotal(false);
                                        setIsSelfDelivered(false);
                                    }}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${expenseType === t.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}
                                >
                                    {t.icon}
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Self-delivered toggle */}
                    {expenseType === "delivery" && (
                        <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-xl">
                            <div>
                                <p className="text-sm font-medium text-orange-900">
                                    Self-delivered
                                </p>
                                <p className="text-xs text-orange-600">
                                    Zeros the cost — no delivery charge
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setIsSelfDelivered(!isSelfDelivered)
                                }
                                className={`relative w-11 h-6 rounded-full transition-colors ${isSelfDelivered ? "bg-orange-500" : "bg-gray-200"}`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isSelfDelivered ? "translate-x-5" : "translate-x-0"}`}
                                />
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Pallet Count{" "}
                                {expenseType !== "other" && (
                                    <span className="text-gray-400">
                                        (optional)
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={palletCount}
                                onChange={(e) => setPalletCount(e.target.value)}
                                placeholder="0"
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Pallet rent period */}
                    {expenseType === "pallet_rent" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Period Start
                                </label>
                                <input
                                    type="date"
                                    value={periodStart}
                                    onChange={(e) =>
                                        setPeriodStart(e.target.value)
                                    }
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Period End
                                </label>
                                <input
                                    type="date"
                                    value={periodEnd}
                                    onChange={(e) =>
                                        setPeriodEnd(e.target.value)
                                    }
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Auto-calculated total */}
                    {!isSelfDelivered && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-sm text-gray-600">
                                        {palletCount
                                            ? `${palletCount} pallets × $${currentRate}/pallet`
                                            : `Rate: $${currentRate}/pallet`}
                                    </p>
                                    <p className="text-xl font-bold text-gray-900">
                                        $
                                        {useCustomTotal
                                            ? (
                                                  parseFloat(customTotal) || 0
                                              ).toFixed(2)
                                            : autoTotal.toFixed(2)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUseCustomTotal(!useCustomTotal);
                                        if (!useCustomTotal)
                                            setCustomTotal(
                                                autoTotal.toFixed(2),
                                            );
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    {useCustomTotal
                                        ? "Use calculated"
                                        : "Override total"}
                                </button>
                            </div>
                            {useCustomTotal && (
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={customTotal}
                                    onChange={(e) =>
                                        setCustomTotal(e.target.value)
                                    }
                                    placeholder="Enter custom total"
                                    className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            )}
                        </div>
                    )}

                    {isSelfDelivered && (
                        <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            Self-delivered — $0.00 cost recorded
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Notes{" "}
                            <span className="text-gray-400">(optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Any additional context…"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 p-5 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isPending ? "Saving…" : "Record Expense"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Manage Rates Panel ───────────────────────────────────────────────────────

interface ManageRatesPanelProps {
    organizationId: string;
    rates: Array<{
        expense_type: string;
        default_rate: number;
        rate_unit: string;
    }>;
    onClose: () => void;
}

function ManageRatesPanel({
    organizationId,
    rates,
    onClose,
}: ManageRatesPanelProps) {
    const { mutate: updateRate, isPending } = useUpdateRate();
    const [editedRates, setEditedRates] = useState<Record<string, string>>(
        Object.fromEntries(
            rates.map((r) => [r.expense_type, r.default_rate.toString()]),
        ),
    );
    const [savedTypes, setSavedTypes] = useState<Set<string>>(new Set());

    const handleSave = (expenseType: ExpenseType) => {
        const newRate = parseFloat(editedRates[expenseType]);
        if (isNaN(newRate) || newRate < 0) {
            toast.error("Enter a valid rate");
            return;
        }
        updateRate(
            { organizationId, expenseType, newRate },
            {
                onSuccess: () => {
                    setSavedTypes((prev) => new Set([...prev, expenseType]));
                    setTimeout(
                        () =>
                            setSavedTypes((prev) => {
                                const next = new Set(prev);
                                next.delete(expenseType);
                                return next;
                            }),
                        2000,
                    );
                },
            },
        );
    };

    const editableTypes = EXPENSE_TYPES.filter(
        (t) => t.value === "pallet_rent",
    );

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Manage Rates
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Changes apply to new entries only
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {editableTypes.map((type) => {
                        const rate = rates.find(
                            (r) => r.expense_type === type.value,
                        );
                        const isSaved = savedTypes.has(type.value);
                        return (
                            <div
                                key={type.value}
                                className="flex items-center gap-3"
                            >
                                <div
                                    className={`p-2 rounded-lg ${TYPE_COLORS[type.value]}`}
                                >
                                    {type.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800">
                                        {type.label}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {rate?.rate_unit === "per_pallet"
                                            ? "per pallet"
                                            : (rate?.rate_unit ?? "per pallet")}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={
                                                editedRates[type.value] ?? ""
                                            }
                                            onChange={(e) =>
                                                setEditedRates((prev) => ({
                                                    ...prev,
                                                    [type.value]:
                                                        e.target.value,
                                                }))
                                            }
                                            className="w-24 pl-6 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSave(
                                                type.value as ExpenseType,
                                            )
                                        }
                                        disabled={isPending}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${isSaved ? "bg-green-100 text-green-700" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
                                    >
                                        {isSaved ? (
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        ) : (
                                            "Save"
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-5 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export interface WarehouseExpensesPanelProps {
    organizationId: string;
    warehouseLocationId: string;
}

export function WarehouseExpensesPanel({
    organizationId,
    warehouseLocationId,
}: WarehouseExpensesPanelProps) {
    const { data: expenses = [], isLoading: expensesLoading } = useExpenses(
        organizationId,
        warehouseLocationId,
    );
    const { data: summary = [] } = useExpenseSummary(organizationId);
    const { data: rates = [] } = useExpenseRates(organizationId);

    const [showAddForm, setShowAddForm] = useState(false);
    const [showManageRates, setShowManageRates] = useState(false);
    const [filterType, setFilterType] = useState<ExpenseType | "all">("all");

    const summaryByType = useMemo(() => {
        return EXPENSE_TYPES.filter((t) => t.value !== "other").map((type) => {
            const found = summary.find(
                (s: any) => s.expense_type === type.value,
            );
            return {
                type: type.value as ExpenseType,
                amount: found?.total_amount ?? 0,
                count: found?.entry_count ?? 0,
            };
        });
    }, [summary]);

    const totalThisMonth = summaryByType.reduce((acc, s) => acc + s.amount, 0);

    const filteredExpenses = useMemo(() => {
        if (filterType === "all") return expenses;
        return expenses.filter((e) => e.expense_type === filterType);
    }, [expenses, filterType]);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Warehouse Expenses
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {format(new Date(), "MMMM yyyy")} · Total:{" "}
                        <span className="font-semibold text-gray-800">
                            $
                            {totalThisMonth.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                            })}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowManageRates(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Settings2 className="w-4 h-4" /> Manage Rates
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Add Expense
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                {summaryByType.map((s) => (
                    <SummaryCard key={s.type} {...s} />
                ))}
            </div>

            {/* Expense List */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-10">
                {/* Filter bar */}
                <div className="flex items-center gap-2 p-4 border-b border-gray-100 overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => setFilterType("all")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === "all" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                        All
                    </button>
                    {EXPENSE_TYPES.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() =>
                                setFilterType(
                                    filterType === t.value ? "all" : t.value,
                                )
                            }
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === t.value ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                        >
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>

                {expensesLoading ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                        Loading expenses…
                    </div>
                ) : filteredExpenses.length === 0 ? (
                    <div className="p-12 text-center">
                        <Warehouse className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">
                            No expenses recorded yet
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                            Click "Add Expense" to record your first entry
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filteredExpenses.map((expense) => (
                            <div
                                key={expense.id}
                                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                    {EXPENSE_TYPES.find(
                                        (t) =>
                                            t.value === expense.expense_type,
                                    )?.icon ?? (
                                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Inline title editor */}
                                    <ExpenseTitleEditor
                                        expense={expense}
                                        organizationId={organizationId}
                                    />

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <ExpenseTypeBadge
                                            type={
                                                expense.expense_type as ExpenseType
                                            }
                                        />
                                        {expense.is_self_delivered && (
                                            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                                Self-delivered
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                        <span>
                                            {format(
                                                new Date(expense.expense_date),
                                                "MMM d, yyyy",
                                            )}
                                        </span>
                                        {expense.pallet_count != null && (
                                            <span>
                                                {expense.pallet_count} pallets
                                            </span>
                                        )}
                                        {expense.rate_per_pallet != null && (
                                            <span>
                                                @ ${expense.rate_per_pallet}
                                                /pallet
                                            </span>
                                        )}
                                        {expense.period_start &&
                                            expense.period_end && (
                                                <span>
                                                    {format(
                                                        new Date(
                                                            expense.period_start,
                                                        ),
                                                        "MMM d",
                                                    )}{" "}
                                                    –{" "}
                                                    {format(
                                                        new Date(
                                                            expense.period_end,
                                                        ),
                                                        "MMM d",
                                                    )}
                                                </span>
                                            )}
                                    </div>
                                    {expense.notes && (
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                            Note: {expense.notes}
                                        </p>
                                    )}
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="text-base font-semibold text-gray-900">
                                        $
                                        {Number(expense.amount).toLocaleString(
                                            "en-US",
                                            {
                                                minimumFractionDigits: 2,
                                            },
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Warehouse Rent History ── */}
            <section className="mt-10 pt-8 border-t border-gray-200">
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Warehouse Rent History
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Monthly pallet rent snapshots
                    </p>
                </div>
                <RentHistoryTable />
            </section>

            {/* Modals */}
            {showAddForm && rates && (
                <AddExpenseForm
                    organizationId={organizationId}
                    warehouseLocationId={warehouseLocationId}
                    rates={rates}
                    onClose={() => setShowAddForm(false)}
                />
            )}

            {showManageRates && (
                <ManageRatesPanel
                    organizationId={organizationId}
                    rates={rates}
                    onClose={() => setShowManageRates(false)}
                />
            )}
        </div>
    );
}
