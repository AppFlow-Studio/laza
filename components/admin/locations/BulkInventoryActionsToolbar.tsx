"use client";

import { Button } from '@/components/ui/button';
import { Settings, Trash2, X, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkInventoryActionsToolbarProps {
    selectedCount: number;
    onSetQuantity: () => void;
    onSetMinOverride: () => void;
    onBulkUpdate: () => void;
    onRemoveFromStorage: () => void;
    onClearSelection: () => void;
    isLoading?: boolean;
}

export default function BulkInventoryActionsToolbar({
    selectedCount,
    onSetQuantity,
    onSetMinOverride,
    onBulkUpdate,
    onRemoveFromStorage,
    onClearSelection,
    isLoading = false,
}: BulkInventoryActionsToolbarProps) {
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
                        onClick={onSetQuantity}
                        disabled={isLoading}
                        className="text-xs"
                    >
                        <Package className="w-4 h-4 mr-1" />
                        Set Quantity
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onSetMinOverride}
                        disabled={isLoading}
                        className="text-xs"
                    >
                        Set Min Override
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
                        onClick={onRemoveFromStorage}
                        disabled={isLoading}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove from Storage
                    </Button>
                </div>
            </div>
        </div>
    );
}

