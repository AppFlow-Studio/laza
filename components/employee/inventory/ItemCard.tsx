"use client";

import { useState } from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import QuantityUpdateSheet from './QuantityUpdateSheet';
import { motion } from 'framer-motion';

interface ItemCardProps {
    item: any;
    locationId: string;
    storageSpaceId: string;
    onUpdate: () => void;
}

export default function ItemCard({ item, locationId, storageSpaceId, onUpdate }: ItemCardProps) {
    const [showUpdateSheet, setShowUpdateSheet] = useState(false);
    const itemData = item.items;
    const currentQuantity = item.current_quantity || 0;
    const minQuantity = itemData?.min_quantity || 0;
    const isLowStock = currentQuantity < minQuantity;

    const getCategoryColor = (category: string) => {
        if (typeof category === 'object' && category !== null && 'name' in category) {
            category = (category as any).name;
        }
        switch (category?.toLowerCase()) {
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

    const getCategoryName = (category: any) => {
        if (typeof category === 'object' && category !== null && 'name' in category) {
            return (category as any).name;
        }
        return category || 'Unknown';
    };

    return (
        <>
            <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUpdateSheet(true)}
                className={cn(
                    "bg-white rounded-xl p-4 border-2 transition-all cursor-pointer",
                    isLowStock
                        ? "border-red-200 bg-red-50 hover:bg-red-100"
                        : "border-zinc-200 hover:border-indigo-300 hover:shadow-md"
                )}
            >
                <div className="flex items-start gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        isLowStock ? "bg-red-100" : "bg-indigo-100"
                    )}>
                        <Package className={cn(
                            "w-5 h-5",
                            isLowStock ? "text-red-600" : "text-indigo-600"
                        )} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-zinc-900 truncate">{itemData?.name || 'Unknown'}</h3>
                            {isLowStock && (
                                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                        </div>
                        {itemData?.sku && (
                            <p className="text-xs text-zinc-500 mb-1">SKU: {itemData.sku}</p>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                            {itemData?.category && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium",
                                    getCategoryColor(itemData.category)
                                )}>
                                    {getCategoryName(itemData.category)}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-zinc-600 mb-1">Current Quantity</p>
                                <p className={cn(
                                    "text-2xl font-bold",
                                    isLowStock ? "text-red-600" : "text-indigo-600"
                                )}>
                                    {currentQuantity.toFixed(2)}
                                </p>
                                <p className="text-xs text-zinc-500">{itemData?.unit_of_measure || ''}</p>
                            </div>
                            {minQuantity > 0 && (
                                <div className="text-right">
                                    <p className="text-xs text-zinc-600 mb-1">Min Required</p>
                                    <p className="text-sm font-medium text-zinc-900">{minQuantity}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {showUpdateSheet && (
                <QuantityUpdateSheet
                    item={itemData}
                    currentQuantity={currentQuantity}
                    locationId={locationId}
                    storageSpaceId={storageSpaceId}
                    isOpen={showUpdateSheet}
                    onClose={() => setShowUpdateSheet(false)}
                    onSuccess={() => {
                        setShowUpdateSheet(false);
                        onUpdate();
                    }}
                />
            )}
        </>
    );
}

