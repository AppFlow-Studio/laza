"use client";

import { useState } from 'react';
import { Plus, Edit, Trash2, Clock, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateLimitsByLocation, useCreateUpdateLimit, useUpdateUpdateLimit, useDeleteUpdateLimit } from '@/lib/hooks/queries/useUpdateLimits';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
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

interface UpdateLimitsManagerProps {
    locationId: string;
    storageSpaces?: Array<{ id: string; name: string }>;
}

export default function UpdateLimitsManager({ locationId, storageSpaces = [] }: UpdateLimitsManagerProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingLimit, setEditingLimit] = useState<any | null>(null);
    const [deletingLimit, setDeletingLimit] = useState<any | null>(null);
    const [selectedStorageSpace, setSelectedStorageSpace] = useState<string | null>(null);
    const [maxUpdates, setMaxUpdates] = useState(2);
    const [timeWindowStart, setTimeWindowStart] = useState('06:00');
    const [timeWindowEnd, setTimeWindowEnd] = useState('06:00');

    const { data: limits, isLoading } = useUpdateLimitsByLocation(locationId);
    const createMutation = useCreateUpdateLimit();
    const updateMutation = useUpdateUpdateLimit();
    const deleteMutation = useDeleteUpdateLimit();

    const handleCreate = async () => {
        try {
            await createMutation.mutateAsync({
                location_id: locationId,
                storage_space_id: selectedStorageSpace || null,
                max_updates_per_window: maxUpdates,
                time_window_start: timeWindowStart + ':00',
                time_window_end: timeWindowEnd + ':00',
                is_active: true,
            });
            toast.success('Update limit created successfully');
            setShowCreateForm(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create update limit');
        }
    };

    const handleUpdate = async () => {
        if (!editingLimit) return;
        try {
            await updateMutation.mutateAsync({
                id: editingLimit.id,
                updates: {
                    max_updates_per_window: maxUpdates,
                    time_window_start: timeWindowStart + ':00',
                    time_window_end: timeWindowEnd + ':00',
                },
            });
            toast.success('Update limit updated successfully');
            setEditingLimit(null);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update update limit');
        }
    };

    const handleDelete = async () => {
        if (!deletingLimit) return;
        try {
            await deleteMutation.mutateAsync(deletingLimit.id);
            toast.success('Update limit deleted successfully');
            setDeletingLimit(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete update limit');
        }
    };

    const resetForm = () => {
        setSelectedStorageSpace(null);
        setMaxUpdates(2);
        setTimeWindowStart('06:00');
        setTimeWindowEnd('06:00');
    };

    const openEditForm = (limit: any) => {
        setEditingLimit(limit);
        setSelectedStorageSpace(limit.storage_space_id || null);
        setMaxUpdates(limit.max_updates_per_window);
        setTimeWindowStart(limit.time_window_start?.slice(0, 5) || '06:00');
        setTimeWindowEnd(limit.time_window_end?.slice(0, 5) || '06:00');
    };

    const openCreateForm = () => {
        resetForm();
        setShowCreateForm(true);
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-zinc-600" />
                        <h2 className="text-lg font-semibold text-zinc-900">Update Limits</h2>
                    </div>
                    <Button
                        onClick={openCreateForm}
                        size="sm"
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Limit
                    </Button>
                </div>

                {isLoading ? (
                    <LoadingSkeleton className="h-32 w-full" />
                ) : limits && limits.length > 0 ? (
                    <div className="space-y-2">
                        {limits.map((limit: any) => {
                            const storageSpace = limit.storage_spaces
                                ? limit.storage_spaces
                                : limit.storage_space_id
                                    ? storageSpaces.find((ss: any) => ss.id === limit.storage_space_id)
                                    : null;

                            return (
                                <div
                                    key={limit.id}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border",
                                        limit.is_active
                                            ? "bg-blue-50 border-blue-200"
                                            : "bg-zinc-50 border-zinc-200 opacity-60"
                                    )}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-zinc-500" />
                                            <span className="font-medium">
                                                {limit.storage_space_id
                                                    ? storageSpace?.name || 'Unknown Storage Space'
                                                    : 'All Storage Spaces (Default)'}
                                            </span>
                                            {!limit.is_active && (
                                                <span className="text-xs px-2 py-0.5 bg-zinc-200 text-zinc-600 rounded-full">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-zinc-600 mt-1 ml-6">
                                            {limit.max_updates_per_window} updates per window
                                            {' • '}
                                            {limit.time_window_start?.slice(0, 5)} - {limit.time_window_end?.slice(0, 5)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditForm(limit)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDeletingLimit(limit)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Settings className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-500 mb-4">No update limits configured</p>
                        <Button
                            onClick={openCreateForm}
                            variant="outline"
                            size="sm"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Limit
                        </Button>
                    </div>
                )}
            </div>

            {/* Create/Edit Form */}
            <MobileSheet
                isOpen={showCreateForm || !!editingLimit}
                onClose={() => {
                    setShowCreateForm(false);
                    setEditingLimit(null);
                    resetForm();
                }}
                title={editingLimit ? 'Edit Update Limit' : 'Create Update Limit'}
                snapPoints={[0.7, 0.95]}
            >
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="storage-space">Storage Space</Label>
                        <select
                            id="storage-space"
                            value={selectedStorageSpace || ''}
                            onChange={(e) => setSelectedStorageSpace(e.target.value || null)}
                            className="w-full mt-1 px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Storage Spaces (Default)</option>
                            {storageSpaces.map((space) => (
                                <option key={space.id} value={space.id}>
                                    {space.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-zinc-500 mt-1">
                            Select a specific storage space or leave blank for location-wide default
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="max-updates">Max Updates Per Window</Label>
                        <Input
                            id="max-updates"
                            type="number"
                            min="1"
                            value={maxUpdates}
                            onChange={(e) => setMaxUpdates(parseInt(e.target.value) || 1)}
                            className="mt-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="time-start">Window Start Time</Label>
                            <Input
                                id="time-start"
                                type="time"
                                value={timeWindowStart}
                                onChange={(e) => setTimeWindowStart(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="time-end">Window End Time</Label>
                            <Input
                                id="time-end"
                                type="time"
                                value={timeWindowEnd}
                                onChange={(e) => setTimeWindowEnd(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                        If end time is earlier than start time, it represents a cross-day window (e.g., 6 AM to 6 AM next day)
                    </p>

                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowCreateForm(false);
                                setEditingLimit(null);
                                resetForm();
                            }}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={editingLimit ? handleUpdate : handleCreate}
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="flex-1"
                        >
                            {createMutation.isPending || updateMutation.isPending
                                ? 'Saving...'
                                : editingLimit
                                    ? 'Update'
                                    : 'Create'}
                        </Button>
                    </div>
                </div>
            </MobileSheet>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingLimit} onOpenChange={(open) => !open && setDeletingLimit(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Update Limit</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this update limit? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

