"use client";

import { useState, useMemo } from 'react';
import { useOrganizationUsers, usePendingInvitations } from '@/lib/hooks/queries/useUsers';
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';
import UserTable from '@/components/admin/users/UserTable';
import PendingInvitationsTable from '@/components/admin/users/PendingInvitationsTable';
import InviteUserModal from '@/components/admin/users/InviteUserModal';
import EditUserModal from '@/components/admin/users/EditUserModal';
import MobileSheet from '@/components/admin/shared/MobileSheet';
import SearchBar from '@/components/admin/shared/SearchBar';
import FilterDropdown from '@/components/admin/shared/FilterDropdown';
import { LoadingSkeleton } from '@/components/admin/shared/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Plus, Users, Shield, User, Mail } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { User as UserType } from '@/lib/supabase/types';
import { motion } from 'framer-motion';

export default function UsersPage() {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;

    const { data: users, isLoading: usersLoading } = useOrganizationUsers(organizationId);
    const { data: invitations, isLoading: invitationsLoading } = usePendingInvitations(organizationId);

    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingUser, setEditingUser] = useState<(UserType & { assigned_location?: any }) | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const debouncedSearch = useDebounce(searchQuery, 300);

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        return users.filter((user) => {
            if (debouncedSearch) {
                const searchLower = debouncedSearch.toLowerCase();
                const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
                const email = user.email.toLowerCase();
                if (!name.includes(searchLower) && !email.includes(searchLower)) {
                    return false;
                }
            }
            if (roleFilter && user.role !== roleFilter) return false;
            if (statusFilter) {
                const isActive = user.is_active;
                if (statusFilter === 'active' && !isActive) return false;
                if (statusFilter === 'inactive' && isActive) return false;
            }
            return true;
        });
    }, [users, debouncedSearch, roleFilter, statusFilter]);

    const stats = useMemo(() => {
        if (!users) return { active: 0, admins: 0, employees: 0 };
        return {
            active: users.filter((u) => u.is_active).length,
            admins: users.filter((u) => u.role === 'admin').length,
            employees: users.filter((u) => u.role === 'employee').length,
        };
    }, [users]);

    if (usersLoading || invitationsLoading) {
        return <LoadingSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">Team Members</h1>
                    <p className="text-sm text-zinc-600 mt-1">Manage your organization's users and invitations</p>
                </div>
                <Button onClick={() => setShowInviteModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Invite User
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 mb-1">Active Users</p>
                            <p className="text-3xl font-bold text-zinc-900">{stats.active}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 mb-1">Admins</p>
                            <p className="text-3xl font-bold text-zinc-900">{stats.admins}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Shield className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="bg-white rounded-xl shadow-sm p-6 border border-zinc-200"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-zinc-600 mb-1">Employees</p>
                            <p className="text-3xl font-bold text-zinc-900">{stats.employees}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <User className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <SearchBar
                        placeholder="Search by name or email..."
                        onSearch={setSearchQuery}
                    />
                </div>
                <FilterDropdown
                    label="Role"
                    options={[
                        { value: null, label: 'All Roles' },
                        { value: 'admin', label: 'Admins' },
                        { value: 'employee', label: 'Employees' },
                    ]}
                    value={roleFilter}
                    onChange={setRoleFilter}
                />
                <FilterDropdown
                    label="Status"
                    options={[
                        { value: null, label: 'All Status' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                />
            </div>

            {/* Users Table */}
            <div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">Users</h2>
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                        <Users className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-500">No users found matching your filters</p>
                    </div>
                ) : (
                    <UserTable users={filteredUsers} onEdit={setEditingUser} />
                )}
            </div>

            {/* Pending Invitations */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-zinc-900">Pending Invitations</h2>
                    {invitations && invitations.length > 0 && (
                        <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded-full text-xs font-medium">
                            {invitations.length} pending
                        </span>
                    )}
                </div>
                <PendingInvitationsTable invitations={invitations || []} />
            </div>

            {/* Invite User Modal */}
            {organizationId && (
                <MobileSheet
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    title="Invite User"
                >
                    <InviteUserModal
                        organizationId={organizationId}
                        onSuccess={() => setShowInviteModal(false)}
                        onClose={() => setShowInviteModal(false)}
                    />
                </MobileSheet>
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <MobileSheet
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    title="Edit User"
                >
                    <EditUserModal
                        user={editingUser}
                        onSuccess={() => setEditingUser(null)}
                        onClose={() => setEditingUser(null)}
                    />
                </MobileSheet>
            )}
        </div>
    );
}

