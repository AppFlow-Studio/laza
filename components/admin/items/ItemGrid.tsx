"use client";

import { motion } from 'framer-motion';
import { Package, Edit, Trash2 } from 'lucide-react';
import { Item } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

interface ItemGridProps {
    items: Item[];
    onEdit?: (item: Item) => void;
    onDelete?: (item: Item) => void;
}

export default function ItemGrid({ items, onEdit, onDelete }: ItemGridProps) {
    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'desserts':
                return 'bg-purple-50 text-purple-600';
            case 'ingredients':
                return 'bg-blue-50 text-blue-600';
            case 'supplies':
                return 'bg-amber-50 text-amber-600';
            default:
                return 'bg-zinc-50 text-zinc-600';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
                <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white rounded-xl shadow-sm p-4 border border-zinc-200 hover:shadow-lg transition-shadow"
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Package className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(item.category))}>
                            {item.category}
                        </div>
                    </div>

                    <h3 className="font-semibold text-zinc-900 mb-1">{item.name}</h3>
                    {item.sku && (
                        <p className="text-xs text-zinc-500 mb-2">SKU: {item.sku}</p>
                    )}
                    <p className="text-sm text-zinc-600 mb-3">
                        Min: {item.min_quantity} {item.unit_of_measure}
                    </p>

                    <div className="flex items-center gap-2 pt-3 border-t border-zinc-200">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(item)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(item)}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

