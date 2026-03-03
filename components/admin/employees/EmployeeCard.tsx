"use client";

import { motion } from 'motion/react';
import { User, Mail, MapPin, Edit, Trash2 } from 'lucide-react';
import { User as EmployeeType } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface EmployeeCardProps {
    employee: EmployeeType;
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function EmployeeCard({ employee, onEdit, onDelete }: EmployeeCardProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200 hover:shadow-lg transition-shadow"
        >
            <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-semibold overflow-hidden">
                    {employee.avatar_url ? (
                        <Image
                            src={employee.avatar_url}
                            alt={employee.first_name || employee.email}
                            width={48}
                            height={48}
                            className="object-cover"
                        />
                    ) : (
                        <span>
                            {employee.first_name?.[0] || employee.email[0]?.toUpperCase() || 'U'}
                        </span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                        {employee.first_name && employee.last_name
                            ? `${employee.first_name} ${employee.last_name}`
                            : employee.first_name || employee.email}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{employee.email}</span>
                    </div>
                </div>
                <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    employee.role === 'admin'
                        ? "bg-purple-50 text-purple-600"
                        : "bg-blue-50 text-blue-600"
                )}>
                    {employee.role || 'employee'}
                </div>
            </div>

            <div className="flex items-center gap-2 mb-4 text-sm text-zinc-600">
                <MapPin className="w-4 h-4" />
                <span>{employee.assigned_location_id ? 'Assigned' : 'Unassigned'}</span>
            </div>

            <div className={cn(
                "flex items-center gap-2 mb-4",
                employee.is_active ? "text-emerald-600" : "text-red-600"
            )}>
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    employee.is_active ? "bg-emerald-500" : "bg-red-500"
                )} />
                <span className="text-sm font-medium">
                    {employee.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-zinc-200">
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                    >
                        <Edit className="w-4 h-4" />
                        Edit
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

