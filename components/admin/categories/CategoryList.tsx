"use client";

import { Edit, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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

export default function CategoryList({ categories, onEdit, onDelete, isLoading }: CategoryListProps) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-zinc-50 rounded-lg p-4 border border-zinc-200 animate-pulse">
                        <div className="h-4 bg-zinc-200 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-zinc-200 rounded w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500">No categories found</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {categories.map((category, index) => (
                <motion.div
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-lg p-4 border border-zinc-200 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-zinc-900">{category.name}</h3>
                                {category.item_count !== undefined && (
                                    <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
                                        {category.item_count} item{category.item_count !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            {category.description && (
                                <p className="text-sm text-zinc-600 mt-1 line-clamp-2">
                                    {category.description}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(category)}
                                className="flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDelete(category)}
                                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

