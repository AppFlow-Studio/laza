"use client";

import { motion } from 'motion/react';
import { Plus, MapPin, Users, Package } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { useAdminStore } from '@/lib/stores/adminStore';
import { cn } from '@/lib/utils';

interface QuickAction {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    color: string;
}

interface QuickActionsProps {
    onAddLocation: () => void;
    onAddEmployee: () => void;
    onAddItem: () => void;
}

export default function QuickActions({ onAddLocation, onAddEmployee, onAddItem }: QuickActionsProps) {
    const isMobile = useIsMobile();

    const actions: QuickAction[] = [
        {
            label: 'Add Location',
            icon: MapPin,
            onClick: onAddLocation,
            color: 'bg-indigo-600 hover:bg-indigo-700',
        },
        {
            label: 'Add Employee',
            icon: Users,
            onClick: onAddEmployee,
            color: 'bg-emerald-600 hover:bg-emerald-700',
        },
        {
            label: 'Add Item',
            icon: Package,
            onClick: onAddItem,
            color: 'bg-amber-600 hover:bg-amber-700',
        },
    ];

    if (isMobile) {
        return (
            <div className="fixed bottom-24 right-4 z-40">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center"
                >
                    <Plus className="w-6 h-6" />
                </motion.button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                    <motion.button
                        key={action.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={action.onClick}
                        className={cn(
                            "flex items-center gap-3 px-6 py-4 rounded-xl text-white font-medium transition-colors",
                            action.color
                        )}
                    >
                        <Icon className="w-5 h-5" />
                        {action.label}
                    </motion.button>
                );
            })}
        </div>
    );
}

