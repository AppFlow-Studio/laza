"use client";

import { ChevronDown, X, Package } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Item {
    id: string;
    name: string;
    sku?: string | null;
}

interface ItemFilterProps {
    items: Item[];
    value: string | null;
    onChange: (value: string | null) => void;
    className?: string;
}

export default function ItemFilter({ items, value, onChange, className }: ItemFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
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

    const selectedItem = items.find(item => item.id === value);

    const getItemDisplayName = (item: Item) => {
        if (item.sku) {
            return `${item.name} (${item.sku})`;
        }
        return item.name;
    };

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors w-full sm:w-auto"
            >
                <Package className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-600">Item:</span>
                <span className="text-sm text-zinc-900 truncate max-w-[150px]">{selectedItem ? getItemDisplayName(selectedItem) : 'All'}</span>
                {value && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                        className="ml-auto p-0.5 rounded-full hover:bg-zinc-200 transition-colors flex-shrink-0"
                    >
                        <X className="w-3 h-3 text-zinc-500" />
                    </button>
                )}
                <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-[9999] max-h-60 overflow-y-auto w-64">
                    <button
                        type="button"
                        onClick={() => {
                            onChange(null);
                            setIsOpen(false);
                        }}
                        className={cn(
                            "w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors first:rounded-t-lg",
                            !value && "bg-indigo-50 text-indigo-600 font-medium"
                        )}
                    >
                        All Items
                    </button>
                    {items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                onChange(item.id);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors last:rounded-b-lg",
                                value === item.id && "bg-indigo-50 text-indigo-600 font-medium"
                            )}
                        >
                            {getItemDisplayName(item)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

