"use client";

import { SignOutButton, useUser } from '@clerk/nextjs';
import { useEmployeeLocation } from '@/lib/hooks/queries/useEmployee';
import BottomNav from '@/components/employee/layout/BottomNav';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ToastProvider from '@/components/admin/shared/ToastProvider';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import { UserX, Mail, Shield, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoaded } = useUser();
    const { data: location, isLoading: locationLoading, error } = useEmployeeLocation();
    const { data: userInfo } = useUserInfo();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && !user) {
            router.push('/sign-in');
        }
    }, [isLoaded, user, router]);

    if (!isLoaded || locationLoading || !userInfo) {
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

    if (userInfo.is_active === false) {
        const userName = userInfo.first_name || userInfo.last_name
            ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim()
            : 'User';
        const organizationName = userInfo.members?.organizations?.name || 'Organization';

        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full">
                    <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
                        {/* Header */}
                        <div className="bg-amber-50 border-b border-amber-200 px-6 py-5">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
                                    <UserX className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold text-zinc-900">Account Inactive</h1>
                                    <p className="text-sm text-zinc-600 mt-0.5">Your account has been deactivated</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Warning Message */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-sm text-amber-800">
                                    Your account is currently inactive. Please contact your administrator to reactivate your account and regain access to the system.
                                </p>
                            </div>

                            {/* Account Information */}
                            <div className="space-y-4">
                                <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Account Information</h2>

                                <div className="space-y-3">
                                    {/* Name */}
                                    <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg">
                                        <UserX className="w-5 h-5 text-zinc-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-zinc-500 mb-1">Name</p>
                                            <p className="text-sm font-medium text-zinc-900">
                                                {userInfo.first_name || userInfo.last_name
                                                    ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim()
                                                    : 'Not set'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg">
                                        <Mail className="w-5 h-5 text-zinc-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-zinc-500 mb-1">Email</p>
                                            <p className="text-sm font-medium text-zinc-900 break-all">{userInfo.email}</p>
                                        </div>
                                    </div>

                                    {/* Role */}
                                    <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg">
                                        <Shield className="w-5 h-5 text-zinc-400 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-zinc-500 mb-1">Role</p>
                                            <p className="text-sm font-medium text-zinc-900 capitalize">
                                                {userInfo.role || 'Not assigned'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Organization */}
                                    {organizationName && (
                                        <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg">
                                            <Building2 className="w-5 h-5 text-zinc-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-zinc-500 mb-1">Organization</p>
                                                <p className="text-sm font-medium text-zinc-900">{organizationName}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action */}
                            <SignOutButton>
                                <Button variant="outline" className="w-full" size="lg">
                                    Sign Out
                                </Button>
                            </SignOutButton>
                        </div>
                    </div>
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

