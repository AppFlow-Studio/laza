"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, MoveRight, Archive } from "lucide-react";
import { PalletWithDetails } from "@/lib/supabase/queries/pallets";
import { useRetirePallet } from "@/lib/hooks/queries/usePallets";
import toast from "react-hot-toast";

interface PalletActionsMenuProps {
  pallet: PalletWithDetails;
}

export function PalletActionsMenu({ pallet }: PalletActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { mutateAsync: retire } = useRetirePallet();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleRetire = async () => {
    if (pallet.status !== "empty") {
      toast.error("Only empty pallets can be retired.");
      return;
    }
    if (!confirm(`Retire pallet ${pallet.pallet_label}? This cannot be undone.`)) return;

    setRetiring(true);
    try {
      await retire(pallet.id);
      toast.success(`Pallet ${pallet.pallet_label} retired.`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to retire pallet.");
    } finally {
      setRetiring(false);
      setOpen(false);
    }
  };

  const params = new URLSearchParams({
    source:    pallet.id,
    warehouse: pallet.warehouse_location_id,
  });

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        aria-label="Pallet actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
          <button
            onClick={() => {
              router.push(`/super-admin/warehouse/pallets/${pallet.id}`);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 text-gray-400" />
            View Details
          </button>

          <button
            onClick={() => {
              router.push(`/super-admin/warehouse/pallets/reorganize?${params.toString()}`);

              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            <MoveRight className="h-4 w-4 text-gray-400" />
            Move Items
          </button>

          {pallet.status === "empty" && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={handleRetire}
                disabled={retiring}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Archive className="h-4 w-4" />
                {retiring ? "Retiring…" : "Retire Pallet"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
