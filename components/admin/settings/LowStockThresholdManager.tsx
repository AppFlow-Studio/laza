"use client";

// components/admin/settings/LowStockThresholdManager.tsx

import { useState } from "react";
import {
    useLowStockThresholds,
    useCreateLowStockThreshold,
    useUpdateLowStockThreshold,
    useDeleteLowStockThreshold,
} from "@/lib/hooks/queries/useNotificationPreferences";
import { useItems } from "@/lib/hooks/queries/useItems";
import { useLocations } from "@/lib/hooks/queries/useLocations";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/utils/errorMessages";

interface LowStockThresholdManagerProps {
    organizationId: string;
    /** When set, list is filtered + new thresholds pre-scoped to this location. */
    locationId?: string;
    /** Human-readable label shown in headings ("Warehouse", "Brooklyn"). Defaults to "location". */
    locationLabel?: string;
    /** Controls min-quantity placeholder: "warehouse" → 200, "store" → 5 */
    context?: "store" | "warehouse";
}

type ThresholdType = "item" | "category" | "location";

const EMPTY_FORM = (lockedLocationId?: string) => ({
    item_id: "",
    category_id: "",
    location_id: lockedLocationId ?? "",
    low_threshold: "",
    critical_threshold: "",
});

export default function LowStockThresholdManager({
    organizationId,
    locationId,
    locationLabel = "location",
    context = "store",
}: LowStockThresholdManagerProps) {
    const { data: thresholds, isLoading: thresholdsLoading } =
        useLowStockThresholds(organizationId, { isActive: true, locationId });
    const { data: items, isLoading: itemsLoading } = useItems();
    const { data: locations, isLoading: locationsLoading } = useLocations();
    const createMutation = useCreateLowStockThreshold();
    const updateMutation = useUpdateLowStockThreshold();
    const deleteMutation = useDeleteLowStockThreshold();

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(EMPTY_FORM(locationId));
    const [thresholdType, setThresholdType] = useState<ThresholdType>("item");

    const loading = thresholdsLoading || itemsLoading || locationsLoading;

    function openAddForm() {
        setEditingId(null);
        setFormData(EMPTY_FORM(locationId));
        setThresholdType("item");
        setShowForm(true);
    }

    function openEditForm(t: any) {
        setEditingId(t.id);
        setFormData({
            item_id: t.item_id ?? "",
            category_id: t.category_id ?? "",
            location_id: t.location_id ?? locationId ?? "",
            low_threshold: String(t.low_threshold),
            critical_threshold: t.critical_threshold
                ? String(t.critical_threshold)
                : "",
        });
        setThresholdType(
            t.item_id ? "item" : t.category_id ? "category" : "location",
        );
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingId(null);
        setFormData(EMPTY_FORM(locationId));
    }

    function handleTypeChange(type: ThresholdType) {
        setThresholdType(type);
        setFormData((prev) => ({
            ...prev,
            item_id: "",
            category_id: "",
            location_id: locationId ?? "",
        }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            organization_id: organizationId,
            item_id: formData.item_id || null,
            category_id: formData.category_id || null,
            location_id: locationId ?? (formData.location_id || null),
            low_threshold: parseFloat(formData.low_threshold),
            critical_threshold: formData.critical_threshold
                ? parseFloat(formData.critical_threshold)
                : null,
            is_active: true,
        };
        try {
            if (editingId) {
                await updateMutation.mutateAsync({
                    id: editingId,
                    updates: payload as any,
                });
                toast.success("Threshold updated");
            } else {
                await createMutation.mutateAsync(payload as any);
                toast.success("Threshold created");
            }
            closeForm();
        } catch (err: unknown) {
            toast.error(getFriendlyErrorMessage(err));
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this threshold?")) return;
        try {
            await deleteMutation.mutateAsync({ id, organizationId });
            toast.success("Threshold deleted");
        } catch (err: unknown) {
            toast.error(getFriendlyErrorMessage(err));
        }
    }

    if (loading) return <LoadingSkeleton />;

    return (
        <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-zinc-900">
                        Low Stock Thresholds
                    </p>
                    <p className="text-xs text-zinc-500">
                        Set custom thresholds for items, categories, or{" "}
                        {locationLabel}
                    </p>
                </div>
                <button
                    onClick={openAddForm}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add Threshold
                </button>
            </div>

            {/* Add / edit form */}
            {showForm && (
                <form
                    onSubmit={handleSubmit}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-zinc-700">
                            {editingId ? "Edit threshold" : "New threshold"}
                        </p>
                        <button
                            type="button"
                            onClick={closeForm}
                            className="text-zinc-400 hover:text-zinc-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Type tabs */}
                    <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 w-fit">
                        {(
                            [
                                "item",
                                "category",
                                ...(locationId ? [] : ["location"]),
                            ] as ThresholdType[]
                        ).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => handleTypeChange(t)}
                                className={cn(
                                    "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
                                    thresholdType === t
                                        ? "bg-indigo-600 text-white"
                                        : "text-zinc-600 hover:text-zinc-900",
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Target selector */}
                        {thresholdType === "item" && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-600">
                                    Item
                                </label>
                                <select
                                    value={formData.item_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            item_id: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-indigo-400 focus:outline-none"
                                >
                                    <option value="">Select item…</option>
                                    {items?.map((item: any) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {thresholdType === "category" && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-600">
                                    Category
                                </label>
                                <select
                                    value={formData.category_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            category_id: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-indigo-400 focus:outline-none"
                                >
                                    <option value="">Select category…</option>
                                    <option value="desserts">Desserts</option>
                                    <option value="ingredients">
                                        Ingredients
                                    </option>
                                    <option value="supplies">Supplies</option>
                                </select>
                            </div>
                        )}

                        {thresholdType === "location" && !locationId && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-600">
                                    Location
                                </label>
                                <select
                                    value={formData.location_id}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            location_id: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-indigo-400 focus:outline-none"
                                >
                                    <option value="">Select location…</option>
                                    {locations?.map((loc: any) => (
                                        <option key={loc.id} value={loc.id}>
                                            {loc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {thresholdType === "location" && locationId && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-600">
                                    Location
                                </label>
                                <div className="flex h-9 items-center rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-xs text-zinc-500">
                                    {locationLabel} (pre-set)
                                </div>
                            </div>
                        )}

                        {/* Low threshold */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-600">
                                Low Threshold
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder={
                                    context === "warehouse" ? "200" : "5"
                                }
                                value={formData.low_threshold}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        low_threshold: e.target.value,
                                    })
                                }
                                required
                                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none"
                            />
                        </div>

                        {/* Critical threshold */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-600">
                                Critical Threshold{" "}
                                <span className="font-normal text-zinc-400">
                                    (optional)
                                </span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder={
                                    context === "warehouse" ? "100" : "2"
                                }
                                value={formData.critical_threshold}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        critical_threshold: e.target.value,
                                    })
                                }
                                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-400 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={
                                createMutation.isPending ||
                                updateMutation.isPending
                            }
                            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                        >
                            <Check className="h-3.5 w-3.5" />
                            {editingId ? "Update" : "Create"}
                        </button>
                        <button
                            type="button"
                            onClick={closeForm}
                            className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Threshold list */}
            {thresholds && thresholds.length > 0 ? (
                <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white overflow-hidden">
                    {thresholds.map((t: any) => {
                        const item = items?.find(
                            (i: any) => i.id === t.item_id,
                        );
                        const loc = locations?.find(
                            (l: any) => l.id === t.location_id,
                        );
                        const typeLabel = t.item_id
                            ? "Item"
                            : t.category_id
                              ? "Category"
                              : "Location";
                        const nameLabel = t.item_id
                            ? (item?.name ?? t.item_id)
                            : t.category_id
                              ? t.category_id
                              : (loc?.name ?? locationLabel);

                        return (
                            <div
                                key={t.id}
                                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                                            {typeLabel}
                                        </span>
                                        <span className="truncate text-sm font-medium text-zinc-900">
                                            {nameLabel}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-zinc-500">
                                        Low:{" "}
                                        <span className="font-medium text-zinc-700">
                                            {t.low_threshold}
                                        </span>
                                        {t.critical_threshold && (
                                            <>
                                                {" "}
                                                · Critical:{" "}
                                                <span className="font-medium text-red-600">
                                                    {t.critical_threshold}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                    <button
                                        onClick={() => openEditForm(t)}
                                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(t.id)}
                                        disabled={deleteMutation.isPending}
                                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                !showForm && (
                    <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-10 text-center">
                        <p className="text-sm text-zinc-400">
                            No custom thresholds configured
                            {locationLabel !== "location" && (
                                <> for this {locationLabel}</>
                            )}
                        </p>
                    </div>
                )
            )}
        </div>
    );
}