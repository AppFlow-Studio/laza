"use client";

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Package, Snowflake, Droplets, Box } from 'lucide-react';

interface InventoryMatrixProps {
    items: any[];
    storageSpaces: any[];
    inventory: any[];
    onCellClick: (itemId: string, storageSpaceId: string | null) => void;
}

export default function InventoryMatrix({ items, storageSpaces, inventory, onCellClick }: InventoryMatrixProps) {
    const getQuantity = (itemId: string, storageSpaceId: string | null) => {
        const inv = inventory.find(
            (i) => i.item_id === itemId && i.storage_space_id === storageSpaceId
        );
        return inv?.current_quantity || 0;
    };

    const getStatusColor = (item: any, quantity: number) => {
        const minQty = item.min_quantity || 0;
        if (quantity < minQty) return 'bg-red-100 border-red-300 text-red-700';
        if (quantity < minQty * 1.2) return 'bg-amber-100 border-amber-300 text-amber-700';
        return 'bg-emerald-100 border-emerald-300 text-emerald-700';
    };

    const getTemperatureIcon = (type: string) => {
        switch (type) {
            case 'frozen':
                return <Snowflake className="w-4 h-4 text-blue-500" />;
            case 'refrigerated':
                return <Droplets className="w-4 h-4 text-cyan-500" />;
            default:
                return <Box className="w-4 h-4 text-zinc-500" />;
        }
    };

    return (
        <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-10 bg-white border border-zinc-200 px-4 py-3 text-left text-sm font-semibold text-zinc-900">
                                Item
                            </th>
                            {storageSpaces.map((space) => (
                                <th
                                    key={space.id}
                                    className="border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-900 min-w-[120px]"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        {getTemperatureIcon(space.temperature_type)}
                                        <span className="truncate">{space.name}</span>
                                    </div>
                                </th>
                            ))}
                            <th className="border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-900">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => {
                            const total = storageSpaces.reduce(
                                (sum, space) => sum + getQuantity(item.id, space.id),
                                0
                            );
                            return (
                                <tr key={item.id}>
                                    <td className="sticky left-0 z-10 bg-white border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-4 h-4 text-zinc-400" />
                                            <span className="truncate">{item.name}</span>
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-1">
                                            Min: {item.min_quantity} {item.unit_of_measure}
                                        </div>
                                    </td>
                                    {storageSpaces.map((space) => {
                                        const quantity = getQuantity(item.id, space.id);
                                        return (
                                            <td
                                                key={space.id}
                                                onClick={() => onCellClick(item.id, space.id)}
                                                className={cn(
                                                    "border border-zinc-200 px-4 py-3 text-center text-sm cursor-pointer transition-colors hover:bg-zinc-50",
                                                    getStatusColor(item, quantity)
                                                )}
                                            >
                                                {quantity.toFixed(2)}
                                            </td>
                                        );
                                    })}
                                    <td className="border border-zinc-200 px-4 py-3 text-center text-sm font-semibold bg-zinc-50">
                                        {total.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

