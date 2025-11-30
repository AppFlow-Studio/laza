"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface NumericKeypadProps {
    isOpen: boolean;
    value: string;
    onClose: () => void;
    onInput: (char: string) => void;
    onBackspace: () => void;
    onEnter: () => void;
}

export default function NumericKeypad({
    isOpen,
    value,
    onClose,
    onInput,
    onBackspace,
    onEnter,
}: NumericKeypadProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleKeyPress = (char: string) => {
        // Prevent multiple decimal points
        if (char === '.' && value.includes('.')) {
            return;
        }
        onInput(char);
    };

    if (!mounted) {
        return null;
    }

    const keypadContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[9999]"
                    />
                    {/* Keypad */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[9999] pb-safe"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
                            <h3 className="text-lg font-semibold text-zinc-900">Enter Quantity</h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-600" />
                            </button>
                        </div>

                        {/* Display */}
                        <div className="px-4 py-4">
                            <div className="bg-zinc-50 rounded-xl p-4 text-center">
                                <p className="text-3xl font-bold text-zinc-900">
                                    {value || '0'}
                                </p>
                            </div>
                        </div>

                        {/* Keypad Grid */}
                        <div className="px-4 pb-4">
                            <div className="grid grid-cols-3 gap-3">
                                {/* Numbers 1-9 */}
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <motion.button
                                        key={num}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleKeyPress(num.toString())}
                                        className={cn(
                                            "h-14 bg-white border-2 border-zinc-200 rounded-xl",
                                            "text-xl font-semibold text-zinc-900",
                                            "hover:bg-zinc-50 active:bg-zinc-100",
                                            "transition-colors"
                                        )}
                                    >
                                        {num}
                                    </motion.button>
                                ))}

                                {/* Decimal point */}
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleKeyPress('.')}
                                    disabled={value.includes('.')}
                                    className={cn(
                                        "h-14 bg-white border-2 border-zinc-200 rounded-xl",
                                        "text-xl font-semibold text-zinc-900",
                                        "hover:bg-zinc-50 active:bg-zinc-100",
                                        "transition-colors",
                                        value.includes('.') && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    .
                                </motion.button>

                                {/* Zero */}
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleKeyPress('0')}
                                    className={cn(
                                        "h-14 bg-white border-2 border-zinc-200 rounded-xl",
                                        "text-xl font-semibold text-zinc-900",
                                        "hover:bg-zinc-50 active:bg-zinc-100",
                                        "transition-colors"
                                    )}
                                >
                                    0
                                </motion.button>

                                {/* Backspace */}
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onBackspace}
                                    className={cn(
                                        "h-14 bg-white border-2 border-zinc-200 rounded-xl",
                                        "flex items-center justify-center",
                                        "hover:bg-zinc-50 active:bg-zinc-100",
                                        "transition-colors"
                                    )}
                                >
                                    <Delete className="w-6 h-6 text-zinc-600" />
                                </motion.button>
                            </div>

                            {/* Enter Button */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={onEnter}
                                className={cn(
                                    "w-full h-14 mt-3 rounded-xl",
                                    "bg-blue-600 text-white font-semibold text-lg",
                                    "hover:bg-blue-700 active:bg-blue-800",
                                    "transition-colors shadow-lg"
                                )}
                            >
                                Done
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return createPortal(keypadContent, document.body);
}

