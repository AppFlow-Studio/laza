"use client";

import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface FilterOption {
    value: string;
    label: string;
}

interface FilterDropdownProps {
    label: string;
    options: FilterOption[];
    value: string | null;
    onChange: (value: string | null) => void;
    className?: string;
}

export default function FilterDropdown({ label, options, value, onChange, className }: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <DropdownMenu >
            <DropdownMenuTrigger
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
                <span className="text-sm font-medium text-zinc-600">{label}:</span>
                <span className="text-sm text-zinc-900">{selectedOption?.label || 'All'}</span>
                <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
            </DropdownMenuTrigger>

            <DropdownMenuContent className=" bg-white border border-zinc-200 rounded-lg shadow-lg z-999 min-w-[200px] max-w-lg ">
                <button
                    onClick={() => {
                        onChange(null);
                        setIsOpen(false);
                    }}
                    className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors",
                        !value && "bg-indigo-50 text-indigo-600"
                    )}
                >
                    All
                </button>
                <DropdownMenuSeparator />
                {options.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => {
                            onChange(option.value);
                            setIsOpen(false);
                        }}
                        className={cn(
                            "w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors",
                            value === option.value && "bg-indigo-50 text-indigo-600"
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

