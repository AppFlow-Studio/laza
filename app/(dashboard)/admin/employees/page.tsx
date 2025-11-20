"use client";

import { useState } from 'react';
import { useEmployees } from '@/lib/hooks/queries/useEmployees';
import EmployeeCard from '@/components/admin/employees/EmployeeCard';
import SearchBar from '@/components/admin/shared/SearchBar';
import FilterDropdown from '@/components/admin/shared/FilterDropdown';
import { LoadingSkeleton, CardSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { useUpdateEmployee, useActivateEmployee } from '@/lib/hooks/queries/useEmployees';
import toast from 'react-hot-toast';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocations } from '@/lib/hooks/queries/useLocations';
import { useForm } from 'react-hook-form';

export default function EmployeesPage() {
    const { data: employees, isLoading } = useEmployees();
    const { data: locations } = useLocations();
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const debouncedSearch = useDebounce(searchQuery, 300);
    const updateMutation = useUpdateEmployee();
    const activateMutation = useActivateEmployee();

    const filteredEmployees = employees?.filter((employee) => {
        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            const name = `${employee.first_name || ''} ${employee.last_name || ''}`.toLowerCase();
            const email = employee.email.toLowerCase();
            if (!name.includes(searchLower) && !email.includes(searchLower)) {
                return false;
            }
        }
        if (roleFilter && employee.role !== roleFilter) return false;
        if (statusFilter) {
            const isActive = employee.is_active;
            if (statusFilter === 'active' && !isActive) return false;
            if (statusFilter === 'inactive' && isActive) return false;
        }
        return true;
    }) || [];

    const handleUpdate = async (data: any) => {
        try {
            await updateMutation.mutateAsync({
                id: editingEmployee.id,
                updates: data,
            });
            toast.success('Employee updated successfully');
            setEditingEmployee(null);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update employee');
        }
    };

    const handleToggleActive = async (employeeId: string, isActive: boolean) => {
        try {
            await activateMutation.mutateAsync({ id: employeeId, isActive: !isActive });
            toast.success(`Employee ${!isActive ? 'activated' : 'deactivated'}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update employee');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900">Employees</h1>
                <p className="text-sm text-zinc-600 mt-1">Manage your team members</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <SearchBar
                        placeholder="Search employees..."
                        onSearch={setSearchQuery}
                    />
                </div>
                <FilterDropdown
                    label="Role"
                    options={[
                        { value: 'admin', label: 'Admin' },
                        { value: 'employee', label: 'Employee' },
                    ]}
                    value={roleFilter}
                    onChange={setRoleFilter}
                />
                <FilterDropdown
                    label="Status"
                    options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
            </div>

            {/* Employees Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                    <p className="text-zinc-500">No employees found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.map((employee) => (
                        <EmployeeCard
                            key={employee.id}
                            employee={employee}
                            onEdit={() => setEditingEmployee(employee)}
                            onDelete={() => handleToggleActive(employee.id, employee.is_active)}
                        />
                    ))}
                </div>
            )}

            {/* Edit Form */}
            {editingEmployee && (
                <MobileSheet
                    isOpen={!!editingEmployee}
                    onClose={() => setEditingEmployee(null)}
                    title="Edit Employee"
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleUpdate({
                                role: formData.get('role'),
                                assigned_location_id: formData.get('location') || null,
                            });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label htmlFor="role">Role</Label>
                            <select
                                id="role"
                                name="role"
                                defaultValue={editingEmployee.role || 'employee'}
                                className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
                            >
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="location">Assigned Location</Label>
                            <select
                                id="location"
                                name="location"
                                defaultValue={editingEmployee.assigned_location_id || ''}
                                className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
                            >
                                <option value="">Unassigned</option>
                                {locations?.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </MobileSheet>
            )}
        </div>
    );
}

