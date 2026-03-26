"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const categorySchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(100, "Name must be 100 characters or less"),
    description: z
        .string()
        .max(500, "Description must be 500 characters or less")
        .optional(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
    initialData?: {
        name: string;
        description?: string | undefined;
    };
    onSubmit: (data: CategoryFormData) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function CategoryForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading,
}: CategoryFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: initialData?.name || "",
            description: initialData?.description || "",
        },
    });

    const descriptionLength = watch("description")?.length || 0;

    return (
        <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
        >
            {/* Name */}
            <div>
                <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Name <span className="text-rose-500">*</span>
                </label>
                <input
                    id="name"
                    {...register("name")}
                    placeholder="e.g. Electronics, Home Decor"
                    disabled={isLoading}
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

            {/* Description */}
            <div>
                <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                    Description{" "}
                    <span className="text-gray-400 font-normal">
                        (Optional)
                    </span>
                </label>
                <textarea
                    id="description"
                    {...register("description")}
                    placeholder="Describe what this category includes..."
                    rows={4}
                    maxLength={500}
                    disabled={isLoading}
                    className={cn(
                        "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-all",
                        errors.description
                            ? "border-rose-400 focus:ring-rose-500"
                            : "border-gray-200 focus:ring-indigo-500",
                    )}
                />
                <div className="flex justify-between items-center mt-1">
                    {errors.description ? (
                        <p className="text-xs text-rose-500 font-medium">
                            {errors.description.message}
                        </p>
                    ) : (
                        <div />
                    )}
                    <p
                        className={cn(
                            "text-[10px] uppercase tracking-wider font-semibold",
                            descriptionLength > 450
                                ? "text-amber-500"
                                : "text-gray-400",
                        )}
                    >
                        {descriptionLength} / 500
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving…
                        </span>
                    ) : initialData ? (
                        "Update Category"
                    ) : (
                        "Create Category"
                    )}
                </button>
            </div>
        </motion.form>
    );
}