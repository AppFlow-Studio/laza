"use client";

import { Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

interface Category {
    id: string;
    name: string;
    description?: string | null;
    item_count?: number;
}

interface CategoryListProps {
    categories: Category[];
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
    isLoading?: boolean;
}

export default function CategoryList({
    categories,
    onEdit,
    onDelete,
    isLoading,
}: CategoryListProps) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="backdrop-blur-xl bg-white/40 rounded-2xl p-5 border border-white/50 shadow-lg animate-pulse"
                    >
                        <div className="h-5 bg-zinc-200/50 rounded-lg w-1/3 mb-3" />
                        <div className="h-4 bg-zinc-200/50 rounded-lg w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div className="text-center py-16 backdrop-blur-xl bg-white/40 rounded-2xl border border-white/50 shadow-lg">
                <Package className="w-14 h-14 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500 font-medium">No categories found</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {categories.map((category, index) => (
                <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 100,
                    }}
                    whileHover={{ scale: 1.01, y: -2 }}
                    className="group relative backdrop-blur-xl bg-gradient-to-br from-white/60 to-white/30 rounded-2xl p-5 border border-white/50 shadow-lg hover:shadow-xl hover:border-white/70 transition-all duration-300"
                >
                    {/* Subtle gradient overlay for liquid effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50/20 via-transparent to-pink-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                    <div className="relative flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5">
                                <h3 className="font-semibold text-zinc-800 text-lg">
                                    {category.name}
                                </h3>
                                {category.item_count !== undefined && (
                                    <span className="text-xs px-2.5 py-1 bg-zinc-900/5 backdrop-blur-sm text-zinc-600 rounded-full font-medium border border-zinc-200/50">
                                        {category.item_count} item
                                        {category.item_count !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                            {category.description && (
                                <p className="text-sm text-zinc-500 line-clamp-2">
                                    {category.description}
                                </p>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(category)}
                                className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">
                                    Edit {category.name}
                                </span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(category)}
                                className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">
                                    Delete {category.name}
                                </span>
                            </Button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
