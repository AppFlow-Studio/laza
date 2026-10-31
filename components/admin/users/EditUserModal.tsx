"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUpdateUser, useUserLocationAssignments } from '@/lib/hooks/queries/useUsers';
import { useLocations } from '@/lib/hooks/queries/useLocations';
import toast from 'react-hot-toast';
import { User } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserX } from 'lucide-react';

const editUserSchema = z.object({
    role: z.enum(['admin', 'employee']),
    assigned_location_id: z.string().nullable().optional(),
    is_active: z.boolean(),
}).refine((data) => {
    if (data.role === 'employee' && !data.assigned_location_id) {
        return false;
    }
    return true;
}, {
    message: 'Location is required for employees',
    path: ['assigned_location_id'],
});

type EditUserFormData = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
    user: User & { assigned_location?: any };
    onSuccess: () => void;
    onClose: () => void;
}

export default function EditUserModal({ user, onSuccess, onClose }: EditUserModalProps) {
    const updateUserMutation = useUpdateUser();
    const { data: locations } = useLocations();
    const { data: currentAssignments = [] } = useUserLocationAssignments(user.id);

    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [pendingFormData, setPendingFormData] = useState<EditUserFormData | null>(null);

    // Admin multi-location state — populated from the junction table query
    const [adminLocationIds, setAdminLocationIds] = useState<string[]>([]);

    // Sync junction table data into state once loaded
    const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
    if (currentAssignments.length > 0 && !assignmentsLoaded) {
        if (user.role === 'admin') setAdminLocationIds(currentAssignments);
        setAssignmentsLoaded(true);
    }

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<EditUserFormData>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            role: (user.role as 'admin' | 'employee') || 'employee',
            assigned_location_id: user.role === 'employee'
                ? (currentAssignments[0] ?? null)
                : null,
            is_active: user.is_active ?? true,
        },
    });

    const selectedRole = watch('role');
    const isActive = watch('is_active');

    const handleRoleChange = (role: 'admin' | 'employee') => {
        setValue('role', role);
        setValue('assigned_location_id', null);
        if (role !== 'admin') setAdminLocationIds([]);
    };

    const toggleAdminLocation = (locationId: string) => {
        setAdminLocationIds(prev =>
            prev.includes(locationId)
                ? prev.filter(id => id !== locationId)
                : [...prev, locationId]
        );
    };

    const onSubmit = async (data: EditUserFormData) => {
        if (!data.is_active && user.is_active) {
            setPendingFormData(data);
            setShowDeactivateConfirm(true);
            return;
        }
        await executeUpdate(data);
    };

    const executeUpdate = async (data: EditUserFormData) => {
        try {
            onClose();
            const result = await updateUserMutation.mutateAsync({
                userId: user.id,
                role: data.role,
                assigned_location_id: data.role === 'employee' ? (data.assigned_location_id || null) : null,
                assigned_location_ids: data.role === 'admin' ? adminLocationIds : undefined,
                is_active: data.is_active,
            });

            if (result.success) {
                toast.success(result.message);
                onSuccess();
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update user');
        }
    };

    const handleConfirmDeactivate = () => {
        if (pendingFormData) executeUpdate(pendingFormData);
        setShowDeactivateConfirm(false);
        setPendingFormData(null);
    };

    const handleCancelDeactivate = () => {
        setShowDeactivateConfirm(false);
        setPendingFormData(null);
    };

    const userName = user.first_name || user.last_name
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
        : user.email;

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="p-4 bg-zinc-50 rounded-lg">
                    <p className="text-sm text-zinc-600 mb-1">Email</p>
                    <p className="font-medium text-zinc-900">{user.email}</p>
                    <p className="text-sm text-zinc-600 mt-2 mb-1">Name</p>
                    <p className="font-medium text-zinc-900">
                        {user.first_name || user.last_name
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'Not set'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">
                        Name and email are managed by Clerk and cannot be edited here
                    </p>
                </div>

                {/* Role */}
                <div>
                    <Label htmlFor="role" className="mb-2">Role *</Label>
                    <select
                        id="role"
                        {...register('role')}
                        onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'employee')}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
                    >
                        <option value="employee">Employee</option>
                        <option value="admin">Admin</option>
                    </select>
                    {errors.role && (
                        <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
                    )}
                </div>

                {/* Employee: single location */}
                {selectedRole === 'employee' && (
                    <div>
                        <Label htmlFor="assigned_location_id" className="mb-2">
                            Assigned Location *
                        </Label>
                        <select
                            id="assigned_location_id"
                            {...register('assigned_location_id')}
                            className={cn(
                                "w-full px-3 py-2 border rounded-lg",
                                errors.assigned_location_id ? 'border-red-500' : 'border-zinc-200'
                            )}
                        >
                            <option value="">Select a location</option>
                            {locations?.map((location) => (
                                <option key={location.id} value={location.id}>
                                    {location.name}
                                </option>
                            ))}
                        </select>
                        {errors.assigned_location_id && (
                            <p className="text-sm text-red-500 mt-1">{errors.assigned_location_id.message}</p>
                        )}
                    </div>
                )}

                {/* Admin: multi-location */}
                {selectedRole === 'admin' && (
                    <div>
                        <Label className="mb-2 block">Assigned Locations</Label>
                        <p className="text-xs text-zinc-500 mb-3">
                            Leave empty to grant access to all locations.
                        </p>
                        <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100 max-h-52 overflow-y-auto">
                            {locations?.map((location) => {
                                const selected = adminLocationIds.includes(location.id);
                                return (
                                    <button
                                        key={location.id}
                                        type="button"
                                        onClick={() => toggleAdminLocation(location.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                                            selected ? "bg-indigo-50" : "hover:bg-zinc-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                            selected ? "bg-indigo-500 border-indigo-500" : "border-zinc-300"
                                        )}>
                                            {selected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={cn(
                                            "text-sm font-medium",
                                            selected ? "text-indigo-900" : "text-zinc-800"
                                        )}>
                                            {location.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className={cn(
                            "text-xs mt-2",
                            adminLocationIds.length > 0 ? "text-indigo-600 font-medium" : "text-zinc-400"
                        )}>
                            {adminLocationIds.length === 0
                                ? 'No locations selected — access to all locations'
                                : `${adminLocationIds.length} location${adminLocationIds.length !== 1 ? 's' : ''} selected`}
                        </p>
                    </div>
                )}

                {/* Status */}
                <div>
                    <Label className="mb-2 block">Status</Label>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="is_active"
                            {...register('is_active')}
                            className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Label htmlFor="is_active" className="cursor-pointer">
                            <span className={cn("font-medium", isActive ? "text-green-600" : "text-red-600")}>
                                {isActive ? 'Active' : 'Inactive'}
                            </span>
                        </Label>
                    </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-zinc-200">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                        disabled={updateUserMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1"
                        disabled={updateUserMutation.isPending}
                    >
                        {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>

            <AlertDialog open={showDeactivateConfirm} onOpenChange={setShowDeactivateConfirm}>
                <AlertDialogContent className="sm:max-w-[425px]">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
                                <UserX className="w-6 h-6 text-amber-600" />
                            </div>
                            <AlertDialogTitle className="text-xl font-semibold text-zinc-900">
                                Deactivate User
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-base text-zinc-600 pt-2">
                            Are you sure you want to deactivate <span className="font-semibold text-zinc-900">"{userName}"</span>?
                            <br /><br />
                            This will prevent them from accessing the system. You can reactivate them at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel onClick={handleCancelDeactivate} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDeactivate}
                            className="bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-600"
                        >
                            Deactivate User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
