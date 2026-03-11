"use client";

import { CheckCircle2, MapPin, Package, Users, Snowflake, Thermometer, Sun, Pencil, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useItems } from '@/lib/hooks/queries/useItems';
import type { StoreFormData } from './StoreDetailsStep';
import type { WizardStorageSpace } from './StoreStorageSpacesStep';
import type { ItemAssignmentData } from '@/components/admin/locations/wizard/steps/AssignItemsStep';
import type { InviteAdminFormData } from './InviteAdminStep';

interface ConfirmationStepProps {
    storeData:       StoreFormData;
    storageSpaces:   WizardStorageSpace[];
    itemAssignments: Record<string, ItemAssignmentData>;
    inviteData:      InviteAdminFormData | null;
    createdLocationId: string | null; // set after successful submit
    onEditStep: (step: number) => void;
}

const TEMP_CONFIG = {
    frozen:       { icon: Snowflake,   label: 'Frozen',      color: 'text-blue-600 bg-blue-50' },
    refrigerated: { icon: Thermometer, label: 'Refrigerated', color: 'text-cyan-600 bg-cyan-50' },
    dry:          { icon: Sun,         label: 'Dry Storage',  color: 'text-amber-600 bg-amber-50' },
} as const;

export default function ConfirmationStep({
    storeData,
    storageSpaces,
    itemAssignments,
    inviteData,
    createdLocationId,
    onEditStep,
}: ConfirmationStepProps) {
    const { data: allItems } = useItems();
    const itemsMap = new Map(allItems?.map(item => [item.id, item]) || []);

    const totalItems = Object.values(itemAssignments).reduce(
        (sum, a) => sum + a.selectedItems.size, 0
    );

    // If submission has completed, show success screen
    if (createdLocationId) {
        return (
            <div className="text-center py-8 space-y-6">
                <div className="flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-9 h-9 text-green-600" />
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-zinc-900">Store is ready!</h3>
                    <p className="text-sm text-zinc-500 mt-2">
                        <strong>{storeData.name}</strong> has been created with {storageSpaces.length} storage space{storageSpaces.length !== 1 ? 's' : ''} and {totalItems} item assignment{totalItems !== 1 ? 's' : ''}.
                    </p>
                    {inviteData && (
                        <p className="text-sm text-zinc-500 mt-1">
                            An invitation has been sent to <strong>{inviteData.email}</strong>.
                        </p>
                    )}
                </div>
                <a
                    href={`/super-admin/stores/${createdLocationId}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    View Store Dashboard
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        );
    }

    // Pre-submission review
    return (
        <div className="space-y-5">
            {/* Store details */}
            <SectionCard title="Store Details" onEdit={() => onEditStep(1)}>
                <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-medium text-zinc-900">{storeData.name}</p>
                        <p className="text-sm text-zinc-500">
                            {storeData.address.street}, {storeData.address.city}, {storeData.address.state} {storeData.address.zip}
                        </p>
                        <span className={cn(
                            'inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium',
                            storeData.is_active ? 'bg-green-50 text-green-700' : 'bg-zinc-100 text-zinc-600'
                        )}>
                            {storeData.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {storeData.clone_from_id && (
                            <span className="inline-block mt-1 ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                Cloned layout
                            </span>
                        )}
                    </div>
                </div>
            </SectionCard>

            {/* Storage spaces */}
            <SectionCard title={`Storage Spaces (${storageSpaces.length})`} onEdit={() => onEditStep(2)}>
                <div className="space-y-2">
                    {storageSpaces.map(space => {
                        const config = TEMP_CONFIG[space.temperature_type];
                        const Icon = config.icon;
                        const assignment = itemAssignments[space.tempId];
                        const itemCount = assignment?.selectedItems.size || 0;

                        return (
                            <div key={space.tempId} className="border border-zinc-100 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn('p-1.5 rounded', config.color)}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-zinc-900 text-sm">{space.name}</p>
                                            <p className="text-xs text-zinc-500">{config.label}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                                        <Package className="w-3.5 h-3.5" />
                                        {itemCount} item{itemCount !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                {itemCount > 0 && (
                                    <div className="mt-2 pt-2 border-t border-zinc-100 space-y-1">
                                        {Array.from(assignment.selectedItems).map(itemId => {
                                            const item = itemsMap.get(itemId);
                                            if (!item) return null;
                                            const qty      = assignment.itemQuantities[itemId] || 0;
                                            const override = assignment.itemMinQuantityOverrides[itemId];
                                            return (
                                                <div key={itemId} className="flex items-center justify-between text-xs">
                                                    <span className="text-zinc-700">{item.name}</span>
                                                    <div className="flex gap-3 text-zinc-400">
                                                        <span>Qty: {qty}</span>
                                                        {override != null && <span>Min: {override}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            {/* Invite */}
            <SectionCard title="First Admin" onEdit={() => onEditStep(4)}>
                {inviteData ? (
                    <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <span className="text-zinc-700">{inviteData.email}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 font-medium">Admin</span>
                    </div>
                ) : (
                    <p className="text-sm text-zinc-400 italic">No admin invited — skipped</p>
                )}
            </SectionCard>

            {/* Summary */}
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h4 className="text-sm font-medium text-indigo-900 mb-1">Ready to create</h4>
                <p className="text-sm text-indigo-700">
                    Creating <strong>{storeData.name}</strong> with{' '}
                    <strong>{storageSpaces.length}</strong> storage space{storageSpaces.length !== 1 ? 's' : ''},{' '}
                    <strong>{totalItems}</strong> item assignment{totalItems !== 1 ? 's' : ''},{' '}
                    {inviteData ? <>and an invitation to <strong>{inviteData.email}</strong>.</> : 'and no admin invited yet.'}
                </p>
            </div>
        </div>
    );
}

function SectionCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
    return (
        <div className="border border-zinc-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-zinc-900 text-sm">{title}</h3>
                <button
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
