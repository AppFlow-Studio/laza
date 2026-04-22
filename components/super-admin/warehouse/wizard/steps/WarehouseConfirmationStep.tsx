"use client";

import type { ReactNode } from "react";
import { CheckCircle2, MapPin, Pencil, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WarehouseFormData } from "./WarehouseDetailsStep";

interface Props {
    warehouseData:     WarehouseFormData;
    createdLocationId: string | null;
    onEditStep:        (step: number) => void;
}

export default function WarehouseConfirmationStep({ warehouseData, createdLocationId, onEditStep }: Props) {
    if (createdLocationId) {
        return (
            <div className="text-center py-8 space-y-6">
                <div className="flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-9 h-9 text-green-600" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-zinc-900">Warehouse is ready!</h3>
                    <p className="text-sm text-zinc-500 mt-2">
                        <strong>{warehouseData.name}</strong> has been created and is{" "}
                        {warehouseData.is_active ? "active" : "inactive"}.
                    </p>
                </div>
                <a
                    href={`/super-admin/warehouse/${createdLocationId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    View Warehouse
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        );
    }

    const { address } = warehouseData;

    return (
        <div className="space-y-5">
            <SectionCard title="Warehouse Details" onEdit={() => onEditStep(1)}>
                <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium text-zinc-900">{warehouseData.name}</p>
                        <p className="text-sm text-zinc-500">
                            {address.street}, {address.city}, {address.state} {address.zip}
                        </p>
                        <span className={cn(
                            "inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium",
                            warehouseData.is_active ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-600"
                        )}>
                            {warehouseData.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                </div>
            </SectionCard>

            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h4 className="text-sm font-medium text-indigo-900 mb-1">Ready to create</h4>
                <p className="text-sm text-indigo-700">
                    Creating <strong>{warehouseData.name}</strong> as a new warehouse location.
                </p>
            </div>
        </div>
    );
}

function SectionCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
    return (
        <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-zinc-900 text-sm">{title}</h3>
                <button
                    type="button"
                    onClick={onEdit}
                    className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
            </div>
            {children}
        </div>
    );
}
