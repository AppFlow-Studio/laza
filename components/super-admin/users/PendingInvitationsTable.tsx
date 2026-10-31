"use client";

import { OrgInvite } from '@/lib/supabase/types';
import { format } from 'date-fns';
import { Mail, MoreVertical, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCancelInvitation, useResendInvitation } from '@/lib/hooks/queries/useUsers';
import toast from 'react-hot-toast';

interface PendingInvitationsTableProps {
    invitations: OrgInvite[];
}

export default function PendingInvitationsTable({ invitations }: PendingInvitationsTableProps) {
    const cancelInvitationMutation = useCancelInvitation();
    const resendInvitationMutation = useResendInvitation();

    const handleResend = async (invitationId: string) => {
        try {
            const result = await resendInvitationMutation.mutateAsync(invitationId);
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to resend invitation');
        }
    };

    const handleCancel = async (clerkInviteId: string) => {
        if (!confirm('Are you sure you want to cancel this invitation?')) {
            return;
        }

        try {
            const result = await cancelInvitationMutation.mutateAsync({
                clerkInviteId: clerkInviteId,
            });
            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel invitation');
        }
    };

    if (invitations.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                <Mail className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500">No pending invitations</p>
            </div>
        );
    }
    console.log('invitations', invitations);

    return (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Sent
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {invitations.map((invitation) => (
                            <tr key={invitation.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-zinc-400" />
                                        <span className="font-medium text-zinc-900">{invitation.email}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        invitation.role === 'admin'
                                            ? "bg-purple-50 text-purple-600"
                                            : "bg-blue-50 text-blue-600"
                                    )}>
                                        {invitation.role === 'admin' ? 'Admin' : 'Employee'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-600">
                                        Pending
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-sm text-zinc-600">
                                        {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => handleResend(invitation.id)}
                                                disabled={resendInvitationMutation.isPending}
                                            >
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Resend
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleCancel(invitation.clerk_invite_id)}
                                                disabled={cancelInvitationMutation.isPending}
                                                className="text-red-600"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

