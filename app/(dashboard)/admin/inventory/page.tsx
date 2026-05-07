"use client";

import { useState } from 'react';
import { useInventoryByLocation } from '@/lib/hooks/queries/useInventory';
import { useItems } from '@/lib/hooks/queries/useItems';
import InventoryMatrix from '@/components/admin/inventory/InventoryMatrix';
import QuantityUpdateModal from '@/components/admin/inventory/QuantityUpdateModal';
import PendingRequestsPanel from '@/components/admin/inventory/PendingRequestsPanel';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { useLocationWithDetails } from '@/lib/hooks/queries/useLocations';
import { useAdminStore } from '@/lib/stores/adminStore';

export default function InventoryPage() {
    const { selectedLocationId } = useAdminStore();
    const { data: locationDetails, isLoading: locationLoading } = useLocationWithDetails(selectedLocationId);
    const { data: inventory, isLoading: inventoryLoading } = useInventoryByLocation(selectedLocationId);
    const { data: items } = useItems();

    const [updatingCell, setUpdatingCell] = useState<{
        itemId: string;
        storageSpaceId: string | null;
    } | null>(null);

    const getCurrentQuantity = (itemId: string, storageSpaceId: string | null) => {
        const inv = inventory?.find(
            (i: any) => i.item_id === itemId && i.storage_space_id === storageSpaceId
        );
        return inv?.current_quantity || 0;
    };

    if (locationLoading || inventoryLoading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton className="h-12 w-64" />
                <LoadingSkeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!selectedLocationId ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-zinc-200">
                    <p className="text-zinc-500">Select a location from the sidebar to view inventory.</p>
                </div>
            ) : !locationDetails ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-zinc-200">
                    <p className="text-zinc-500">Loading location details...</p>
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                        <div className="p-4 border-b border-zinc-200">
                            <h2 className="text-lg font-semibold text-zinc-900">
                                {locationDetails.name} - Inventory Matrix
                            </h2>
                        </div>
                        <div className="p-4">
                            {locationDetails.storage_spaces && locationDetails.storage_spaces.length > 0 && items ? (
                                <InventoryMatrix
                                    items={items}
                                    storageSpaces={locationDetails.storage_spaces}
                                    inventory={inventory || []}
                                    onCellClick={(itemId, storageSpaceId) => setUpdatingCell({ itemId, storageSpaceId })}
                                />
                            ) : (
                                <div className="text-center py-12 text-zinc-500">
                                    <p>No storage spaces configured for this location</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-8">
                        <h3 className="text-base font-semibold text-zinc-900 mb-3">Employee Update Requests</h3>
                        <PendingRequestsPanel />
                    </div>
                </>
            )}

            {updatingCell && selectedLocationId && (
                <MobileSheet
                    isOpen={!!updatingCell}
                    onClose={() => setUpdatingCell(null)}
                    title="Update Quantity"
                >
                    <QuantityUpdateModal
                        itemId={updatingCell.itemId}
                        locationId={selectedLocationId}
                        storageSpaceId={updatingCell.storageSpaceId}
                        currentQuantity={getCurrentQuantity(updatingCell.itemId, updatingCell.storageSpaceId)}
                        currentMinQuantityOverride={inventory?.find(
                            (i: any) => i.item_id === updatingCell.itemId && i.storage_space_id === updatingCell.storageSpaceId
                        )?.min_quantity_override ?? null}
                        itemMinQuantity={items?.find((item: any) => item.id === updatingCell.itemId)?.min_quantity}
                        onSuccess={() => setUpdatingCell(null)}
                    />
                </MobileSheet>
            )}
        </div>
    );
}
