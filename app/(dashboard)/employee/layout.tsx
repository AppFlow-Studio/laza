"use client";

import { useUser } from '@clerk/nextjs';
import { useEmployeeLocation } from '@/lib/hooks/queries/useEmployee';
import BottomNav from '@/components/employee/layout/BottomNav';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ToastProvider from '@/components/admin/shared/ToastProvider';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser();
    const { data: location, isLoading: locationLoading, error } = useEmployeeLocation();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !user) {
            router.push('/sign-in');
        }
    }, [isLoaded, user, router]);

    if (!isLoaded || locationLoading) {
        return (
            <div className="min-h-screen bg-zinc-50">
                <LoadingSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-zinc-900 mb-2">No Location Assigned</h2>
                    <p className="text-zinc-600 mb-4">Please contact your administrator to assign you to a location.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 pb-20">
            <ToastProvider />
            <main className="max-w-4xl mx-auto">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}

