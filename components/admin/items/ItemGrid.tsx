"use client";

import { motion } from 'framer-motion';
import { Package, Edit, Trash2, Check } from 'lucide-react';
import { Item } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface ItemGridProps {
    items: Item[];
    onEdit?: (item: Item) => void;
    onDelete?: (item: Item) => void;
    viewMode?: 'grid' | 'list';
    selectedItems?: Set<string>;
    onItemToggle?: (itemId: string) => void;
    onSelectAll?: (select: boolean) => void;
}

export default function ItemGrid({
    items,
    onEdit,
    onDelete,
    viewMode = 'grid',
    selectedItems = new Set(),
    onItemToggle,
    onSelectAll,
}: ItemGridProps) {
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

    const getCategoryName = (item: Item) => {
        if (typeof item.category === 'object' && item.category !== null && 'name' in item.category) {
            return (item.category as any).name;
        }
        return item.category;
    };

    const allSelected = items.length > 0 && items.every(item => selectedItems.has(item.id));
    const someSelected = items.some(item => selectedItems.has(item.id));

    if (viewMode === 'list') {
        return (
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {onItemToggle && (
                                <TableHead className="w-14">
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectAll && onSelectAll(!allSelected);
                                        }}
                                        className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                        title={allSelected ? "Deselect all" : "Select all"}
                                    >
                                        <div
                                            className={cn(
                                                "w-6 h-6 rounded border-2 flex items-center justify-center transition-all hover:scale-110",
                                                allSelected
                                                    ? "bg-indigo-600 border-indigo-600 shadow-sm"
                                                    : someSelected
                                                        ? "bg-indigo-100 border-indigo-300"
                                                        : "border-zinc-300 hover:border-indigo-400"
                                            )}
                                        >
                                            {allSelected && <Check className="w-4 h-4 text-white" />}
                                            {someSelected && !allSelected && <div className="w-3 h-3 bg-indigo-600 rounded" />}
                                        </div>
                                    </div>
                                </TableHead>
                            )}
                            <TableHead>Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Min Quantity</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => {
                            const isSelected = selectedItems.has(item.id);
                            return (
                                <TableRow
                                    key={item.id}
                                    className={cn(
                                        isSelected && "bg-indigo-50"
                                    )}
                                >
                                    {onItemToggle && (
                                        <TableCell>
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onItemToggle(item.id);
                                                }}
                                                className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                                                title={isSelected ? "Deselect item" : "Select item"}
                                            >
                                                <div
                                                    className={cn(
                                                        "w-6 h-6 rounded border-2 flex items-center justify-center transition-all hover:scale-110",
                                                        isSelected
                                                            ? "bg-indigo-600 border-indigo-600 shadow-sm"
                                                            : "border-zinc-300 hover:border-indigo-400"
                                                    )}
                                                >
                                                    {isSelected && <Check className="w-4 h-4 text-white" />}
                                                </div>
                                            </div>
                                        </TableCell>
                                    )}
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell className="text-zinc-500">
                                        {item.sku || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                            {getCategoryName(item)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-zinc-600">
                                        {item.unit_of_measure}
                                    </TableCell>
                                    <TableCell className="text-zinc-600">
                                        {item.min_quantity}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(item)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    onClick={() => onDelete(item)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => {
                const isSelected = selectedItems.has(item.id);
                return (
                    <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                            "bg-white rounded-xl shadow-sm p-4 border hover:shadow-lg transition-shadow",
                            isSelected ? "border-indigo-500 bg-indigo-50" : "border-zinc-200"
                        )}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {onItemToggle && (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onItemToggle(item.id);
                                        }}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                        title={isSelected ? "Deselect item" : "Select item"}
                                    >
                                        <div
                                            className={cn(
                                                "w-6 h-6 rounded border-2 flex items-center justify-center transition-all hover:scale-110",
                                                isSelected
                                                    ? "bg-indigo-600 border-indigo-600 shadow-sm"
                                                    : "border-zinc-300 hover:border-indigo-400"
                                            )}
                                        >
                                            {isSelected && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                    </div>
                                )}
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <Package className="w-5 h-5 text-indigo-600" />
                                </div>
                            </div>
                            <div className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                {getCategoryName(item)}
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
                );
            })}
        </div>
    );
}

