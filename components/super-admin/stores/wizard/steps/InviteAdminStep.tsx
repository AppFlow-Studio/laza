"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ShieldCheck, SkipForward } from 'lucide-react';

const inviteSchema = z.object({
    email: z.string().email('Enter a valid email address'),
});

export type InviteAdminFormData = z.infer<typeof inviteSchema>;

interface InviteAdminStepProps {
    defaultValues?: InviteAdminFormData | null;
    onSubmit: (data: InviteAdminFormData) => void;
    onSkip:   () => void;
}

export default function InviteAdminStep({ defaultValues, onSubmit, onSkip }: InviteAdminStepProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<InviteAdminFormData>({
        resolver: zodResolver(inviteSchema),
        defaultValues: defaultValues || { email: '' },
    });

    return (
        <div className="space-y-6">
            {/* Info banner */}
            <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-sm text-indigo-800">
                    <p className="font-medium mb-0.5">Store Admin access</p>
                    <p className="text-indigo-600">
                        The invited person will receive a Clerk invitation email and can log in immediately.
                        Their role is locked to <strong>admin</strong> and their location is automatically
                        set to this new store.
                    </p>
                </div>
            </div>

            {/* Email form */}
            <form id="invite-admin-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <Label className="my-2" htmlFor="email">Admin Email Address</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input
                            id="email"
                            type="email"
                            {...register('email')}
                            placeholder="manager@lazacafe.com"
                            className={`pl-9 ${errors.email ? 'border-red-500' : ''}`}
                        />
                    </div>
                    {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div className="text-xs text-zinc-500 space-y-1">
                    <p>• Role: <strong>Admin</strong> (cannot be changed here)</p>
                    <p>• Location: automatically assigned to the new store</p>
                    <p>• They will receive a Clerk invitation email</p>
                </div>
            </form>

            {/* Skip option */}
            <div className="border-t border-zinc-100 pt-4">
                <button
                    type="button"
                    onClick={onSkip}
                    className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                    <SkipForward className="w-4 h-4" />
                    Skip for now — invite an admin later from the Users page
                </button>
            </div>
        </div>
    );
}
