"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Package, Edit, History, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { useStorageSpace, useInventoryByStorageSpace, useInventoryLogsByStorageSpace } from '@/lib/hooks/queries/useStorageSpace';
import { useBulkUpdateInventory } from '@/lib/hooks/queries/useInventory';
import { useAdminStore } from '@/lib/stores/adminStore';
import { useDebounce } from '@/lib/hooks/useDebounce';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import QuantityUpdateModal from '@/components/admin/inventory/QuantityUpdateModal';
import InventoryLogsList from '@/components/admin/locations/InventoryLogsList';
import SearchBar from '@/components/admin/shared/SearchBar';
import FilterDropdown from '@/components/admin/shared/FilterDropdown';
import { useCategories } from '@/lib/hooks/queries/useCategories';
import { cn } from '@/lib/utils';
import { Grid, List } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import BulkInventoryActionsToolbar from '@/components/admin/locations/BulkInventoryActionsToolbar';
import BulkInventoryUpdateModal from '@/components/admin/locations/BulkInventoryUpdateModal';

export default function StorageSpaceDetailPage() {
    const params = useParams();
    const storageSpaceId = params.storageId as string;

    const { viewMode, setViewMode } = useAdminStore();

    const { data: storageSpace, isLoading: storageSpaceLoading } = useStorageSpace(storageSpaceId);
    const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } = useInventoryByStorageSpace(storageSpaceId);
    const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useInventoryLogsByStorageSpace(storageSpaceId, 50);
    const { data: categories } = useCategories();

    const [activeTab, setActiveTab] = useState('items');
    const [editingItem, setEditingItem] = useState<{
        itemId: string;
        quantity: number;
        itemName: string;
        minQuantityOverride?: number | null;
        itemMinQuantity?: number;
    } | null>(null);
    const [selectedInventoryItems, setSelectedInventoryItems] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [showBulkInventoryUpdateModal, setShowBulkInventoryUpdateModal] = useState(false);
    const [bulkInventoryUpdateField, setBulkInventoryUpdateField] = useState<'quantity' | 'minOverride' | 'all'>('all');
    const debouncedSearch = useDebounce(searchQuery, 300);

    const bulkUpdateInventoryMutation = useBulkUpdateInventory();

    const handleQuantityUpdate = () => {
        setEditingItem(null);
        refetchInventory();
        refetchLogs();
    };

    const handleInventoryToggle = (itemId: string) => {
        const newSelected = new Set(selectedInventoryItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedInventoryItems(newSelected);
    };

    const handleBulkInventoryUpdateSuccess = () => {
        setShowBulkInventoryUpdateModal(false);
        setSelectedInventoryItems(new Set());
        refetchInventory();
        refetchLogs();
    };

    const filteredInventory = inventory?.filter((inv: any) => {
        const item = inv.items;
        if (!item) return false;

        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch =
                item.name?.toLowerCase().includes(searchLower) ||
                (item.sku && item.sku.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
        }

        if (categoryFilter) {
            const itemCategoryId = typeof item.category === 'object' && item.category !== null && 'id' in item.category
                ? (item.category as any).id
                : null;
            if (itemCategoryId !== categoryFilter) return false;
        }

        return true;
    }) || [];

    const getCategoryName = (item: any) => {
        if (typeof item.category === 'object' && item.category !== null && 'name' in item.category) {
            return (item.category as any).name;
        }
        return item.category;
    };

    const getCategoryColor = (category: string) => {
        switch (category?.toLowerCase()) {
            case 'desserts': return 'bg-purple-50 text-purple-600';
            case 'ingredients': return 'bg-blue-50 text-blue-600';
            case 'supplies': return 'bg-amber-50 text-amber-600';
            default: return 'bg-zinc-50 text-zinc-600';
        }
    };

    if (storageSpaceLoading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton className="h-12 w-64" />
                <LoadingSkeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!storageSpace) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-500">Storage space not found</p>
                <Link href="/admin">
                    <Button className="mt-4">Back to Dashboard</Button>
                </Link>
            </div>
        );
    }

    const location = storageSpace.location;
    const address = typeof location.address === 'string'
        ? JSON.parse(location.address)
        : location.address;

    return (
        <div className="space-y-6">
            {/* Storage Space Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <div className="flex items-center gap-3 mb-2">
                    <Package className="w-6 h-6 text-indigo-600" />
                    <h1 className="text-2xl font-semibold text-zinc-900">{storageSpace.name}</h1>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-600 capitalize">
                        {storageSpace.temperature_type}
                    </span>
                </div>
                <p className="text-zinc-600">
                    {location.name} • {address.street}, {address.city}, {address.state}
                </p>
            </div>

            {/* Items and Logs Tabs */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger value="items" className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Items
                            </TabsTrigger>
                            <TabsTrigger value="logs" className="flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Inventory Logs
                            </TabsTrigger>
                        </TabsList>
                        {activeTab === 'items' && (
                            <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn("p-2 rounded", viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-zinc-600')}
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn("p-2 rounded", viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-zinc-600')}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <TabsContent value="items" className="mt-0">
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex-1">
                                <SearchBar placeholder="Search items..." onSearch={setSearchQuery} />
                            </div>
                            <FilterDropdown
                                label="Category"
                                options={categories?.map((category) => ({ value: category.id, label: category.name })) || []}
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                            />
                        </div>

                        <BulkInventoryActionsToolbar
                            selectedCount={selectedInventoryItems.size}
                            onSetQuantity={() => {
                                setBulkInventoryUpdateField('quantity');
                                setShowBulkInventoryUpdateModal(true);
                            }}
                            onSetMinOverride={() => {
                                setBulkInventoryUpdateField('minOverride');
                                setShowBulkInventoryUpdateModal(true);
                            }}
                            onBulkUpdate={() => {
                                setBulkInventoryUpdateField('all');
                                setShowBulkInventoryUpdateModal(true);
                            }}
                            onClearSelection={() => setSelectedInventoryItems(new Set())}
                            isLoading={bulkUpdateInventoryMutation.isPending}
                        />

                        {inventoryLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-zinc-500">Loading items...</p>
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                                <p className="text-zinc-500">No items in this storage space</p>
                            </div>
                        ) : viewMode === 'list' ? (
                            <div className="space-y-2">
                                {filteredInventory.map((inv: any) => {
                                    const item = inv.items;
                                    const isLowStock = item && inv.current_quantity <= (inv.min_quantity_override || item.min_quantity || 0);
                                    const isSelected = selectedInventoryItems.has(inv.item_id);
                                    return (
                                        <div
                                            key={inv.id}
                                            className={cn(
                                                "flex items-center justify-between p-4 bg-zinc-50 rounded-lg border transition-colors",
                                                isLowStock && "border-red-200 bg-red-50",
                                                isSelected && "border-indigo-500 bg-indigo-50",
                                                !isSelected && "cursor-pointer hover:bg-zinc-100"
                                            )}
                                        >
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleInventoryToggle(inv.item_id);
                                                }}
                                                className="cursor-pointer mr-3 hover:opacity-80 transition-opacity"
                                                title={isSelected ? "Deselect item" : "Select item"}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded border-2 flex items-center justify-center transition-all hover:scale-110",
                                                    isSelected ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-zinc-300 hover:border-indigo-400"
                                                )}>
                                                    {isSelected && <Check className="w-4 h-4 text-white" />}
                                                </div>
                                            </div>
                                            <div
                                                className="flex-1"
                                                onClick={() => {
                                                    if (selectedInventoryItems.size === 0) {
                                                        setEditingItem({ itemId: inv.item_id, quantity: inv.current_quantity, itemName: item?.name, minQuantityOverride: inv.min_quantity_override ?? null, itemMinQuantity: item?.min_quantity });
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-zinc-900">{item?.name || 'Unknown'}</h3>
                                                    {isLowStock && <AlertTriangle className="w-4 h-4 text-red-600" />}
                                                    {item?.category && (
                                                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                                            {getCategoryName(item)}
                                                        </span>
                                                    )}
                                                </div>
                                                {item?.sku && <p className="text-xs text-zinc-500 mb-1">SKU: {item.sku}</p>}
                                                <p className="text-sm text-zinc-600">
                                                    Quantity: <span className="font-semibold">{inv.current_quantity}</span> {item?.unit_of_measure || ''}
                                                    {(() => {
                                                        const minQty = inv.min_quantity_override ?? item?.min_quantity ?? 0;
                                                        return minQty > 0 ? <span className="text-zinc-400"> • Min: {minQty}</span> : null;
                                                    })()}
                                                </p>
                                            </div>
                                            {selectedInventoryItems.size === 0 && (
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingItem({ itemId: inv.item_id, quantity: inv.current_quantity, itemName: item?.name, minQuantityOverride: inv.min_quantity_override ?? null, itemMinQuantity: item?.min_quantity });
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredInventory.map((inv: any) => {
                                    const item = inv.items;
                                    const isLowStock = item && inv.current_quantity <= (inv.min_quantity_override || item.min_quantity_override || item.min_quantity || 0);
                                    const isSelected = selectedInventoryItems.has(inv.item_id);
                                    return (
                                        <div
                                            key={inv.id}
                                            className={cn(
                                                "p-4 bg-zinc-50 rounded-lg border",
                                                isLowStock && "border-red-200 bg-red-50",
                                                isSelected && "border-indigo-500 bg-indigo-50"
                                            )}
                                        >
                                            <div
                                                onClick={() => handleInventoryToggle(inv.item_id)}
                                                className="cursor-pointer mb-2 hover:opacity-80 transition-opacity"
                                                title={isSelected ? "Deselect item" : "Select item"}
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded border-2 flex items-center justify-center transition-all hover:scale-110",
                                                    isSelected ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-zinc-300 hover:border-indigo-400"
                                                )}>
                                                    {isSelected && <Check className="w-4 h-4 text-white" />}
                                                </div>
                                            </div>
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Package className="w-5 h-5 text-indigo-600" />
                                                        <h3 className="font-semibold text-zinc-900">{item?.name || 'Unknown'}</h3>
                                                        {isLowStock && <AlertTriangle className="w-4 h-4 text-red-600" />}
                                                    </div>
                                                    {item?.category && (
                                                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                                            {getCategoryName(item)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {item?.sku && <p className="text-xs text-zinc-500 mb-2">SKU: {item.sku}</p>}
                                            <p className="text-sm text-zinc-600 mb-3">
                                                Quantity: <span className="font-semibold">{inv.current_quantity}</span> {item?.unit_of_measure || ''}
                                                {(() => {
                                                    const minQty = inv.min_quantity_override ?? item?.min_quantity ?? 0;
                                                    return minQty > 0 ? <span className="text-zinc-400"> • Min: {minQty}</span> : null;
                                                })()}
                                            </p>
                                            <Button
                                                onClick={() => setEditingItem({ itemId: inv.item_id, quantity: inv.current_quantity, itemName: item?.name, minQuantityOverride: inv.min_quantity_override ?? null, itemMinQuantity: item?.min_quantity })}
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit Quantity
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="logs" className="mt-0">
                        <InventoryLogsList
                            logs={logs || []}
                            isLoading={logsLoading}
                            onRefresh={refetchLogs}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Quantity Modal */}
            {editingItem && (
                <MobileSheet
                    isOpen={!!editingItem}
                    snapPoints={[0, 0.7, 0.95, 1]}
                    onClose={() => setEditingItem(null)}
                    title={`Edit Quantity of ${editingItem.itemName}`}
                >
                    <QuantityUpdateModal
                        itemId={editingItem.itemId}
                        locationId={storageSpace.location.id}
                        storageSpaceId={storageSpaceId}
                        currentQuantity={editingItem.quantity}
                        currentMinQuantityOverride={editingItem.minQuantityOverride || null}
                        itemMinQuantity={editingItem.itemMinQuantity}
                        onSuccess={handleQuantityUpdate}
                    />
                </MobileSheet>
            )}

            {/* Bulk Inventory Update Modal */}
            {showBulkInventoryUpdateModal && selectedInventoryItems.size > 0 && inventory && (
                <MobileSheet
                    isOpen={showBulkInventoryUpdateModal}
                    onClose={() => setShowBulkInventoryUpdateModal(false)}
                    title="Bulk Update Inventory"
                    snapPoints={[0, 0.6, 0.9]}
                >
                    <BulkInventoryUpdateModal
                        selectedItems={filteredInventory
                            .filter((inv: any) => selectedInventoryItems.has(inv.item_id))
                            .map((inv: any) => ({
                                itemId: inv.item_id,
                                locationId: storageSpace.location.id,
                                storageSpaceId,
                                currentQuantity: inv.current_quantity,
                                itemName: inv.items?.name || 'Unknown',
                            }))}
                        selectedCount={selectedInventoryItems.size}
                        updateField={bulkInventoryUpdateField}
                        onSuccess={handleBulkInventoryUpdateSuccess}
                        onCancel={() => setShowBulkInventoryUpdateModal(false)}
                    />
                </MobileSheet>
            )}
        </div>
    );
}
