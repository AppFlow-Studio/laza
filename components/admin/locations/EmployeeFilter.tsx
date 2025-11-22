"use client";

import { ChevronDown, X, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Employee {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
}

interface EmployeeFilterProps {
    employees: Employee[];
    value: string | null;
    onChange: (value: string | null) => void;
    className?: string;
}

export default function EmployeeFilter({ employees, value, onChange, className }: EmployeeFilterProps) {
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

    const selectedEmployee = employees.find(emp => emp.id === value);

    const getEmployeeDisplayName = (employee: Employee) => {
        if (employee.first_name && employee.last_name) {
            return `${employee.first_name} ${employee.last_name}`;
        }
        if (employee.first_name) {
            return employee.first_name;
        }
        return employee.email;
    };

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors w-full sm:w-auto"
            >
                <User className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-600">Employee:</span>
                <span className="text-sm text-zinc-900">{selectedEmployee ? getEmployeeDisplayName(selectedEmployee) : 'All'}</span>
                {value && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                        className="ml-auto p-0.5 rounded-full hover:bg-zinc-200 transition-colors"
                    >
                        <X className="w-3 h-3 text-zinc-500" />
                    </button>
                )}
                <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-[9999] max-h-60 overflow-y-auto w-52">
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
                        All Employees
                    </button>
                    {employees.map((employee) => (
                        <button
                            key={employee.id}
                            type="button"
                            onClick={() => {
                                onChange(employee.id);
                                setIsOpen(false);
                            }}
                            className={cn(
                                "w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 transition-colors last:rounded-b-lg",
                                value === employee.id && "bg-indigo-50 text-indigo-600 font-medium"
                            )}
                        >
                            {getEmployeeDisplayName(employee)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

