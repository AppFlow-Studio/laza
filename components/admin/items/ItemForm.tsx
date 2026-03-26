"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useCreateItem, useUpdateItem } from "@/lib/hooks/queries/useItems";
import { useCategories } from "@/lib/hooks/queries/useCategories";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import toast from "react-hot-toast";

const itemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    sku: z.string().optional().nullable(),
    category: z.number().optional().nullable(),
    unit_of_measure: z.enum(["pcs", "kg", "liters", "lbs", "oz"]),
    min_quantity: z.number().min(0),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormProps {
    item?: {
        id: number | string;
        name: string;
        sku?: string | null;
        category_id?: number | null;
        category?: {
            id: number;
            name: string;
        } | null;
        unit_of_measure: "pcs" | "kg" | "liters" | "lbs" | "oz";
        min_quantity: number;
    } | null;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function ItemForm({ item, onSuccess, onCancel }: ItemFormProps) {
    const { data: userInfo } = useUserInfo();
    const { data: categories, isLoading: categoriesLoading } = useCategories();
    const createMutation = useCreateItem();
    const updateMutation = useUpdateItem();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: "",
            sku: "",
            category: null,
            unit_of_measure: "pcs",
            min_quantity: 0,
        },
    });

    useEffect(() => {
        if (item && categories) {
            let categoryId: number | null = null;
            if (item.category_id) {
                categoryId = item.category_id;
            } else if (
                item.category &&
                typeof item.category === "object" &&
                "id" in item.category
            ) {
                categoryId = item.category.id;
            }
            reset({
                name: item.name || "",
                sku: item.sku || "",
                category: categoryId,
                unit_of_measure: item.unit_of_measure || "pcs",
                min_quantity: item.min_quantity || 0,
            });
        } else if (!item) {
            reset({
                name: "",
                sku: "",
                category: null,
                unit_of_measure: "pcs",
                min_quantity: 0,
            });
        }
    }, [item, categories, reset]);

    const onSubmit = async (data: ItemFormData) => {
        try {
            const organizationId = userInfo?.members.organization_id;
            if (!organizationId) {
                toast.error("Organization not found");
                return;
            }

            if (item) {
                await updateMutation.mutateAsync({
                    id: String(item.id),
                    updates: {
                        name: data.name,
                        sku: data.sku || null,
                        category_id: data.category || null,
                        unit_of_measure: data.unit_of_measure,
                        min_quantity: data.min_quantity,
                    },
                });
                toast.success("Item updated successfully");
            } else {
                await createMutation.mutateAsync({
                    item: {
                        organization_id: organizationId,
                        name: data.name,
                        sku: data.sku || null,
                        category_id: data.category || null,
                        unit_of_measure: data.unit_of_measure,
                        min_quantity: data.min_quantity,
                    },
                });
                toast.success("Item created successfully");
            }

            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    const selectClass =
        "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none";

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Item Name */}
            <div>
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                    id="name"
                    {...register("name")}
                    placeholder="e.g. Nutella, Paper Bags"
                    disabled={isPending}
                    className={cn(
                        "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                        errors.name
                            ? "border-rose-400 focus:ring-rose-500"
                            : "border-gray-200 focus:ring-indigo-500",
                    )}
                />
                {errors.name && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.name.message}
                    </p>
                )}
            </div>

            {/* SKU */}
            <div>
                <label
                    htmlFor="sku"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    SKU{" "}
                    <span className="text-gray-400 font-normal">
                        (Optional)
                    </span>
                </label>
                <input
                    id="sku"
                    {...register("sku")}
                    placeholder="e.g. NUT-001"
                    disabled={isPending}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
            </div>

            {/* Category */}
            <div>
                <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Category
                </label>
                <select
                    id="category"
                    {...register("category", {
                        setValueAs: (v) => (v === "" ? null : Number(v)),
                    })}
                    disabled={categoriesLoading || isPending}
                    className={selectClass}
                >
                    <option value="">Select a category</option>
                    {categories?.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
                {errors.category && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.category.message}
                    </p>
                )}
            </div>

            {/* Unit of Measure */}
            <div>
                <label
                    htmlFor="unit_of_measure"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Unit of Measure
                </label>
                <select
                    id="unit_of_measure"
                    {...register("unit_of_measure")}
                    disabled={isPending}
                    className={selectClass}
                >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="liters">Liters</option>
                    <option value="lbs">Pounds</option>
                    <option value="oz">Ounces</option>
                </select>
            </div>

            {/* Minimum Quantity */}
            <div>
                <label
                    htmlFor="min_quantity"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Minimum Quantity
                </label>
                <input
                    id="min_quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("min_quantity", { valueAsNumber: true })}
                    disabled={isPending}
                    className={cn(
                        "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                        errors.min_quantity
                            ? "border-rose-400 focus:ring-rose-500"
                            : "border-gray-200 focus:ring-indigo-500",
                    )}
                />
                {errors.min_quantity && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.min_quantity.message}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isPending}
                    className={cn(
                        "px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                        onCancel ? "flex-1" : "w-full",
                    )}
                >
                    {isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving…
                        </span>
                    ) : item ? (
                        "Update Item"
                    ) : (
                        "Create Item"
                    )}
                </button>
            </div>
        </form>
    );
}