"use client";

import { useState } from 'react';
import { Sheet } from 'react-modal-sheet';
import { StorageSpace } from '@/lib/supabase/types';
import { useStorageSpaceItems, useStorageSpaceLogs } from '@/lib/hooks/queries/useEmployee';
import { Package, History, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ItemCard from '@/components/employee/inventory/ItemCard';
import InventoryLogCard from '@/components/employee/inventory/InventoryLogCard';
import SearchBar from '@/components/admin/shared/SearchBar';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';

interface StorageSpaceSheetProps {
    storageSpace: StorageSpace;
    locationId: string;
    isOpen: boolean;
    onClose: () => void;
    onRefresh?: () => void;
}

export default function StorageSpaceSheet({
    storageSpace,
    locationId,
    isOpen,
    onClose,
    onRefresh,
}: StorageSpaceSheetProps) {
    console.log(isOpen);
    const [activeTab, setActiveTab] = useState<'items' | 'logs'>('items');
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useStorageSpaceItems(storageSpace.id);
    const { data: logs, isLoading: logsLoading } = useStorageSpaceLogs(storageSpace.id, 50);

    const filteredItems = items?.filter((item: any) => {
        if (!debouncedSearch) return true;
        const searchLower = debouncedSearch.toLowerCase();
        const itemName = item.items?.name?.toLowerCase() || '';
        const itemSku = item.items?.sku?.toLowerCase() || '';
        return itemName.includes(searchLower) || itemSku.includes(searchLower);
    }) || [];

    const getTemperatureIcon = (type: string) => {
        switch (type) {
            case 'frozen':
                return '🧊';
            case 'refrigerated':
                return '❄️';
            case 'dry':
                return '📦';
            default:
                return '📦';
        }
    };

    return (
        <Sheet isOpen={isOpen} onClose={onClose} snapPoints={[0, 0.45, 0.75, 0.95, 1]} initialSnap={3}>
            <Sheet.Container>
                <Sheet.Header />
                <Sheet.Content>
                    <div className="flex flex-col h-full bg-white rounded-t-2xl ">
                        {/* Header */}
                        <div className="px-4 pt-4 pb-3 border-b border-zinc-200 flex-shrink-0">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-zinc-900 mb-1">{storageSpace.name}</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{getTemperatureIcon(storageSpace.temperature_type)}</span>
                                        <span className="text-sm text-zinc-600 capitalize">
                                            {storageSpace.temperature_type}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-600" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'items' | 'logs')} className="flex-1 flex flex-col min-h-0">
                            <div className="px-4 pt-3 border-b border-zinc-200 flex-shrink-0">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="items" className="flex items-center gap-2">
                                        <Package className="w-4 h-4" />
                                        Items
                                    </TabsTrigger>
                                    <TabsTrigger value="logs" className="flex items-center gap-2">
                                        <History className="w-4 h-4" />
                                        Logs
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Items Tab */}
                            <TabsContent value="items" className="flex-1 flex flex-col min-h-0 mt-0">
                                <div className="px-4 pt-3 flex-shrink-0">
                                    <SearchBar
                                        placeholder="Search items..."
                                        onSearch={setSearchQuery}
                                    />
                                </div>
                                <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
                                    {itemsLoading ? (
                                        <LoadingSkeleton />
                                    ) : filteredItems.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                                            <p className="text-zinc-500">
                                                {searchQuery ? 'No items found' : 'No items in this storage space'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredItems.map((item: any, index: number) => (
                                                <motion.div
                                                    key={item.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                >
                                                    <ItemCard
                                                        item={item}
                                                        locationId={locationId}
                                                        storageSpaceId={storageSpace.id}
                                                        onUpdate={() => {
                                                            refetchItems();
                                                            onRefresh?.();
                                                        }}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Logs Tab */}
                            <TabsContent value="logs" className="flex-1 flex flex-col min-h-0 mt-0">
                                <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
                                    {logsLoading ? (
                                        <LoadingSkeleton />
                                    ) : !logs || logs.length === 0 ? (
                                        <div className="text-center py-12">
                                            <History className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                                            <p className="text-zinc-500">No activity yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {logs.map((log: any, index: number) => (
                                                <motion.div
                                                    key={log.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                >
                                                    <InventoryLogCard log={log} />
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </Sheet.Content>
            </Sheet.Container>
            <Sheet.Backdrop onTap={onClose} />
        </Sheet>
    );
}

