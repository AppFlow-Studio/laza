"use client";

import { Button } from '@/components/ui/button';
import { Settings, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionsToolbarProps {
    selectedCount: number;
    onUpdateMinQuantity: () => void;
    onUpdateCategory: () => void;
    onUpdateUnit: () => void;
    onBulkUpdate: () => void;
    onDelete: () => void;
    onClearSelection: () => void;
    isLoading?: boolean;
}

export default function BulkActionsToolbar({
    selectedCount,
    onUpdateMinQuantity,
    onUpdateCategory,
    onUpdateUnit,
    onBulkUpdate,
    onDelete,
    onClearSelection,
    isLoading = false,
}: BulkActionsToolbarProps) {
    if (selectedCount === 0) {
        return (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-4">
                <p className="text-sm text-indigo-700">
                    <strong>Tip:</strong> Select items using the checkboxes to perform bulk actions
                </p>
            </div>
        );
    }

    return (
        <div className="sticky top-0 z-20 bg-white border-b-2 border-indigo-500 shadow-lg px-4 py-3 mb-4 rounded-lg">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-900">
                        {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearSelection}
                        className="text-zinc-600 hover:text-zinc-900"
                    >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                    </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onUpdateMinQuantity}
                        disabled={isLoading}
                        className="text-xs"
                    >
                        Update Min Qty
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onUpdateCategory}
                        disabled={isLoading}
                        className="text-xs"
                    >
                        Update Category
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onUpdateUnit}
                        disabled={isLoading}
                        className="text-xs"
                    >
                        Update Unit
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onBulkUpdate}
                        disabled={isLoading}
                        className="text-xs"
                    >
                        <Settings className="w-4 h-4 mr-1" />
                        Bulk Update
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDelete}
                        disabled={isLoading}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}

