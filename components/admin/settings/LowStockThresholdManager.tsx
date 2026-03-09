"use client";

import { useState } from "react";
import {
    useLowStockThresholds,
    useCreateLowStockThreshold,
    useUpdateLowStockThreshold,
    useDeleteLowStockThreshold,
} from "@/lib/hooks/queries/useNotificationPreferences";
import { useItems } from "@/lib/hooks/queries/useItems";
import { useLocations } from "@/lib/hooks/queries/useLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

interface LowStockThresholdManagerProps {
    organizationId: string;
    // When set, the list is filtered to this location and new thresholds
    // are pre-scoped to it. Used by the warehouse thresholds page.
    // Omit on the admin settings page — shows all thresholds as before.
    locationId?: string;
    // Human-readable label for this location context ("Warehouse", "Brooklyn").
    // Shown in the empty state and the form location field label.
    // Defaults to "location".
    locationLabel?: string;
    // Controls the min-quantity placeholder value in the form.
    // "warehouse" → 200 (appropriate for 45-day overseas lead time)
    // "store"     → 5   (existing behaviour, default)
    context?: "store" | "warehouse";
}

export default function LowStockThresholdManager({
    organizationId,
    locationId,
    locationLabel = "location",
    context = "store",
}: LowStockThresholdManagerProps) {
    // ── Data ────────────────────────────────────────────────────────────────
    // Pass locationId as a filter when provided — scopes results to the
    // warehouse without any other changes to the hook or query function.
    const { data: thresholds, isLoading: thresholdsLoading } =
        useLowStockThresholds(
            organizationId,
            { isActive: true, locationId: locationId ?? undefined },
        );
    const { data: items, isLoading: itemsLoading } = useItems();
    const { data: locations, isLoading: locationsLoading } = useLocations();
    const createMutation = useCreateLowStockThreshold();
    const updateMutation = useUpdateLowStockThreshold();
    const deleteMutation = useDeleteLowStockThreshold();

    // ── Form state ──────────────────────────────────────────────────────────
    const [showForm, setShowForm] = useState(false);
    const [editingThreshold, setEditingThreshold] = useState<any>(null);
    const [formData, setFormData] = useState({
        item_id: "",
        category_id: "",
        // Pre-fill with locationId prop when available so new thresholds are
        // automatically scoped to the warehouse without the user selecting it.
        location_id: locationId ?? "",
        low_threshold: "",
        critical_threshold: "",
        is_active: true,
    });

    // ── Helpers ─────────────────────────────────────────────────────────────
    const resetForm = () => {
        setFormData({
            item_id: "",
            category_id: "",
            location_id: locationId ?? "",   // always reset to the locked location
            low_threshold: "",
            critical_threshold: "",
            is_active: true,
        });
        setEditingThreshold(null);
        setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const thresholdData = {
                organization_id: organizationId,
                item_id: formData.item_id || null,
                category_id: formData.category_id || null,
                // When locationId prop is set, always use it — don't let the
                // dropdown override the warehouse context.
                location_id: locationId ?? (formData.location_id || null),
                low_threshold: parseFloat(formData.low_threshold),
                critical_threshold: formData.critical_threshold
                    ? parseFloat(formData.critical_threshold)
                    : null,
                is_active: formData.is_active,
            };

            if (editingThreshold) {
                await updateMutation.mutateAsync({
                    id: editingThreshold.id,
                    updates: thresholdData as any,
                });
                toast.success("Threshold updated");
            } else {
                await createMutation.mutateAsync(thresholdData as any);
                toast.success("Threshold created");
            }
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Failed to save threshold");
        }
    };

    const handleEdit = (threshold: any) => {
        setEditingThreshold(threshold);
        setFormData({
            item_id: threshold.item_id || "",
            category_id: threshold.category_id || "",
            location_id: threshold.location_id || locationId || "",
            low_threshold: threshold.low_threshold.toString(),
            critical_threshold: threshold.critical_threshold?.toString() || "",
            is_active: threshold.is_active,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this threshold?")) return;
        try {
            await deleteMutation.mutateAsync({ id, organizationId });
            toast.success("Threshold deleted");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete threshold");
        }
    };

    // Derive current type selection from form state — needed for the type
    // dropdown to stay in sync with which secondary field is visible.
    const currentType = formData.item_id
        ? "item"
        : formData.category_id
          ? "category"
          : "location";

    const handleTypeChange = (type: string) => {
        // Reset the three target fields when the user switches types
        setFormData({
            ...formData,
            item_id: "",
            category_id: "",
            // Keep the locationId locked if prop is set
            location_id: locationId ?? "",
        });
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (thresholdsLoading || itemsLoading || locationsLoading) {
        return <LoadingSkeleton />;
    }

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Low Stock Thresholds</CardTitle>
                            <CardDescription>
                                Set custom thresholds for items, categories, or{" "}
                                {locationLabel}
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Threshold
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* ── Add / edit form ─────────────────────────────────── */}
                    {showForm && (
                        <form
                            onSubmit={handleSubmit}
                            className="mb-6 p-4 border rounded-lg space-y-4 bg-zinc-50"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                {/* Type selector */}
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <select
                                        value={currentType}
                                        onChange={(e) =>
                                            handleTypeChange(e.target.value)
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                    >
                                        <option value="item">Item</option>
                                        <option value="category">
                                            Category
                                        </option>
                                        {/* Only show Location type when not
                                            locked to a specific locationId —
                                            on the warehouse page the location
                                            is always pre-filled. */}
                                        {!locationId && (
                                            <option value="location">
                                                Location
                                            </option>
                                        )}
                                    </select>
                                </div>

                                {/* Secondary field — item, category, or location */}
                                {currentType === "item" && (
                                    <div className="space-y-2">
                                        <Label>Item</Label>
                                        <select
                                            value={formData.item_id}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    item_id: e.target.value,
                                                    category_id: "",
                                                    location_id:
                                                        locationId ?? "",
                                                })
                                            }
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                        >
                                            <option value="">
                                                Select item
                                            </option>
                                            {items?.map((item: any) => (
                                                <option
                                                    key={item.id}
                                                    value={item.id}
                                                >
                                                    {item.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {currentType === "category" && (
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <select
                                            value={formData.category_id}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    category_id: e.target.value,
                                                    item_id: "",
                                                    location_id:
                                                        locationId ?? "",
                                                })
                                            }
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                        >
                                            <option value="">
                                                Select category
                                            </option>
                                            <option value="desserts">
                                                Desserts
                                            </option>
                                            <option value="ingredients">
                                                Ingredients
                                            </option>
                                            <option value="supplies">
                                                Supplies
                                            </option>
                                        </select>
                                    </div>
                                )}

                                {/* Location selector — only shown when NOT
                                    locked to a specific location (i.e. on the
                                    admin settings page, not the warehouse page) */}
                                {currentType === "location" && !locationId && (
                                    <div className="space-y-2">
                                        <Label>Location</Label>
                                        <select
                                            value={formData.location_id}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    location_id: e.target.value,
                                                    item_id: "",
                                                    category_id: "",
                                                })
                                            }
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                                        >
                                            <option value="">
                                                Select location
                                            </option>
                                            {locations?.map((loc: any) => (
                                                <option
                                                    key={loc.id}
                                                    value={loc.id}
                                                >
                                                    {loc.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* When locationId is locked (warehouse page),
                                    show a read-only label instead of a dropdown */}
                                {currentType === "location" && locationId && (
                                    <div className="space-y-2">
                                        <Label>
                                            {locationLabel.charAt(0).toUpperCase() +
                                                locationLabel.slice(1)}
                                        </Label>
                                        <div className="flex h-9 items-center rounded-md border border-input bg-zinc-100 px-3 text-sm text-zinc-500">
                                            Pre-set to{" "}
                                            {locationLabel}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quantity thresholds */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="low-threshold">
                                        Low Threshold
                                    </Label>
                                    <Input
                                        id="low-threshold"
                                        type="number"
                                        step="0.01"
                                        // Warehouse context → suggest 200, store → 5
                                        placeholder={
                                            context === "warehouse"
                                                ? "200"
                                                : "5"
                                        }
                                        value={formData.low_threshold}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                low_threshold: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="critical-threshold">
                                        Critical Threshold (optional)
                                    </Label>
                                    <Input
                                        id="critical-threshold"
                                        type="number"
                                        step="0.01"
                                        placeholder={
                                            context === "warehouse"
                                                ? "100"
                                                : "2"
                                        }
                                        value={formData.critical_threshold}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                critical_threshold:
                                                    e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={
                                        createMutation.isPending ||
                                        updateMutation.isPending
                                    }
                                >
                                    {editingThreshold ? "Update" : "Create"}{" "}
                                    Threshold
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* ── Threshold list ──────────────────────────────────── */}
                    {thresholds && thresholds.length > 0 ? (
                        <div className="space-y-2">
                            {thresholds.map((threshold: any) => {
                                const item = items?.find(
                                    (i: any) => i.id === threshold.item_id,
                                );
                                const location = locations?.find(
                                    (l: any) => l.id === threshold.location_id,
                                );
                                const type = threshold.item_id
                                    ? "Item"
                                    : threshold.category_id
                                      ? "Category"
                                      : "Location";
                                const name = threshold.item_id
                                    ? item?.name
                                    : threshold.category_id
                                      ? threshold.category_id
                                      : location?.name;

                                return (
                                    <div
                                        key={threshold.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {type}: {name}
                                            </div>
                                            <div className="text-sm text-zinc-600">
                                                Low: {threshold.low_threshold}
                                                {threshold.critical_threshold &&
                                                    ` | Critical: ${threshold.critical_threshold}`}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleEdit(threshold)
                                                }
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleDelete(threshold.id)
                                                }
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // Empty state uses locationLabel so the copy is correct
                        // in both contexts: "No custom thresholds configured for
                        // this warehouse" vs "No custom thresholds configured"
                        <p className="text-center text-zinc-500 py-8">
                            No custom thresholds configured
                            {locationLabel !== "location" && (
                                <> for this {locationLabel}</>
                            )}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}