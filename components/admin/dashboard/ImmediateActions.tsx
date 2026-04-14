"use client";

import { useAlerts } from '@/lib/hooks/queries/useInventory';
import { useMemo, useState } from 'react';
import { AlertTriangle, Package, MapPin, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { motion } from 'motion/react';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import QuantityUpdateModal from '@/components/admin/inventory/QuantityUpdateModal';
import EditStorageSpaceModal from '../locations/EditStorageSpaceModal';

export default function ImmediateActions() {
    const { data: alerts, isLoading } = useAlerts({ resolved: false });
    const [editingAlert, setEditingAlert] = useState<{
        alertId: string;
        itemId: string;
        locationId: string;
        storageSpaceId: string;
        currentQuantity: number;
        itemName: string;
        minQuantityOverride?: number | null;
        itemMinQuantity?: number;
    } | null>(null);

    // Group alerts by location
    const groupedAlerts = useMemo(() => {
        if (!alerts || alerts.length === 0) return {};

        const grouped: Record<string, typeof alerts> = {};
        alerts.forEach((alert: any) => {
            const locationId = alert.location_id;
            if (!grouped[locationId]) {
                grouped[locationId] = [];
            }
            grouped[locationId].push(alert);
        });
        return grouped;
    }, [alerts]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton />
            </div>
        );
    }

    if (!alerts || alerts.length === 0) {
        return (
            <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
                    <Package className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-zinc-600 font-medium">No immediate actions needed</p>
                <p className="text-sm text-zinc-500 mt-1">All items are above minimum quantity</p>
            </div>
        );
    }

    const locationIds = Object.keys(groupedAlerts);
    const totalAlerts = alerts.length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="text-sm font-semibold text-zinc-900">
                        {totalAlerts} Low Stock Alert{totalAlerts !== 1 ? 's' : ''}
                    </h3>
                </div>
            </div>

            <div className="space-y-4">
                {locationIds.map((locationId, locationIndex) => {
                    const locationAlerts = groupedAlerts[locationId];
                    const location = locationAlerts[0]?.locations;
                    const locationName = location?.name || 'Unknown Location';
                    console.log(locationAlerts)

                    return (
                        <motion.div
                            key={locationId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: locationIndex * 0.1 }}
                            className="border border-zinc-200 rounded-lg overflow-hidden"
                        >
                            <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-zinc-600" />
                                    <h4 className="font-semibold text-zinc-900">{locationName}</h4>
                                    <span className="ml-auto text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                        {locationAlerts.length} item{locationAlerts.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                            <div className="divide-y divide-zinc-100">
                                {locationAlerts.map((alert: any, alertIndex: number) => {
                                    const item = alert.items;
                                    const storageSpace = alert.storage_spaces;
                                    const currentQty = alert.item_locations?.current_quantity ?? 0;
                                    const effectiveMin = alert.item_locations?.min_quantity_override ?? item?.min_quantity ?? 0;
                                    const deficit = effectiveMin - currentQty;

                                    return (
                                        <div
                                            key={alert.id}
                                            onClick={() => {
                                                setEditingAlert({
                                                    alertId: alert.id,
                                                    itemId: alert.item_id,
                                                    locationId: alert.location_id,
                                                    storageSpaceId: alert.storage_space_id || '',
                                                    currentQuantity: currentQty,
                                                    itemName: item?.name || 'Unknown Item',
                                                    minQuantityOverride: alert.item_locations?.min_quantity_override ?? null,
                                                    itemMinQuantity: item?.min_quantity,
                                                });
                                            }}
                                            className="block hover:bg-zinc-50 transition-colors cursor-pointer"
                                        >
                                            <div className="px-4 py-3">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Package className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                                            <h5 className="font-semibold text-zinc-900 truncate">
                                                                {item?.name || 'Unknown Item'}
                                                            </h5>
                                                        </div>
                                                        {item?.sku && (
                                                            <p className="text-xs text-zinc-500 mb-1">SKU: {item.sku}</p>
                                                        )}
                                                        {storageSpace && (
                                                            <div className="flex items-center gap-1 text-xs text-zinc-600 mb-2">
                                                                <Warehouse className="w-3 h-3" />
                                                                <span>{storageSpace.name}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <div>
                                                                <span className="text-zinc-500">Current: </span>
                                                                <span className={cn(
                                                                    "font-semibold",
                                                                    currentQty <= effectiveMin ? "text-red-600" : "text-zinc-900"
                                                                )}>
                                                                    {currentQty.toFixed(2)}
                                                                </span>
                                                                <span className="text-zinc-500 ml-1">{item?.unit_of_measure || ''}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-zinc-500">Min: </span>
                                                                <span className="font-semibold text-zinc-900">
                                                                    {effectiveMin.toFixed(2)}
                                                                </span>
                                                                <span className="text-zinc-500 ml-1">{item?.unit_of_measure || ''}</span>
                                                            </div>
                                                            {deficit > 0 && (
                                                                <div className="text-red-600 font-medium">
                                                                    Need {deficit.toFixed(2)} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quantity Update Sheet */}
            {editingAlert && (
                <MobileSheet
                    isOpen={!!editingAlert}
                    onClose={() => setEditingAlert(null)}
                    title={`Update Quantity: ${editingAlert.itemName}`}
                    snapPoints={[0, 0.7, 0.95, 1]}
                >
                    <QuantityUpdateModal
                        itemId={editingAlert.itemId}
                        locationId={editingAlert.locationId}
                        storageSpaceId={editingAlert.storageSpaceId}
                        currentQuantity={editingAlert.currentQuantity}
                        currentMinQuantityOverride={editingAlert.minQuantityOverride || null}
                        itemMinQuantity={editingAlert.itemMinQuantity}
                        onSuccess={() => {
                            setEditingAlert(null);
                            // Refetch will happen automatically via query invalidation
                        }}
                    />
                </MobileSheet>
            )}
        </div>
    );
}
