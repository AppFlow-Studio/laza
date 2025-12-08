"use client";

import { useState, useEffect, useRef } from 'react';
import { Sheet } from 'react-modal-sheet';
import { useUser } from '@clerk/nextjs';
import { useUpdateQuantity } from '@/lib/hooks/queries/useEmployee';
import { useCheckUpdateAllowed } from '@/lib/hooks/queries/useUpdateLimits';
import { Button } from '@/components/ui/button';
import { Minus, Plus, X, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import NumericKeypad from './NumericKeypad';

interface QuantityUpdateSheetProps {
    id: string;
    item: any;
    currentQuantity: number;
    locationId: string;
    storageSpaceId: string;
    storageSpaceName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const reasonOptions = [
    { value: 'correction', label: 'Correction (default)' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'expired', label: 'Expired' },
    { value: 'found', label: 'Found' },
    { value: 'other', label: 'Other' },
];

const actionTypes = [
    { value: 'count', label: 'Count' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'received', label: 'Received' },
    { value: 'used', label: 'Used' },
];

export default function QuantityUpdateSheet({
    id,
    item,
    currentQuantity,
    locationId,
    storageSpaceId,
    storageSpaceName,
    isOpen,
    onClose,
    onSuccess,
}: QuantityUpdateSheetProps) {
    const { user } = useUser();
    const updateMutation = useUpdateQuantity();

    // Check update limits
    const { data: limitCheck, isLoading: limitCheckLoading } = useCheckUpdateAllowed(
        item?.id || null,
        locationId || null,
        storageSpaceId || null,
        user?.id || null
    );

    // Track original quantity (never changes)

    const [originalQuantity, setOriginalQuantity] = useState(currentQuantity);

    // Current quantity being edited
    const [quantity, setQuantity] = useState<string>(currentQuantity.toString());
    const [showKeypad, setShowKeypad] = useState(false);
    const [isFirstInput, setIsFirstInput] = useState(true); // Track if user hasn't typed yet
    const [reason, setReason] = useState('correction');
    const [actionType, setActionType] = useState<'count' | 'adjustment' | 'received' | 'used'>('count');
    const [showReasonDropdown, setShowReasonDropdown] = useState(false);
    const [showActionDropdown, setShowActionDropdown] = useState(false);
    const reasonDropdownRef = useRef<HTMLDivElement>(null);
    const actionDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(event.target as Node)) {
                setShowReasonDropdown(false);
            }
            if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
                setShowActionDropdown(false);
            }
        };

        if (showReasonDropdown || showActionDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showReasonDropdown, showActionDropdown]);

    // Reset when sheet opens
    useEffect(() => {
        if (isOpen) {
            setQuantity(currentQuantity.toString());
            setOriginalQuantity(currentQuantity);
            setReason('correction');
            setActionType('count');
            setShowKeypad(false);
            setIsFirstInput(true);
        }
    }, [isOpen, currentQuantity]);

    const numericQuantity = parseFloat(quantity) || 0;
    const quantityChange = numericQuantity - originalQuantity;

    const handleIncrement = () => {
        const newValue = numericQuantity + 1;
        setQuantity(newValue.toString());
    };

    const handleDecrement = () => {
        const newValue = Math.max(0, numericQuantity - 1);
        setQuantity(newValue.toString());
    };

    const handleKeypadInput = (char: string) => {
        // On first input, clear and start fresh with the new character
        if (isFirstInput) {
            setQuantity(char === '.' ? '0.' : char);
            setIsFirstInput(false);
            return;
        }

        if (quantity === '0' && char !== '.') {
            setQuantity(char);
        } else {
            setQuantity(quantity + char);
        }
    };

    const handleKeypadBackspace = () => {
        if (quantity.length > 1) {
            setQuantity(quantity.slice(0, -1));
        } else {
            setQuantity('0');
        }
    };

    const handleKeypadEnter = () => {
        setShowKeypad(false);
    };

    const handleSave = async () => {
        if (numericQuantity === originalQuantity) {
            toast.error('Quantity unchanged');
            return;
        }

        if (numericQuantity < 0) {
            toast.error('Quantity cannot be negative');
            return;
        }

        // Check if update is allowed
        if (limitCheck && !limitCheck.allowed) {
            toast.error(
                limitCheck.reason === 'limit_reached'
                    ? `Update limit reached. This item has been updated ${limitCheck.currentCount}/${limitCheck.limit} updates for this item today. Please contact an admin to override.`
                    : 'Update not allowed. Please contact an admin.'
            );
            return;
        }

        try {
            await updateMutation.mutateAsync({

                id: id,
                itemId: item.id,
                locationId,
                storageSpaceId,
                newQuantity: numericQuantity,
                userId: user?.id || '',
                actionType: actionType,
                notes: reason !== 'correction' ? `Reason: ${reasonOptions.find(r => r.value === reason)?.label}` : undefined,
            });

            // Enhanced toast notification
            const changeText = quantityChange > 0
                ? `+${quantityChange.toFixed(2)}`
                : quantityChange.toFixed(2);

            toast.success(
                <div className="space-y-1">
                    <p className="font-semibold">{item?.name || 'Item'}</p>
                    <p className="text-sm">
                        {originalQuantity.toFixed(2)} → {numericQuantity.toFixed(2)} ({changeText})
                    </p>
                    <p className="text-xs text-zinc-500">
                        {actionTypes.find(a => a.value === actionType)?.label}
                    </p>
                </div>,
                { duration: 4000 }
            );

            onSuccess();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update quantity');
        }
    };

    return (
        <>
            <Sheet isOpen={isOpen} onClose={onClose} snapPoints={[0, 0.7, 0.95, 1]} initialSnap={2} className=' z-50'>
                <Sheet.Container className=''>
                    <Sheet.Header />
                    <Sheet.Content>
                        <div className="flex flex-col h-full bg-white rounded-t-2xl">
                            {/* Header with Cancel and Save */}
                            <div className="px-4 pt-4 pb-3 border-b border-zinc-200 flex-shrink-0 flex items-center justify-between">
                                <Button
                                    variant="secondary"
                                    onClick={onClose}
                                    disabled={updateMutation.isPending}
                                    className="text-zinc-600"
                                >
                                    <X className="w-5 h-5" /> Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={
                                        updateMutation.isPending ||
                                        quantityChange === 0 ||
                                        numericQuantity < 0 ||
                                        (limitCheck && !limitCheck.allowed) ||
                                        limitCheckLoading
                                    }
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                                {/* Item Name */}
                                <div>
                                    <h2 className="text-xl font-bold text-zinc-900 mb-1">
                                        {item?.name || 'Update Quantity'}
                                    </h2>
                                    {item?.sku && (
                                        <p className="text-sm text-zinc-500">SKU: {item.sku}</p>
                                    )}
                                </div>

                                {/* Location Indicator */}
                                <div className="text-sm text-zinc-600">
                                    📍 {storageSpaceName}
                                </div>

                                {/* Update Limit Status */}
                                {!limitCheckLoading && limitCheck && (
                                    <div className={cn(
                                        "p-3 rounded-lg border-2",
                                        limitCheck.allowed
                                            ? limitCheck.remaining !== undefined && limitCheck.remaining <= 1
                                                ? "bg-amber-50 border-amber-200"
                                                : "bg-blue-50 border-blue-200"
                                            : "bg-red-50 border-red-200"
                                    )}>
                                        {limitCheck.allowed ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-zinc-900">
                                                        Update Limit Status
                                                    </p>
                                                    <p className="text-xs text-zinc-600 mt-0.5">
                                                        {limitCheck.remaining !== undefined && limitCheck.limit !== undefined
                                                            ? `${limitCheck.remaining} of ${limitCheck.limit} updates remaining today`
                                                            : 'No limit configured'}
                                                    </p>
                                                </div>
                                                {limitCheck.remaining !== undefined && limitCheck.remaining <= 1 && (
                                                    <AlertCircle className="w-5 h-5 text-amber-600" />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-red-900">
                                                        Update Limit Reached
                                                    </p>
                                                    <p className="text-xs text-red-700 mt-1">
                                                        There was {limitCheck.currentCount}/{limitCheck.limit} updates for this item today.
                                                    </p>
                                                    <p className="text-xs text-red-600 mt-1">
                                                        Please contact an admin to override this limit.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Available Quantity Section */}
                                <div >
                                    <p className="text-sm text-zinc-600 mb-2">Available</p>

                                    {/* Quantity Adjustment Controls */}
                                    <div className="flex items-center gap-3 mb-2 mx-auto justify-center">
                                        {/* Minus Button */}
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={handleDecrement}
                                            disabled={updateMutation.isPending}
                                            className={cn(
                                                "w-12 h-12 rounded-full border-2 border-zinc-300",
                                                "bg-white flex items-center justify-center",
                                                "hover:bg-zinc-50 active:bg-zinc-100",
                                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                                "transition-colors"
                                            )}
                                        >
                                            <Minus className="w-5 h-5 text-zinc-700" />
                                        </motion.button>

                                        {/* Center Number Display (Tappable) */}
                                        <motion.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setShowKeypad(true);
                                                setIsFirstInput(true);
                                            }}
                                            disabled={updateMutation.isPending}
                                            className={cn(
                                                "w-1/2 h-20 bg-white border-2 rounded-xl",
                                                "flex flex-col items-center justify-center gap-1",
                                                "hover:border-blue-300 active:bg-zinc-50",
                                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                                "transition-colors",
                                                quantityChange !== 0
                                                    ? "border-blue-400 bg-blue-50/50"
                                                    : "border-zinc-200"
                                            )}
                                        >
                                            {/* Show original with strikethrough when changed */}
                                            {quantityChange !== 0 && (
                                                <span className="text-sm text-zinc-400 line-through">
                                                    {originalQuantity.toFixed(0)}
                                                </span>
                                            )}
                                            <span className={cn(
                                                "text-3xl font-bold",
                                                quantityChange !== 0 ? "text-blue-600" : "text-zinc-900"
                                            )}>
                                                {numericQuantity.toFixed(0)}
                                            </span>
                                            {/* Show change indicator */}
                                            {quantityChange !== 0 && (
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    quantityChange > 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {quantityChange > 0 ? `+${quantityChange.toFixed(0)}` : quantityChange.toFixed(0)}
                                                </span>
                                            )}
                                        </motion.button>

                                        {/* Plus Button */}
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={handleIncrement}
                                            disabled={updateMutation.isPending}
                                            className={cn(
                                                "w-16 h-12 rounded-xl border-2 border-blue-300",
                                                "bg-blue-50 flex items-center justify-center",
                                                "hover:bg-blue-100 active:bg-blue-200",
                                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                                "transition-colors shadow-sm"
                                            )}
                                        >
                                            <Plus className="w-5 h-5 text-blue-700" />
                                        </motion.button>
                                    </div>

                                    {/* Original Quantity / Change Summary */}
                                    <AnimatePresence mode="wait">
                                        {quantityChange !== 0 ? (
                                            <motion.div
                                                key="changed"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="flex items-center justify-center gap-2 mt-2"
                                            >
                                                <span className="text-sm text-zinc-500">
                                                    {originalQuantity.toFixed(2)}
                                                </span>
                                                <span className="text-zinc-400">→</span>
                                                <span className={cn(
                                                    "text-sm font-semibold",
                                                    quantityChange > 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {numericQuantity.toFixed(2)}
                                                </span>
                                            </motion.div>
                                        ) : (
                                            <motion.p
                                                key="original"
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="text-sm text-zinc-500 mt-2"
                                            >
                                                Current: {originalQuantity.toFixed(2)}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>

                                    {/* Edit On hand Button */}
                                    <button
                                        onClick={() => {
                                            setShowKeypad(true);
                                            setIsFirstInput(true);
                                        }}
                                        className="text-sm text-blue-600 mt-2 hover:underline"
                                    >
                                        Edit On hand
                                    </button>
                                </div>

                                {/* Reason Field */}
                                <div>
                                    <label className="text-sm font-medium text-zinc-700 mb-2 block">
                                        Reason
                                    </label>
                                    <div className="relative" ref={reasonDropdownRef}>
                                        <button
                                            onClick={() => {
                                                setShowReasonDropdown(!showReasonDropdown);
                                                setShowActionDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full px-4 py-3 bg-white border-2 border-zinc-200 rounded-xl",
                                                "flex items-center justify-between",
                                                "hover:border-zinc-300 transition-colors"
                                            )}
                                        >
                                            <span className="text-zinc-700">
                                                {reasonOptions.find(r => r.value === reason)?.label || 'Select reason'}
                                            </span>
                                            <ChevronRight className={cn(
                                                "w-5 h-5 text-zinc-400 transition-transform",
                                                showReasonDropdown && "rotate-90"
                                            )} />
                                        </button>

                                        <AnimatePresence>
                                            {showReasonDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-10 w-full mt-2 bg-white border-2 border-zinc-200 rounded-xl shadow-lg overflow-hidden"
                                                >
                                                    {reasonOptions.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => {
                                                                setReason(option.value);
                                                                setShowReasonDropdown(false);
                                                            }}
                                                            className={cn(
                                                                "w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors",
                                                                reason === option.value && "bg-blue-50"
                                                            )}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Action Type Field */}
                                <div>
                                    <label className="text-sm font-medium text-zinc-700 mb-2 block">
                                        Action Type
                                    </label>
                                    <div className="relative" ref={actionDropdownRef}>
                                        <button
                                            onClick={() => {
                                                setShowActionDropdown(!showActionDropdown);
                                                setShowReasonDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full px-4 py-3 bg-white border-2 border-zinc-200 rounded-xl",
                                                "flex items-center justify-between",
                                                "hover:border-zinc-300 transition-colors"
                                            )}
                                        >
                                            <span className="text-zinc-700">
                                                {actionTypes.find(a => a.value === actionType)?.label || 'Select action'}
                                            </span>
                                            <ChevronRight className={cn(
                                                "w-5 h-5 text-zinc-400 transition-transform",
                                                showActionDropdown && "rotate-90"
                                            )} />
                                        </button>

                                        <AnimatePresence>
                                            {showActionDropdown && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute z-10 w-full mt-2 bg-white border-2 border-zinc-200 rounded-xl shadow-lg overflow-hidden"
                                                >
                                                    {actionTypes.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            onClick={() => {
                                                                setActionType(option.value as any);
                                                                setShowActionDropdown(false);
                                                            }}
                                                            className={cn(
                                                                "w-full px-4 py-3 text-left hover:bg-zinc-50 transition-colors",
                                                                actionType === option.value && "bg-blue-50"
                                                            )}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Summary Card */}
                                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-zinc-600">Available</span>
                                            <span className="text-lg font-semibold text-zinc-900">
                                                {numericQuantity.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Sheet.Content>
                </Sheet.Container>
                <Sheet.Backdrop onTap={onClose} />
            </Sheet>

            {/* Numeric Keypad */}
            <NumericKeypad
                isOpen={showKeypad}
                value={quantity}
                onClose={() => setShowKeypad(false)}
                onInput={handleKeypadInput}
                onBackspace={handleKeypadBackspace}
                onEnter={handleKeypadEnter}
            />
        </>
    );
}
