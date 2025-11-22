"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
    { name: 'Home', href: '/employee', icon: Home },
    { name: 'Activity', href: '/employee/activity', icon: Clock },
    { name: 'Profile', href: '/employee/profile', icon: User },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-zinc-200 pb-safe">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 flex-1 h-full relative",
                                "transition-colors",
                                isActive ? "text-indigo-600" : "text-zinc-500"
                            )}
                        >
                            <div className="relative ">
                                <item.icon className="w-6 h-6" />
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </div>
                            <span className={cn(
                                "text-xs font-medium",
                                isActive ? "text-indigo-600" : "text-zinc-500"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

