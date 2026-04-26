"use client";

import { useMemo, useState } from "react";
import { Box, Droplets, Package, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import SearchBar from "@/components/admin/shared/SearchBar";

interface StorageSpace {
    id: string;
    name: string;
    temperature_type: string;
}

interface StoreInventoryMatrixProps {
    storageSpaces: StorageSpace[];
    inventory: any[];
}

const getTemperatureIcon = (type: string) => {
    switch (type) {
        case "frozen":
            return <Snowflake className="w-4 h-4 text-blue-500" />;
        case "refrigerated":
            return <Droplets className="w-4 h-4 text-cyan-500" />;
        default:
            return <Box className="w-4 h-4 text-zinc-500" />;
    }
};

const getStatusColor = (minQty: number, quantity: number) => {
    if (quantity < minQty) return "bg-red-100 border-red-300 text-red-700";
    if (quantity < minQty * 1.2)
        return "bg-amber-100 border-amber-300 text-amber-700";
    return "bg-emerald-100 border-emerald-300 text-emerald-700";
};

export default function StoreInventoryMatrix({
    storageSpaces,
    inventory,
}: StoreInventoryMatrixProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const items = useMemo(() => {
        const map = new Map<string, any>();
        for (const row of inventory) {
            const item = row.items;
            if (!item) continue;
            const id = String(item.id);
            if (!map.has(id)) map.set(id, item);
        }
        return Array.from(map.values());
    }, [inventory]);

    const filteredItems = useMemo(() => {
        if (!searchQuery) return items;
        const q = searchQuery.toLowerCase();
        return items.filter((item) => {
            const name = item.name?.toLowerCase() || "";
            const sku = item.sku?.toLowerCase() || "";
            return name.includes(q) || sku.includes(q);
        });
    }, [items, searchQuery]);

    const getRecord = (itemId: string, storageSpaceId: string) =>
        inventory.find(
            (i) =>
                String(i.item_id) === String(itemId) &&
                i.storage_space_id === storageSpaceId,
        );

    if (inventory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Package size={32} className="text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">
                    No inventory recorded for this store yet
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="max-w-md">
                <SearchBar
                    placeholder="Search items by name or SKU..."
                    onSearch={setSearchQuery}
                />
            </div>

            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="left-0 z-10 bg-white border border-zinc-200 px-4 py-3 text-left text-sm font-semibold text-zinc-900">
                                    Item
                                </th>
                                {storageSpaces.map((space) => (
                                    <th
                                        key={space.id}
                                        className="border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-900 min-w-[120px]"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            {getTemperatureIcon(
                                                space.temperature_type,
                                            )}
                                            <span className="truncate">
                                                {space.name}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                                <th className="border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-900">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={storageSpaces.length + 2}
                                        className="border border-zinc-200 px-4 py-8 text-center text-zinc-500"
                                    >
                                        {searchQuery
                                            ? `No items found matching "${searchQuery}"`
                                            : "No items available"}
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const minQty = item.min_quantity || 0;
                                    const total = storageSpaces.reduce(
                                        (sum, space) =>
                                            sum +
                                            (getRecord(item.id, space.id)
                                                ?.current_quantity || 0),
                                        0,
                                    );
                                    return (
                                        <tr key={item.id}>
                                            <td className="left-0 z-10 bg-white border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-900">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-zinc-400" />
                                                    <span className="truncate">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-zinc-500 mt-1">
                                                    Min: {item.min_quantity}{" "}
                                                    {item.unit_of_measure}
                                                </div>
                                            </td>
                                            {storageSpaces.map((space) => {
                                                const record = getRecord(
                                                    item.id,
                                                    space.id,
                                                );
                                                if (!record) {
                                                    return (
                                                        <td
                                                            key={space.id}
                                                            className="border border-zinc-200 px-4 py-3 text-center text-sm bg-zinc-50/50"
                                                        >
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="text-zinc-300 text-xs font-medium">
                                                                    —
                                                                </span>
                                                                <span className="text-[10px] text-zinc-300">
                                                                    Not stored
                                                                </span>
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                const quantity =
                                                    record.current_quantity ||
                                                    0;
                                                return (
                                                    <td
                                                        key={space.id}
                                                        className={cn(
                                                            "border border-zinc-200 px-4 py-3 text-center text-sm",
                                                            getStatusColor(
                                                                minQty,
                                                                quantity,
                                                            ),
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
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
