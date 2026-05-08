"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CostHistoryTab, PriceHistoryTab } from "@/components/warehouse/ItemDetailDrawer";

interface ItemHistoryDrawerProps {
    itemId: number | null;
    itemName?: string;
    open: boolean;
    onClose: () => void;
}

export function ItemHistoryDrawer({ itemId, itemName, open, onClose }: ItemHistoryDrawerProps) {
    const [activeTab, setActiveTab] = useState<'price' | 'cost'>('price');

    useEffect(() => {
        if (!open) return;
        setActiveTab('price');
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && itemId != null && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.2 } }}
                        exit={{ opacity: 0, transition: { duration: 0.18 } }}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    <motion.div
                        key="drawer"
                        initial={{ x: "100%" }}
                        animate={{ x: 0, transition: { type: "spring", damping: 25, stiffness: 300 } }}
                        exit={{ x: "100%", transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] } }}
                        role="dialog"
                        aria-modal="true"
                        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
                    >
                        {/* Header */}
                        <div className="relative flex flex-shrink-0 items-start justify-between border-b border-gray-100 bg-gradient-to-b from-gray-50/60 to-white px-6 py-5">
                            <div className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full bg-indigo-500" />
                            <div className="pl-4 pr-8">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500 mb-1">
                                    Item History
                                </p>
                                <h2 className="text-[17px] font-semibold leading-tight tracking-tight text-gray-900">
                                    {itemName ?? "—"}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Close"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
                                    <path strokeLinecap="round" d="M3 3l10 10M13 3L3 13" />
                                </svg>
                            </button>
                        </div>

                        {/* Tab bar */}
                        <div className="flex flex-shrink-0 border-b border-gray-100 px-6">
                            {([
                                { id: 'price' as const, label: 'Price History' },
                                { id: 'cost' as const, label: 'Cost History' },
                            ]).map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative py-3.5 pr-5 text-[13px] whitespace-nowrap transition-colors duration-150 ${
                                        activeTab === tab.id
                                            ? "font-semibold text-indigo-600"
                                            : "font-medium text-gray-400 hover:text-gray-700"
                                    }`}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.span
                                            layoutId="history-tab-indicator"
                                            className="absolute bottom-0 left-0 right-5 h-0.5 rounded-full bg-indigo-600"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="flex-1 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0, transition: { duration: 0.2 } }}
                                    exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
                                >
                                    {activeTab === 'price' ? (
                                        <PriceHistoryTab itemId={itemId} />
                                    ) : (
                                        <CostHistoryTab itemId={itemId} />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
