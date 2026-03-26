"use client";

import { ChevronDown, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CategoryOption {
    value: string;
    label: string;
}

interface CategoryFilterProps {
    options: CategoryOption[];
    value: string | null;
    onChange: (value: string | null) => void;
    className?: string;
}

export default function CategoryFilter({
    options,
    value,
    onChange,
    className,
}: CategoryFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
                <span className="font-medium text-gray-600">Category:</span>
                <span className="text-gray-900">
                    {selectedOption?.label || "All"}
                </span>
                {value && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                        className="ml-auto p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <X className="w-3 h-3 text-gray-500" />
                    </button>
                )}
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-gray-400 transition-transform shrink-0",
                        isOpen && "rotate-180",
                    )}
                />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[9999] max-h-60 overflow-y-auto w-52">
                    <button
                        type="button"
                        onClick={() => {
                            onChange(null);
                            setIsOpen(false);
                        }}
                        className={cn(
                            "w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors rounded-t-xl",
                            !value &&
                                "bg-indigo-50 text-indigo-600 font-medium",
                        )}
                    >
                        All Categories
                    </button>
                    {options.map((option, i) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors",
                                i === options.length - 1 && "rounded-b-xl",
                                value === option.value &&
                                    "bg-indigo-50 text-indigo-600 font-medium",
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}