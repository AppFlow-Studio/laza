"use client";

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
    key: keyof T | string;
    header: string;
    render?: (item: T) => ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
    className?: string;
}

export default function DataTable<T extends { id: string }>({ data, columns, onRowClick, className }: DataTableProps<T>) {
    return (
        <div className={cn("overflow-x-auto", className)}>
            <table className="w-full">
                <thead>
                    <tr className="border-b border-zinc-200">
                        {columns.map((column) => (
                            <th
                                key={String(column.key)}
                                className={cn("px-4 py-3 text-left text-sm font-semibold text-zinc-900", column.className)}
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr
                            key={item.id}
                            onClick={() => onRowClick?.(item)}
                            className={cn(
                                "border-b border-zinc-100 hover:bg-zinc-50 transition-colors",
                                onRowClick && "cursor-pointer"
                            )}
                        >
                            {columns.map((column) => (
                                <td key={String(column.key)} className={cn("px-4 py-3 text-sm text-zinc-600", column.className)}>
                                    {column.render
                                        ? column.render(item)
                                        : String(item[column.key as keyof T] ?? '')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

