"use client";

import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
    className?: string;
    count?: number;
}

export function LoadingSkeleton({ className, count = 1 }: LoadingSkeletonProps) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={cn("animate-pulse bg-zinc-200 rounded", className)}
                />
            ))}
        </>
    );
}

export function CardSkeleton() {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <LoadingSkeleton className="h-6 w-3/4" />
            <LoadingSkeleton className="h-4 w-full" />
            <LoadingSkeleton className="h-4 w-2/3" />
        </div>
    );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    <LoadingSkeleton className="h-12 flex-1" />
                    <LoadingSkeleton className="h-12 w-32" />
                    <LoadingSkeleton className="h-12 w-32" />
                </div>
            ))}
        </div>
    );
}

