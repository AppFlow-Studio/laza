"use client";

import { use } from 'react';
import { useLocationWithDetails } from '@/lib/hooks/queries/useLocations';
import { useEmployeesByLocation } from '@/lib/hooks/queries/useEmployees';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';

export default function LocationDetailPage() {
    const params = useParams();
    const locationId = params.id as string;
    const { data: location, isLoading } = useLocationWithDetails(locationId);
    const { data: employees } = useEmployeesByLocation(locationId);

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
            <Link href="/admin/locations">
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Locations
                </Button>
            </Link>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                <h1 className="text-2xl font-semibold text-zinc-900 mb-2">{location.name}</h1>
                <p className="text-zinc-600">
                    {address.street}, {address.city}, {address.state} {address.zip}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                    <h2 className="text-lg font-semibold text-zinc-900 mb-4">Storage Spaces</h2>
                    {location.storage_spaces && location.storage_spaces.length > 0 ? (
                        <div className="space-y-2">
                            {location.storage_spaces.map((space) => (
                                <div key={space.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                                    <span className="font-medium">{space.name}</span>
                                    <span className="text-sm text-zinc-600">{space.temperature_type}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-zinc-500">No storage spaces configured</p>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200">
                    <h2 className="text-lg font-semibold text-zinc-900 mb-4">Employees</h2>
                    {employees && employees.length > 0 ? (
                        <div className="space-y-2">
                            {employees.map((employee) => (
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
                        <p className="text-zinc-500">No employees assigned</p>
                    )}
                </div>
            </div>
        </div>
    );
}

