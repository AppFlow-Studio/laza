"use client";

import { useState } from "react";
import { Pencil, Trash2, Package, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface Item {
    id: number;
    name: string;
    sku?: string | null;
    unit_of_measure: string;
    min_quantity: number;
}

interface Category {
    id: string;
    name: string;
    description?: string | null;
    item_count?: number;
    items?: Item[];
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
    const [openId, setOpenId] = useState<string | null>(null);

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
            {categories.map((category, index) => {
                const isOpen = openId === category.id;
                const items = category.items ?? [];

                return (
                    <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                            delay: index * 0.05,
                            type: "spring",
                            stiffness: 100,
                        }}
                        className="group relative backdrop-blur-xl bg-gradient-to-br from-white/60 to-white/30 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl hover:border-white/70 transition-all duration-300"
                    >
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-50/20 via-transparent to-pink-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        {/* Header row */}
                        <div
                            className="relative flex items-center justify-between gap-4 p-5 cursor-pointer select-none"
                            onClick={() =>
                                setOpenId(isOpen ? null : category.id)
                            }
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1.5">
                                    <h3 className="font-semibold text-zinc-800 text-lg">
                                        {category.name}
                                    </h3>
                                    {category.item_count !== undefined && (
                                        <span className="text-xs px-2.5 py-1 bg-zinc-900/5 backdrop-blur-sm text-zinc-600 rounded-full font-medium border border-zinc-200/50">
                                            {category.item_count} item
                                            {category.item_count !== 1
                                                ? "s"
                                                : ""}
                                        </span>
                                    )}
                                </div>
                                {category.description && (
                                    <p className="text-sm text-zinc-500 line-clamp-2">
                                        {category.description}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Edit/Delete — stop propagation so click doesn't toggle accordion */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(category);
                                        }}
                                        className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(category);
                                        }}
                                        className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <ChevronDown
                                    className={cn(
                                        "w-5 h-5 text-zinc-400 transition-transform duration-300 ml-1",
                                        isOpen && "rotate-180",
                                    )}
                                />
                            </div>
                        </div>

                        {/* Accordion content */}
                        <AnimatePresence initial={false}>
                            {isOpen && (
                                <motion.div
                                    key="content"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{
                                        duration: 0.25,
                                        ease: "easeInOut",
                                    }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-5 pb-5 border-t border-white/50 pt-4">
                                        {items.length === 0 ? (
                                            <p className="text-sm text-zinc-400 text-center py-4">
                                                No items in this category
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between px-4 py-3 bg-white/50 rounded-xl border border-zinc-100"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium text-zinc-800">
                                                                {item.name}
                                                            </p>
                                                            {item.sku && (
                                                                <p className="text-xs text-zinc-400">
                                                                    SKU:{" "}
                                                                    {item.sku}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-zinc-500">
                                                                Min:{" "}
                                                                {
                                                                    item.min_quantity
                                                                }{" "}
                                                                {
                                                                    item.unit_of_measure
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}
        </div>
    );
}