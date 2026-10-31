"use client";

import { useMemo, useState } from "react";
import { User as UserType } from "@/lib/supabase/types";
import { format } from "date-fns";
import {
    User,
    Building2,
    ShieldCheck,
    MoreVertical,
    Edit,
    ChevronDown,
    ChevronRight,
    MapPin,
    Users,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "motion/react";

// ─── Role config ────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<
    string,
    { label: string; icon: React.ElementType; className: string }
> = {
    super_admin: {
        label: "Super Admin",
        icon: ShieldCheck,
        className: "bg-amber-50 text-amber-600",
    },
    admin: {
        label: "Admin",
        icon: Building2,
        className: "bg-purple-50 text-purple-600",
    },
    employee: {
        label: "Employee",
        icon: User,
        className: "bg-blue-50 text-blue-600",
    },
};

// ─── Types ──────────────────────────────────────────────────────────────────

type UserWithLocation = UserType & {
    assigned_locations?: { id: string; name: string; location_type?: string }[];
};

interface UserGroup {
    key: string;
    label: string;
    icon: React.ElementType;
    iconClassName: string;
    users: UserWithLocation[];
    pinned?: boolean;
    sortOrder: number;
}

interface UserTableProps {
    users: UserWithLocation[];
    onEdit: (user: UserWithLocation) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getUserDisplayName(user: UserType): string {
    if (user.first_name && user.last_name)
        return `${user.first_name} ${user.last_name}`;
    if (user.first_name) return user.first_name;
    return user.email;
}

function getUserInitials(user: UserType): string {
    if (user.first_name) return user.first_name[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "U";
}

function sortAlpha(a: UserWithLocation, b: UserWithLocation): number {
    return getUserDisplayName(a)
        .toLowerCase()
        .localeCompare(getUserDisplayName(b).toLowerCase());
}

// ─── Inline user row (compact) ──────────────────────────────────────────────

function UserRow({
                     user,
                     onEdit,
                 }: {
    user: UserWithLocation;
    onEdit: (user: UserWithLocation) => void;
}) {
    const role = ROLE_CONFIG[user.role ?? "employee"] ?? ROLE_CONFIG.employee;
    const RoleIcon = role.icon;

    return (
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors group">
            {/* Avatar */}
            {user.avatar_url ? (
                <img
                    src={user.avatar_url}
                    alt={getUserDisplayName(user)}
                    className="w-9 h-9 rounded-full flex-shrink-0"
                />
            ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm flex-shrink-0">
                    {getUserInitials(user)}
                </div>
            )}

            {/* Name + email */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                    {getUserDisplayName(user)}
                </p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>

            {/* Role badge */}
            <span
                className={cn(
                    "hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0",
                    role.className,
                )}
            >
                <RoleIcon className="w-3 h-3" />
                {role.label}
            </span>

            {/* Status */}
            <span
                className={cn(
                    "hidden md:inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
                    user.is_active
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-600",
                )}
            >
                {user.is_active ? "Active" : "Inactive"}
            </span>

            {/* Joined date */}
            <span className="hidden lg:inline text-xs text-zinc-400 flex-shrink-0 w-24 text-right">
                {format(new Date(user.created_at), "MMM d, yyyy")}
            </span>

            {/* Actions */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
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
        </div>
    );
}

// ─── Collapsible group section ──────────────────────────────────────────────

function GroupSection({
                          group,
                          isOpen,
                          onToggle,
                          onEdit,
                      }: {
    group: UserGroup;
    isOpen: boolean;
    onToggle: () => void;
    onEdit: (user: UserWithLocation) => void;
}) {
    const Icon = group.icon;
    const adminCount = group.users.filter(
        (u) => u.role === "admin" || u.role === "super_admin",
    ).length;
    const employeeCount = group.users.filter(
        (u) => u.role === "employee",
    ).length;

    return (
        <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
            {/* Header — always visible */}
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left"
            >
                {/* Expand/collapse chevron */}
                <div className="flex-shrink-0 text-zinc-400">
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </div>

                {/* Group icon */}
                <div
                    className={cn(
                        "p-1.5 rounded-lg flex-shrink-0",
                        group.iconClassName,
                    )}
                >
                    <Icon className="w-4 h-4" />
                </div>

                {/* Group name + counts */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                        {group.label}
                    </p>
                </div>

                {/* Member count badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {adminCount > 0 && (
                        <span className="text-xs text-purple-600 bg-purple-50 rounded-full px-2 py-0.5 font-medium">
                            {adminCount} admin{adminCount !== 1 ? "s" : ""}
                        </span>
                    )}
                    {employeeCount > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 font-medium">
                            {employeeCount} employee{employeeCount !== 1 ? "s" : ""}
                        </span>
                    )}
                    <span className="text-xs text-zinc-400 font-medium">
                        {group.users.length} total
                    </span>
                </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="border-t border-zinc-100 divide-y divide-zinc-100">
                            {group.users.map((user) => (
                                <UserRow
                                    key={user.id}
                                    user={user}
                                    onEdit={onEdit}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function UserTable({ users, onEdit }: UserTableProps) {
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const [allExpanded, setAllExpanded] = useState(false);

    // Build groups
    const groups = useMemo<UserGroup[]>(() => {
        const superAdmins: UserWithLocation[] = [];
        const orgWideAdmins: UserWithLocation[] = [];
        const locationMap = new Map<string, { name: string; users: UserWithLocation[] }>();
        const unassigned: UserWithLocation[] = [];

        for (const user of users) {
            // 1. Super admins → pinned at top
            if (user.role === "super_admin") {
                superAdmins.push(user);
                continue;
            }

            // 2. Admins with no assigned locations → org-wide section
            if (user.role === "admin" && (!user.assigned_locations || user.assigned_locations.length === 0)) {
                orgWideAdmins.push(user);
                continue;
            }

            // 3. Users with assigned location(s) → group by location
            if (user.assigned_locations && user.assigned_locations.length > 0) {
                for (const loc of user.assigned_locations) {
                    if (!locationMap.has(loc.id)) {
                        locationMap.set(loc.id, { name: loc.name, users: [] });
                    }
                    if (!locationMap.get(loc.id)!.users.find((u) => u.id === user.id)) {
                        locationMap.get(loc.id)!.users.push(user);
                    }
                }
                continue;
            }

            // 4. Everyone else → unassigned
            unassigned.push(user);
        }

        const result: UserGroup[] = [];

        // Pinned: Super Admins
        if (superAdmins.length > 0) {
            result.push({
                key: "__super_admins__",
                label: "Super Admins",
                icon: ShieldCheck,
                iconClassName: "bg-amber-50 text-amber-600",
                users: superAdmins.sort(sortAlpha),
                pinned: true,
                sortOrder: 0,
            });
        }

        // Pinned: Org-wide Admins
        if (orgWideAdmins.length > 0) {
            result.push({
                key: "__org_wide_admins__",
                label: "Organization-wide Admins",
                icon: Building2,
                iconClassName: "bg-purple-50 text-purple-600",
                users: orgWideAdmins.sort(sortAlpha),
                pinned: true,
                sortOrder: 1,
            });
        }

        // Location groups — sorted alphabetically by location name
        const locationGroups = Array.from(locationMap.entries())
            .sort(([, a], [, b]) => a.name.localeCompare(b.name))
            .map(([locId, { name, users: locUsers }], index) => {
                // Within each location: admins first, then employees, each alphabetical
                const admins = locUsers
                    .filter((u) => u.role === "admin")
                    .sort(sortAlpha);
                const employees = locUsers
                    .filter((u) => u.role === "employee")
                    .sort(sortAlpha);

                return {
                    key: locId,
                    label: name,
                    icon: MapPin,
                    iconClassName: "bg-indigo-50 text-indigo-600",
                    users: [...admins, ...employees],
                    pinned: false,
                    sortOrder: 10 + index,
                } satisfies UserGroup;
            });

        result.push(...locationGroups);

        // Unassigned at the bottom
        if (unassigned.length > 0) {
            result.push({
                key: "__unassigned__",
                label: "Unassigned",
                icon: AlertCircle,
                iconClassName: "bg-zinc-100 text-zinc-500",
                users: unassigned.sort(sortAlpha),
                pinned: false,
                sortOrder: 9999,
            });
        }

        return result;
    }, [users]);

    // Toggle a single group
    const toggleGroup = (key: string) => {
        setOpenGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // Expand / collapse all
    const handleToggleAll = () => {
        if (allExpanded) {
            setOpenGroups(new Set());
            setAllExpanded(false);
        } else {
            setOpenGroups(new Set(groups.map((g) => g.key)));
            setAllExpanded(true);
        }
    };

    // Alphabet index — first letter of each location group for quick jump
    const locationGroups = groups.filter((g) => !g.pinned && g.key !== "__unassigned__");
    const letterIndex = useMemo(() => {
        const letters = new Map<string, string>(); // letter -> first group key with that letter
        for (const g of locationGroups) {
            const letter = g.label[0].toUpperCase();
            if (!letters.has(letter)) {
                letters.set(letter, g.key);
            }
        }
        return letters;
    }, [locationGroups]);

    const scrollToGroup = (groupKey: string) => {
        // Open the group first
        setOpenGroups((prev) => new Set([...prev, groupKey]));
        // Scroll into view
        setTimeout(() => {
            document
                .getElementById(`user-group-${groupKey}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
    };

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Users className="w-4 h-4" />
                    <span>
                        {users.length} member{users.length !== 1 ? "s" : ""} across{" "}
                        {locationGroups.length} location{locationGroups.length !== 1 ? "s" : ""}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleToggleAll}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                    {allExpanded ? "Collapse all" : "Expand all"}
                </button>
            </div>

            {/* Alphabet quick-jump (only when 5+ location groups) */}
            {letterIndex.size >= 5 && (
                <div className="flex flex-wrap gap-1">
                    {Array.from(letterIndex.entries()).map(([letter, groupKey]) => (
                        <button
                            key={letter}
                            type="button"
                            onClick={() => scrollToGroup(groupKey)}
                            className="w-7 h-7 rounded-lg text-xs font-semibold text-zinc-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center"
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            )}

            {/* Groups */}
            <div className="space-y-2">
                {groups.map((group) => (
                    <div key={group.key} id={`user-group-${group.key}`}>
                        <GroupSection
                            group={group}
                            isOpen={openGroups.has(group.key)}
                            onToggle={() => toggleGroup(group.key)}
                            onEdit={onEdit}
                        />
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {groups.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                    <Users className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500">No users found</p>
                </div>
            )}
        </div>
    );
}