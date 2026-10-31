"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnassignedItemsForLocation } from "@/lib/hooks/queries/useItems";
import AssignNewItemsModal from "./AssignNewItemsModal";

interface Props {
    locationId: string;
    storageSpaces: { id: string; name: string }[];
}

export default function NewCatalogItemsBanner({ locationId, storageSpaces }: Props) {
    const { data: unassigned } = useUnassignedItemsForLocation(locationId);
    const [dismissed, setDismissed] = useState(false);
    const [showModal, setShowModal] = useState(false);

    if (!unassigned || unassigned.length === 0) return null;

    const count = unassigned.length;
    const names = unassigned.slice(0, 3).map((i) => i.name ?? "(Unnamed)");
    const preview = names.join(", ");
    const overflow = count > 3 ? ` +${count - 3} more` : "";
    const subtitle = preview + overflow;

    return (
        <>
            <AnimatePresence>
                {!dismissed && (
                    <motion.div
                        key="banner"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4"
                    >
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Package size={16} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-900">
                            {count} new item{count !== 1 ? "s" : ""} added to the catalog
                        </p>
                        <p className="text-xs text-indigo-600 truncate mt-0.5">{subtitle}</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setShowModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0"
                    >
                        Assign to storage →
                    </Button>
                    <button
                        onClick={() => { setShowModal(false); setDismissed(true); }}
                        className="flex-shrink-0 text-indigo-400 hover:text-indigo-600 p-1 rounded"
                        aria-label="Dismiss"
                    >
                        <X size={16} />
                    </button>
                </motion.div>
                )}
            </AnimatePresence>
            {showModal && (
                <AssignNewItemsModal
                    items={unassigned}
                    storageSpaces={storageSpaces}
                    locationId={locationId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
