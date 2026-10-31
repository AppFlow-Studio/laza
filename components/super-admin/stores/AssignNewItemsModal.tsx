"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useBulkAssignItems } from "@/lib/hooks/queries/useStorageSetup";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
    items: Array<{ id: number; name: string | null; sku: string | null }>;
    storageSpaces: { id: string; name: string }[];
    locationId: string;
    onClose: () => void;
}

export default function AssignNewItemsModal({
    items,
    storageSpaces,
    locationId,
    onClose,
}: Props) {
    const queryClient = useQueryClient();
    const bulkAssign = useBulkAssignItems();
    const [selectedSpaceId, setSelectedSpaceId] = useState(
        storageSpaces[0]?.id ?? ""
    );
    const [checkedIds, setCheckedIds] = useState<Set<number>>(
        new Set(items.map((i) => i.id))
    );

    function toggle(id: number) {
        setCheckedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function handleConfirm() {
        if (!selectedSpaceId || checkedIds.size === 0) return;
        bulkAssign.mutate(
            {
                locationId,
                storageSpaceId: selectedSpaceId,
                items: [...checkedIds].map((id) => ({
                    itemId: String(id),
                    quantity: 0,
                })),
            },
            {
                onSuccess: () => {
                    toast.success("Items assigned successfully");
                    queryClient.invalidateQueries({
                        queryKey: ["unassigned-items", locationId],
                    });
                    onClose();
                },
                onError: (err: unknown) => {
                    const message =
                        err instanceof Error ? err.message : "Failed to assign items";
                    toast.error(message);
                },
            }
        );
    }

    const canConfirm =
        !!selectedSpaceId && checkedIds.size > 0 && !bulkAssign.isPending;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Assign new items to storage</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="storage-space-select" className="text-sm font-medium text-zinc-700 block mb-1">
                            Assign all selected items to:
                        </label>
                        <select
                            id="storage-space-select"
                            value={selectedSpaceId}
                            onChange={(e) => setSelectedSpaceId(e.target.value)}
                            disabled={storageSpaces.length === 0}
                            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {storageSpaces.length === 0 && (
                                <option value="">No storage spaces available</option>
                            )}
                            {storageSpaces.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 border border-zinc-100 rounded-lg p-2">
                        {items.length === 0 && (
                            <p className="text-sm text-zinc-400 text-center py-4">No new items to assign</p>
                        )}
                        {items.map((item) => (
                            <label
                                key={item.id}
                                className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-zinc-50 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={checkedIds.has(item.id)}
                                    onChange={() => toggle(item.id)}
                                    className="accent-indigo-600"
                                />
                                <span className="text-sm font-medium text-zinc-900 flex-1">
                                    {item.name ?? "(Unnamed item)"}
                                </span>
                                {item.sku && (
                                    <span className="text-xs text-zinc-400">{item.sku}</span>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={bulkAssign.isPending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!canConfirm}>
                        {bulkAssign.isPending ? "Assigning..." : "Confirm"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
