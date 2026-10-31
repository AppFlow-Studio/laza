"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCreateInvitation } from '@/lib/hooks/queries/useUsers';
import { useLocations } from '@/lib/hooks/queries/useLocations';
import toast from 'react-hot-toast';
import { User, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Location } from '@/lib/supabase/types';

const inviteSchema = z.object({
    email: z.string().email('Invalid email address'),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.enum(['employee'], {
        errorMap: () => ({ message: 'Please select a role' }),
    }),
    assigned_location_id: z.string().nullable().optional(),
}).refine((data) => {
    // Location required for employees
    if (data.role === 'employee' && !data.assigned_location_id) {
        return false;
    }
    return true;
}, {
    message: 'Location is required for employees',
    path: ['assigned_location_id'],
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserModalProps {
    organizationId: string;
    onSuccess: () => void;
    onClose: () => void;
}

export default function InviteUserModal({ organizationId, onSuccess, onClose }: InviteUserModalProps) {
    const createInvitationMutation = useCreateInvitation();
    const { data: locations } = useLocations();

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<InviteFormData>({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            email: '',
            first_name: '',
            last_name: '',
            role: 'employee',
            assigned_location_id: null,
        },
    });

    const selectedRole = watch('role');

    const onSubmit = async (data: InviteFormData) => {
        try {
            const result = await createInvitationMutation.mutateAsync({
                organizationId,
                email: data.email,
                role: data.role,
                assigned_location_id: data.assigned_location_id || null,
                first_name: data.first_name || undefined,
                last_name: data.last_name || undefined,
            });

            if (result.success) {
                toast.success(result.message);
                onSuccess();
                onClose();
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to send invitation');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <Label htmlFor="email" className="mb-2">Email Address *</Label>
                <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className={errors.email ? 'border-red-500' : ''}
                    placeholder="user@example.com"
                />
                {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="first_name" className="mb-2">First Name (Optional)</Label>
                    <Input
                        id="first_name"
                        {...register('first_name')}
                        placeholder="John"
                    />
                </div>
                <div>
                    <Label htmlFor="last_name" className="mb-2">Last Name (Optional)</Label>
                    <Input
                        id="last_name"
                        {...register('last_name')}
                        placeholder="Doe"
                    />
                </div>
            </div>

            <div>
                <Label className="mb-3 block">Role *</Label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            setValue('role', 'employee');
                            if (selectedRole === 'admin') {
                                setValue('assigned_location_id', null);
                            }
                        }}
                        className={cn(
                            "p-4 border-2 rounded-lg text-left transition-all",
                            selectedRole === 'employee'
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-zinc-200 hover:border-zinc-300"
                        )}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <User className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-zinc-900">Employee</h3>
                                <p className="text-xs text-zinc-500">Manage inventory at assigned location</p>
                            </div>
                        </div>
                    </button>
                </div>
                {errors.role && (
                    <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
                )}
            </div>

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
                        {locations?.map((location: Location) => (
                            <option key={location.id} value={location.id}>
                                {location.name}
                            </option>
                        ))}
                    </select>
                    {errors.assigned_location_id && (
                        <p className="text-sm text-red-500 mt-1">{errors.assigned_location_id.message}</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                        Employees can only manage inventory at their assigned location
                    </p>
                </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-zinc-200">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={createInvitationMutation.isPending}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1"
                    disabled={createInvitationMutation.isPending}
                >
                    {createInvitationMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </Button>
            </div>
        </form>
    );
}

