"use client";

import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import CountUp from 'react-countup';
import { cn } from '@/lib/utils';

interface StatsCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export default function StatsCard({ title, value, icon: Icon, trend, className }: StatsCardProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "bg-white rounded-xl shadow-sm p-6 border border-zinc-200 hover:shadow-lg transition-shadow",
                className
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-600 mb-2">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-semibold text-zinc-900">
                            <CountUp end={value} duration={2} />
                        </span>
                        {trend && (
                            <span
                                className={cn(
                                    "text-sm font-medium",
                                    trend.isPositive ? "text-emerald-500" : "text-red-500"
                                )}
                            >
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                        )}
                    </div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                    <Icon className="w-6 h-6 text-indigo-600" />
                </div>
            </div>
        </motion.div>
    );
}

