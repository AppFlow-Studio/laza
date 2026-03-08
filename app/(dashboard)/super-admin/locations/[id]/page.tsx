"use client";

import { useState, useMemo } from 'react';
import { useLocationWithDetails } from '@/lib/hooks/queries/useLocations';
import { useEmployeesByLocation } from '@/lib/hooks/queries/useEmployees';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { ArrowLeft, Plus, Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import StorageSetupWizard from '@/components/admin/locations/StorageSetupWizard';
import UpdateLimitsManager from '@/components/admin/locations/UpdateLimitsManager';
import { StorageSpace } from '@/lib/supabase/types';
import SearchBar from '@/components/admin/shared/SearchBar';

export default function LocationDetailPage() {
    const params = useParams();
    const locationId = params.id as string;
    const { data: location, isLoading, refetch: refetchLocation } = useLocationWithDetails(locationId);
    const { data: employees } = useEmployeesByLocation(locationId);
    const [showStorageSetup, setShowStorageSetup] = useState(false);
    const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');

    // Filter employees based on search query
    const filteredEmployees = useMemo(() => {
        if (!employees) return [];
        if (!employeeSearchQuery) return employees;

        const query = employeeSearchQuery.toLowerCase();
        return employees.filter((employee) => {
            const fullName = employee.first_name && employee.last_name
                ? `${employee.first_name} ${employee.last_name}`.toLowerCase()
                : (employee.first_name || '').toLowerCase();
            const email = (employee.email || '').toLowerCase();
            return fullName.includes(query) || email.includes(query);
        });
    }, [employees, employeeSearchQuery]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton className="h-12 w-64" />
                <LoadingSkeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!location) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-500">Location not found</p>
                <Link href="/admin/locations">
                    <Button className="mt-4">Back to Locations</Button>
                </Link>
            </div>
        );
    }

    const address = typeof location.address === 'string'
        ? JSON.parse(location.address)
        : location.address;

    return (
        <div className="space-y-6">
            <nav className="mb-6" aria-label="Breadcrumb">
                <ol className="flex items-center text-sm text-zinc-600 space-x-2">
                    <li>
                        <Link href="/admin/locations" className="flex items-center hover:underline">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Locations
                        </Link>
                    </li>
                    <li>
                        <span className="mx-2 text-zinc-400">/</span>
                    </li>
                    <li className="truncate font-semibold text-zinc-900">
                        {location.name}
                    </li>
                </ol>
            </nav>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <h1 className="text-2xl font-semibold text-zinc-900 mb-2">{location.name}</h1>
                <p className="text-zinc-600">
                    {address.street}, {address.city}, {address.state} {address.zip}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900">Storage Spaces</h2>
                        <Button
                            onClick={() => setShowStorageSetup(true)}
                            size="sm"
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Setup Storage
                        </Button>
                    </div>
                    {location.storage_spaces && location.storage_spaces.length > 0 ? (
                        <div className="space-y-2">
                            {location.storage_spaces.map((space: StorageSpace) => (
                                <Link
                                    key={space.id}
                                    href={`/admin/locations/${locationId}/storage-spaces/${space.id}`}
                                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Package className="w-4 h-4 text-zinc-400" />
                                        <span className="font-medium">{space.name}</span>
                                    </div>
                                    <span className="text-sm text-zinc-600 capitalize">{space.temperature_type}</span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-500 mb-4">No storage spaces configured</p>
                            <Button
                                onClick={() => setShowStorageSetup(true)}
                                variant="outline"
                                size="sm"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Setup Storage
                            </Button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-zinc-900">Employees</h2>
                    </div>
                    {employees && employees.length > 0 ? (
                        <>
                            <div className="mb-4">
                                <SearchBar
                                    placeholder="Search employees by name or email..."
                                    onSearch={setEmployeeSearchQuery}
                                />
                            </div>
                            {filteredEmployees.length > 0 ? (
                                <div className="space-y-2">
                                    {filteredEmployees.map((employee) => (
                                        <div key={employee.id} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                                                {employee.first_name?.[0] || employee.email[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {employee.first_name && employee.last_name
                                                        ? `${employee.first_name} ${employee.last_name}`
                                                        : employee.first_name || employee.email}
                                                </p>
                                                <p className="text-xs text-zinc-500">{employee.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-zinc-500 text-center py-4">No employees found matching your search</p>
                            )}
                        </>
                    ) : (
                        <p className="text-zinc-500">No employees assigned</p>
                    )}
                </div>
            </div>

            {/* Update Limits Section */}
            <UpdateLimitsManager
                locationId={locationId}
                storageSpaces={location.storage_spaces || []}
            />

            {/* Storage Setup Wizard */}
            <MobileSheet
                isOpen={showStorageSetup}
                onClose={() => setShowStorageSetup(false)}
                title="Setup Storage Space"
                snapPoints={[0.7, 0.95]}
            >
                <StorageSetupWizard
                    locationId={locationId}
                    onComplete={() => {
                        refetchLocation();
                        setShowStorageSetup(false);
                    }}
                    onClose={() => setShowStorageSetup(false)}
                />
            </MobileSheet>
        </div>
    );
}

