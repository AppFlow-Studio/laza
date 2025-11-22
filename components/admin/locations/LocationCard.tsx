"use client";

import { motion } from 'framer-motion';
import { MapPin, Users, Box, Edit, Trash2, Eye } from 'lucide-react';
import { Location } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface LocationCardProps {
    location: Location & {
        employees?: { id: string }[];
        storage_spaces?: { id: string }[];
        total_inventory_value?: number;
    };
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function LocationCard({ location, onEdit, onDelete }: LocationCardProps) {
    const address = typeof location.address === 'string'
        ? JSON.parse(location.address)
        : location.address;

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200 hover:shadow-lg transition-shadow"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-1">{location.name}</h3>
                    <p className="text-sm text-zinc-600">
                        {address.street}, {address.city}, {address.state} {address.zip}
                    </p>
                </div>
                <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    location.is_active
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-zinc-100 text-zinc-600"
                )}>
                    {location.is_active ? 'Active' : 'Inactive'}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-400" />
                    <div>
                        <p className="text-xs text-zinc-500">Employees</p>
                        <p className="text-sm font-semibold text-zinc-900">{location.employees?.length || 0}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-zinc-400" />
                    <div>
                        <p className="text-xs text-zinc-500">Storage</p>
                        <p className="text-sm font-semibold text-zinc-900">{location.storage_spaces?.length || 0}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    <div>
                        <p className="text-xs text-zinc-500">Value</p>
                        <p className="text-sm font-semibold text-zinc-900">
                            ${location.total_inventory_value?.toLocaleString() || '0'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-zinc-200">
                <Link
                    href={`/admin/locations/${location.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                >
                    <Eye className="w-4 h-4" />
                    View
                </Link>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition-colors"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

