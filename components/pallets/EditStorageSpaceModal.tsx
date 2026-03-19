"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { PalletWithDetails } from "@/lib/supabase/queries/pallets";
import { useUpdatePalletStorageSpace } from "@/lib/hooks/queries/usePallets";
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import toast from "react-hot-toast";

interface EditStorageSpaceModalProps {
  pallet: PalletWithDetails;
  onClose: () => void;
}

export function EditStorageSpaceModal({
  pallet,
  onClose,
}: EditStorageSpaceModalProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(
    pallet.storage_space_id ?? ""
  );

  const { data: warehouseDetails } = useLocationWithDetails(
    pallet.warehouse_location_id
  );
  const { mutateAsync: updateSpace, isPending } = useUpdatePalletStorageSpace();

  const storageSpaces = warehouseDetails?.storage_spaces ?? [];

  const handleSave = async () => {
    if (!selectedSpaceId) {
      toast.error("Please select a storage space.");
      return;
    }
    try {
      await updateSpace({ palletId: pallet.id, storageSpaceId: selectedSpaceId });
      toast.success("Storage space updated.");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Reassign Storage Space
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="mb-3 text-sm text-gray-500">
            Select a new storage space for pallet{" "}
            <span className="font-mono font-semibold text-gray-800">
              {pallet.pallet_label}
            </span>
            .
          </p>
          <select
            value={selectedSpaceId}
            onChange={(e) => setSelectedSpaceId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select a storage space…</option>
            {storageSpaces.map((ss: { id: string; name: string; temperature_type: string }) => (
              <option key={ss.id} value={ss.id}>
                {ss.name} ({ss.temperature_type})
              </option>
            ))}
          </select>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || selectedSpaceId === (pallet.storage_space_id ?? "")}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
