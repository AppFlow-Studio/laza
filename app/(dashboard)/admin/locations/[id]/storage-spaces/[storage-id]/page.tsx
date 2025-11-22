"use client";

import { useState, useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Package, Edit, History, AlertTriangle, Settings, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { useStorageSpace, useInventoryByStorageSpace, useInventoryLogsByStorageSpace, useUpdateStorageSpace, useDeleteStorageSpace } from '@/lib/hooks/queries/useStorageSpace';
import { useBulkAssignItems } from '@/lib/hooks/queries/useStorageSetup';
import { useUpdateQuantity, useBulkUpdateInventory, useBulkRemoveItems } from '@/lib/hooks/queries/useInventory';
import { useAdminStore } from '@/lib/stores/adminStore';
import { useDebounce } from '@/lib/hooks/useDebounce';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import QuantityUpdateModal from '@/components/admin/inventory/QuantityUpdateModal';
import AddItemsToStorageSpace from '@/components/admin/locations/AddItemsToStorageSpace';
import InventoryLogsList from '@/components/admin/locations/InventoryLogsList';
import SearchBar from '@/components/admin/shared/SearchBar';
import FilterDropdown from '@/components/admin/shared/FilterDropdown';
import { useCategories } from '@/lib/hooks/queries/useCategories';
import { useUser } from '@clerk/nextjs';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Grid, List } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import EditStorageSpaceModal from '@/components/admin/locations/EditStorageSpaceModal';
import BulkInventoryActionsToolbar from '@/components/admin/locations/BulkInventoryActionsToolbar';
import BulkInventoryUpdateModal from '@/components/admin/locations/BulkInventoryUpdateModal';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function StorageSpaceDetailPage() {
    const params = useParams();
    const pathname = usePathname();

    // Extract IDs from nested route: /admin/locations/[locationId]/storage-spaces/[storageSpaceId]
    // Use pathname to reliably extract both IDs
    const [actualLocationId, actualStorageSpaceId] = useMemo(() => {
        const segments = pathname.split('/');
        const locIndex = segments.indexOf('locations');
        const storageIndex = segments.indexOf('storage-spaces');
        return [
            locIndex >= 0 ? segments[locIndex + 1] : '',
            storageIndex >= 0 ? segments[storageIndex + 1] : ''
        ];
    }, [pathname]);

    const { user } = useUser();
    const { viewMode, setViewMode } = useAdminStore();

    const { data: storageSpace, isLoading: storageSpaceLoading } = useStorageSpace(actualStorageSpaceId);
    const { data: inventory, isLoading: inventoryLoading, refetch: refetchInventory } = useInventoryByStorageSpace(actualStorageSpaceId);
    const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useInventoryLogsByStorageSpace(actualStorageSpaceId, 50);
    const { data: categories } = useCategories();
    const updateStorageSpaceMutation = useUpdateStorageSpace();
    const deleteStorageSpaceMutation = useDeleteStorageSpace();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('items');
    const [showAddItems, setShowAddItems] = useState(false);
    const [editingItem, setEditingItem] = useState<{
        itemId: string;
        quantity: number;
        itemName: string;
        minQuantityOverride?: number | null;
        itemMinQuantity?: number;
    } | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [selectedInventoryItems, setSelectedInventoryItems] = useState<Set<string>>(new Set());
    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
    const [itemMinQuantityOverrides, setItemMinQuantityOverrides] = useState<Record<string, number | null>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showBulkInventoryUpdateModal, setShowBulkInventoryUpdateModal] = useState(false);
    const [bulkInventoryUpdateField, setBulkInventoryUpdateField] = useState<'quantity' | 'minOverride' | 'all'>('all');
    const [showBulkRemoveDialog, setShowBulkRemoveDialog] = useState(false);
    const debouncedSearch = useDebounce(searchQuery, 300);

    const bulkAssignMutation = useBulkAssignItems();
    const bulkUpdateInventoryMutation = useBulkUpdateInventory();
    const bulkRemoveItemsMutation = useBulkRemoveItems();

    // Get existing item IDs in this storage space
    const existingItemIds = new Set(inventory?.map((inv: any) => inv.item_id) || []);

    const handleItemToggle = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
            const newQuantities = { ...itemQuantities };
            const newOverrides = { ...itemMinQuantityOverrides };
            delete newQuantities[itemId];
            delete newOverrides[itemId];
            setItemQuantities(newQuantities);
            setItemMinQuantityOverrides(newOverrides);
        } else {
            newSelected.add(itemId);
            setItemQuantities({ ...itemQuantities, [itemId]: 0 });
            setItemMinQuantityOverrides({ ...itemMinQuantityOverrides, [itemId]: null });
        }
        setSelectedItems(newSelected);
    };

    const handleQuantityChange = (itemId: string, quantity: number) => {
        setItemQuantities({ ...itemQuantities, [itemId]: quantity });
    };

    const handleMinQuantityOverrideChange = (itemId: string, override: number | null) => {
        setItemMinQuantityOverrides({ ...itemMinQuantityOverrides, [itemId]: override });
    };

    const handleAddItems = async () => {
        if (selectedItems.size === 0) {
            toast.error('Please select at least one item');
            return;
        }

        if (!storageSpace) {
            toast.error('Storage space not found');
            return;
        }

        const itemsToAssign = Array.from(selectedItems).map(itemId => ({
            itemId,
            quantity: itemQuantities[itemId] || 0,
            minQuantityOverride: itemMinQuantityOverrides[itemId] ?? null,
        }));

        const invalidItems = itemsToAssign.filter(item => item.quantity < 0);
        if (invalidItems.length > 0) {
            toast.error('Please enter valid quantities (0 or greater)');
            return;
        }

        try {
            await bulkAssignMutation.mutateAsync({
                locationId: storageSpace.location.id,
                storageSpaceId: actualStorageSpaceId,
                items: itemsToAssign,
            });
            toast.success(`Successfully added ${selectedItems.size} item(s) to storage space`);
            setSelectedItems(new Set());
            setItemQuantities({});
            setItemMinQuantityOverrides({});
            setShowAddItems(false);
            refetchInventory();
            refetchLogs();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add items');
        }
    };

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

    const handleSelectAllInventory = (select: boolean) => {
        if (select) {
            const allItemIds = new Set(filteredInventory.map((inv: any) => inv.item_id));
            setSelectedInventoryItems(allItemIds);
        } else {
            setSelectedInventoryItems(new Set());
        }
    };

    const handleBulkRemoveItems = async () => {
        try {
            await bulkRemoveItemsMutation.mutateAsync({
                itemIds: Array.from(selectedInventoryItems),
                locationId: storageSpace.location.id,
                storageSpaceId: actualStorageSpaceId,
            });
            toast.success(`Successfully removed ${selectedInventoryItems.size} item${selectedInventoryItems.size !== 1 ? 's' : ''} from storage space`);
            setSelectedInventoryItems(new Set());
            setShowBulkRemoveDialog(false);
            refetchInventory();
            refetchLogs();
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove items');
        }
    };

    const handleBulkInventoryUpdateSuccess = () => {
        setShowBulkInventoryUpdateModal(false);
        setSelectedInventoryItems(new Set());
        refetchInventory();
        refetchLogs();
    };


    // Filter inventory items
    const filteredInventory = inventory?.filter((inv: any) => {
        const item = inv.items;
        if (!item) return false;

        // Search filter
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch =
                item.name?.toLowerCase().includes(searchLower) ||
                (item.sku && item.sku.toLowerCase().includes(searchLower));
            if (!matchesSearch) return false;
        }

        // Category filter
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
                <Link href={`/admin/locations/${actualLocationId}`}>
                    <Button className="mt-4">Back to Location</Button>
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
            {/* Breadcrumb Navigation */}
            <nav className="mb-6" aria-label="Breadcrumb">
                <ol className="flex items-center text-sm text-zinc-600 space-x-2">
                    <li>
                        <Link href="/admin/locations" className="flex items-center hover:underline">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Locations
                        </Link>
                    </li>
                    <li>
                        <span className="mx-2 text-zinc-400">/</span>
                    </li>
                    <li>
                        <Link href={`/admin/locations/${actualLocationId}`} className="hover:underline">
                            {location.name}
                        </Link>
                    </li>
                    <li>
                        <span className="mx-2 text-zinc-400">/</span>
                    </li>
                    <li className="truncate font-semibold text-zinc-900">
                        {storageSpace.name}
                    </li>
                </ol>
            </nav>

            {/* Storage Space Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
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
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEditModal(true)}
                            className="flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDeleteDialog(true)}
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            {/* Items and Logs Tabs */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200 ">
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
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={cn(
                                            "p-2 rounded",
                                            viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-zinc-600'
                                        )}
                                    >
                                        <Grid className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={cn(
                                            "p-2 rounded",
                                            viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-zinc-600'
                                        )}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                                <Button
                                    onClick={() => setShowAddItems(true)}
                                    size="sm"
                                    className=" items-center gap-2 sm:flex hidden"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Items
                                </Button>
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={() => setShowAddItems(true)}
                        size="sm"
                        className=" items-center gap-2 mb-2 flex sm:hidden"
                    >
                        <Plus className="w-4 h-4" />
                        Add Items
                    </Button>

                    <TabsContent value="items" className="mt-0">


                        {/* Search and Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex-1">
                                <SearchBar
                                    placeholder="Search items..."
                                    onSearch={setSearchQuery}
                                />
                            </div>
                            <FilterDropdown
                                label="Category"
                                options={categories?.map((category) => ({ value: category.id, label: category.name })) || []}
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                            />
                        </div>

                        {/* Bulk Actions Toolbar */}
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
                            onRemoveFromStorage={() => setShowBulkRemoveDialog(true)}
                            onClearSelection={() => setSelectedInventoryItems(new Set())}
                            isLoading={bulkUpdateInventoryMutation.isPending || bulkRemoveItemsMutation.isPending}
                        />
                        {/* Items List/Grid */}
                        {inventoryLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-zinc-500">Loading items...</p>
                            </div>
                        ) : filteredInventory.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                                <p className="text-zinc-500 mb-4">No items in this storage space</p>
                                <Button
                                    onClick={() => setShowAddItems(true)}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Items
                                </Button>
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
                                                    {isLowStock && (
                                                        <AlertTriangle className="w-4 h-4 text-red-600" />
                                                    )}
                                                    {item?.category && (
                                                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                                            {getCategoryName(item)}
                                                        </span>
                                                    )}
                                                </div>
                                                {item?.sku && (
                                                    <p className="text-xs text-zinc-500 mb-1">SKU: {item.sku}</p>
                                                )}
                                                <p className="text-sm text-zinc-600">
                                                    Quantity: <span className="font-semibold">{inv.current_quantity}</span> {item?.unit_of_measure || ''}
                                                    {(() => {
                                                        const minQty = inv.min_quantity_override ?? item?.min_quantity ?? 0;
                                                        return minQty > 0 ? (
                                                            <span className="text-zinc-400"> • Min: {minQty}</span>
                                                        ) : null;
                                                    })()}
                                                </p>
                                            </div>
                                            {selectedInventoryItems.size === 0 && (
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingItem({
                                                            itemId: inv.item_id,
                                                            quantity: inv.current_quantity,
                                                            itemName: item?.name,
                                                            minQuantityOverride: inv.min_quantity_override ?? null,
                                                            itemMinQuantity: item?.min_quantity
                                                        });
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
                                    const isLowStock = item && inv.current_quantity <= (inv.min_quantity_override || item.min_quantity || 0);
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
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Package className="w-5 h-5 text-indigo-600" />
                                                        <h3 className="font-semibold text-zinc-900">{item?.name || 'Unknown'}</h3>
                                                        {isLowStock && (
                                                            <AlertTriangle className="w-4 h-4 text-red-600" />
                                                        )}
                                                    </div>
                                                    {item?.category && (
                                                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                                            {getCategoryName(item)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {item?.sku && (
                                                <p className="text-xs text-zinc-500 mb-2">SKU: {item.sku}</p>
                                            )}
                                            <p className="text-sm text-zinc-600">
                                                Quantity: <span className="font-semibold">{inv.current_quantity}</span> {item?.unit_of_measure || ''}
                                                {(() => {
                                                    const minQty = inv.min_quantity_override ?? item?.min_quantity ?? 0;
                                                    return minQty > 0 ? (
                                                        <span className="text-zinc-400"> • Min: {minQty}</span>
                                                    ) : null;
                                                })()}
                                            </p>
                                            <Button
                                                onClick={() => setEditingItem({
                                                    itemId: inv.item_id,
                                                    quantity: inv.current_quantity,
                                                    itemName: item?.name,
                                                    minQuantityOverride: inv.min_quantity_override ?? null,
                                                    itemMinQuantity: item?.min_quantity
                                                })}
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

            {/* Add Items Bottom Sheet */}
            <MobileSheet
                isOpen={showAddItems}
                onClose={() => {
                    setShowAddItems(false);
                    setSelectedItems(new Set());
                    setItemQuantities({});
                }}
                title="Add Items to Storage Space"
                snapPoints={[0, 0.7, 0.95, 1]}
                footer={
                    selectedItems.size > 0 ? (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAddItems(false);
                                    setSelectedItems(new Set());
                                    setItemQuantities({});
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddItems}
                                className="flex-1"
                                disabled={bulkAssignMutation.isPending}
                            >
                                {bulkAssignMutation.isPending ? 'Adding...' : `Add ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''}`}
                            </Button>
                        </div>
                    ) : undefined
                }
            >
                <AddItemsToStorageSpace
                    existingItemIds={existingItemIds}
                    selectedItems={selectedItems}
                    itemQuantities={itemQuantities}
                    itemMinQuantityOverrides={itemMinQuantityOverrides}
                    onItemToggle={handleItemToggle}
                    onQuantityChange={handleQuantityChange}
                    onMinQuantityOverrideChange={handleMinQuantityOverrideChange}
                    isLoading={bulkAssignMutation.isPending}
                />
            </MobileSheet>

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
                        storageSpaceId={actualStorageSpaceId}
                        currentQuantity={editingItem.quantity}
                        currentMinQuantityOverride={editingItem.minQuantityOverride || null}
                        itemMinQuantity={editingItem.itemMinQuantity}
                        onSuccess={handleQuantityUpdate}
                    />
                </MobileSheet>
            )}

            {/* Edit Storage Space Modal */}
            {showEditModal && storageSpace && (
                <MobileSheet
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    title="Edit Storage Space"
                    snapPoints={[0, 0.5, 0.7]}
                >
                    <EditStorageSpaceModal
                        storageSpace={storageSpace}
                        onSuccess={() => {
                            setShowEditModal(false);
                            // Refetch will happen automatically via query invalidation
                        }}
                        onCancel={() => setShowEditModal(false)}
                    />
                </MobileSheet>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Storage Space</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{storageSpace?.name}</strong>? This action cannot be undone.
                            {inventory && inventory.length > 0 && (
                                <span className="block mt-2 text-red-600">
                                    Warning: This storage space contains {inventory.length} item{inventory.length !== 1 ? 's' : ''}.
                                    All associated inventory data will be deleted.
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteStorageSpaceMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                try {
                                    await deleteStorageSpaceMutation.mutateAsync(actualStorageSpaceId);
                                    toast.success('Storage space deleted successfully');
                                    router.push(`/admin/locations/${actualLocationId}`);
                                } catch (error: any) {
                                    toast.error(error.message || 'Failed to delete storage space');
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteStorageSpaceMutation.isPending}
                        >
                            {deleteStorageSpaceMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
                                storageSpaceId: actualStorageSpaceId,
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

            {/* Bulk Remove Confirmation Dialog */}
            <AlertDialog open={showBulkRemoveDialog} onOpenChange={setShowBulkRemoveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Items from Storage</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <strong>{selectedInventoryItems.size}</strong> item{selectedInventoryItems.size !== 1 ? 's' : ''} from this storage space? This will delete their inventory records but not the items themselves.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkRemoveItemsMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkRemoveItems}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={bulkRemoveItemsMutation.isPending}
                        >
                            {bulkRemoveItemsMutation.isPending ? 'Removing...' : 'Remove'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
