"use client";

import { Calendar, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

type DatePreset = 'today' | 'last7' | 'last30' | 'last90' | 'custom' | null;

interface DateRangePickerProps {
    startDate: Date | null;
    endDate: Date | null;
    onChange: (startDate: Date | null, endDate: Date | null, preset: DatePreset) => void;
    className?: string;
}

export default function DateRangePicker({ startDate, endDate, onChange, className }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [preset, setPreset] = useState<DatePreset>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const applyPreset = (presetType: DatePreset) => {
        let newStartDate: Date | null = null;
        let newEndDate: Date | null = null;

        switch (presetType) {
            case 'today':
                newStartDate = startOfDay(new Date());
                newEndDate = endOfDay(new Date());
                break;
            case 'last7':
                newStartDate = startOfDay(subDays(new Date(), 6));
                newEndDate = endOfDay(new Date());
                break;
            case 'last30':
                newStartDate = startOfDay(subDays(new Date(), 29));
                newEndDate = endOfDay(new Date());
                break;
            case 'last90':
                newStartDate = startOfDay(subDays(new Date(), 89));
                newEndDate = endOfDay(new Date());
                break;
            case 'custom':
                // Keep existing dates if they exist
                newStartDate = startDate;
                newEndDate = endDate;
                break;
            case null:
                newStartDate = null;
                newEndDate = null;
                break;
        }

        setPreset(presetType);
        onChange(newStartDate, newEndDate, presetType);
        if (presetType !== 'custom') {
            setIsOpen(false);
        }
    };

    const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
        const date = value ? new Date(value) : null;
        if (type === 'start') {
            onChange(date, endDate, 'custom');
        } else {
            onChange(startDate, date, 'custom');
        }
        setPreset('custom');
    };

    const clearDates = () => {
        setPreset(null);
        onChange(null, null, null);
        setIsOpen(false);
    };

    const getDisplayText = () => {
        if (!startDate && !endDate) {
            return 'All Dates';
        }
        if (preset === 'today') {
            return 'Today';
        }
        if (preset === 'last7') {
            return 'Last 7 Days';
        }
        if (preset === 'last30') {
            return 'Last 30 Days';
        }
        if (preset === 'last90') {
            return 'Last 90 Days';
        }
        if (startDate && endDate) {
            return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
        }
        if (startDate) {
            return `From ${format(startDate, 'MMM d, yyyy')}`;
        }
        if (endDate) {
            return `Until ${format(endDate, 'MMM d, yyyy')}`;
        }
        return 'All Dates';
    };

    const formatDateForInput = (date: Date | null) => {
        if (!date) return '';
        return format(date, 'yyyy-MM-dd');
    };

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors w-full sm:w-auto"
            >
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-600">Date:</span>
                <span className="text-sm text-zinc-900">{getDisplayText()}</span>
                {(startDate || endDate) && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            clearDates();
                        }}
                        className="ml-auto p-0.5 rounded-full hover:bg-zinc-200 transition-colors"
                    >
                        <X className="w-3 h-3 text-zinc-500" />
                    </button>
                )}
                <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-[9999] w-80">
                    <div className="p-2">
                        <div className="space-y-1 mb-3">
                            <button
                                type="button"
                                onClick={() => applyPreset('today')}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors rounded",
                                    preset === 'today' && "bg-indigo-50 text-indigo-600 font-medium"
                                )}
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('last7')}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors rounded",
                                    preset === 'last7' && "bg-indigo-50 text-indigo-600 font-medium"
                                )}
                            >
                                Last 7 Days
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('last30')}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors rounded",
                                    preset === 'last30' && "bg-indigo-50 text-indigo-600 font-medium"
                                )}
                            >
                                Last 30 Days
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset('last90')}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors rounded",
                                    preset === 'last90' && "bg-indigo-50 text-indigo-600 font-medium"
                                )}
                            >
                                Last 90 Days
                            </button>
                            <button
                                type="button"
                                onClick={() => applyPreset(null)}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors rounded",
                                    !preset && "bg-indigo-50 text-indigo-600 font-medium"
                                )}
                            >
                                All Dates
                            </button>
                        </div>
                        <div className="border-t border-zinc-200 pt-3">
                            <p className="text-xs font-medium text-zinc-600 mb-2 px-3">Custom Range</p>
                            <div className="space-y-2 px-3 pb-2">
                                <div>
                                    <label className="text-xs text-zinc-600 mb-1 block">Start Date</label>
                                    <input
                                        type="date"
                                        value={formatDateForInput(startDate)}
                                        onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-600 mb-1 block">End Date</label>
                                    <input
                                        type="date"
                                        value={formatDateForInput(endDate)}
                                        onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

