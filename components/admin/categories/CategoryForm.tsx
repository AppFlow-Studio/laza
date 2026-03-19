"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
            className="space-y-6"
        >
            <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-700 font-medium">
                    Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                    id="name"
                    {...register("name")}
                    placeholder="e.g. Electronics, Home Decor"
                    className={cn(
                        "bg-white/40 border-zinc-200/60 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200",
                        errors.name &&
                            "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
                    )}
                    disabled={isLoading}
                />
                {errors.name && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                        {errors.name.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label
                    htmlFor="description"
                    className="text-zinc-700 font-medium"
                >
                    Description (Optional)
                </Label>
                <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Describe what this category includes..."
                    rows={4}
                    maxLength={500}
                    className={cn(
                        "bg-white/40 border-zinc-200/60 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200 resize-none",
                        errors.description &&
                            "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
                    )}
                    disabled={isLoading}
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
                                : "text-zinc-400",
                        )}
                    >
                        {descriptionLength} / 500
                    </p>
                </div>
            </div>

            <div className="flex gap-3 pt-6">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="flex-1 hover:bg-zinc-100/50 text-zinc-600"
                    disabled={isLoading}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving...
                        </span>
                    ) : initialData ? (
                        "Update Category"
                    ) : (
                        "Create Category"
                    )}
                </Button>
            </div>
        </motion.form>
    );
}
