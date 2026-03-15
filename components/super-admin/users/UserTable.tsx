"use client";

import { User as UserType } from '@/lib/supabase/types';
import { format } from 'date-fns';
import { User, Building2, MoreVertical, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserTableProps {
    users: (UserType & { assigned_location?: any })[];
    onEdit: (user: UserType & { assigned_location?: any }) => void;
}

export default function UserTable({ users, onEdit }: UserTableProps) {
    const getUserDisplayName = (user: UserType) => {
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        if (user.first_name) {
            return user.first_name;
        }
        return user.email;
    };

    const getUserInitials = (user: UserType) => {
        if (user.first_name) {
            return user.first_name[0].toUpperCase();
        }
        if (user.email) {
            return user.email[0].toUpperCase();
        }
        return 'U';
    };

    return (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Location
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Joined
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={getUserDisplayName(user)}
                                                className="w-10 h-10 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                                                {getUserInitials(user)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-zinc-900">{getUserDisplayName(user)}</p>
                                            <p className="text-sm text-zinc-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        
                                    )}>
                                        {user.role === 'admin' ? (
                                            <span className="flex items-center gap-1 bg-purple-50 text-purple-600 rounded-full px-2 py-1 w-fit">
                                                <Building2 className="w-3 h-3  " />
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 bg-blue-50 text-blue-600 rounded-full px-2 py-1 w-fit">
                                                <User className="w-3 h-3 text-blue-600 " />
                                                Employee
                                            </span>
                                        )}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    {user.assigned_location ? (
                                        <span className="text-sm text-zinc-900">{user.assigned_location.name}</span>
                                    ) : user.role === 'admin' ? (
                                        <span className="text-sm text-zinc-400">All Locations</span>
                                    ) : (
                                        <span className="text-sm text-zinc-400">Unassigned</span>
                                    )}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={cn(
                                        "px-2 py-1 rounded-full text-xs font-medium",
                                        user.is_active
                                            ? "bg-green-50 text-green-600"
                                            : "bg-red-50 text-red-600"
                                    )}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="text-sm text-zinc-600">
                                        {format(new Date(user.created_at), 'MMM d, yyyy')}
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
                                            <DropdownMenuItem onClick={() => onEdit(user)}>
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit User
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

