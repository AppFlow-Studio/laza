"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
    LayoutDashboard,
    Users,
    Package,
    BarChart3,
    LogOut,
    Home,
    Tags,
    Settings,
    StretchHorizontal,
    Warehouse,
    Thermometer,
    ShoppingBag,
    Plus,
} from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import ToastProvider from "@/components/admin/shared/ToastProvider";
import { ErrorBoundary } from "@/components/admin/shared/ErrorBoundary";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { useLocations, useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAdminStore } from "@/lib/stores/adminStore";
import { useEffect } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useActiveTicketCountForLocation } from "@/lib/hooks/queries/useOrderTickets";
import { useInventoryUpdateRequests } from "@/lib/hooks/queries/useInventoryUpdateRequests";
import { NavBadge } from "@/components/admin/shared/NavBadge";

// ─── Navigation ───────────────────────────────────────────────────────────────
const navigation = [
    { name: "Dashboard",  href: "/admin",           icon: LayoutDashboard },
    { name: "Orders",     href: "/admin/orders",     icon: StretchHorizontal },
    { name: "Purchases",  href: "/admin/purchases",  icon: ShoppingBag },
    { name: "Users",      href: "/admin/users",      icon: Users },
    { name: "Items", href: "/admin/items", icon: Package },
    { name: "Categories", href: "/admin/categories", icon: Tags },
    { name: "Inventory", href: "/admin/inventory", icon: BarChart3 },
    { name: "Settings", href: "/admin/settings/notifications", icon: Settings },
];

// ─── Location block — hidden when sidebar is collapsed ────────────────────────
function SidebarLocationBlock() {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    const { data: locations, isLoading } = useLocations();
    const { selectedLocationId, setSelectedLocationId } = useAdminStore();

    // Auto-set selected location when locations load
    useEffect(() => {
        if (!locations?.length) return;
        const ids = locations.map((l) => l.id);
        if (!selectedLocationId || !ids.includes(selectedLocationId)) {
            setSelectedLocationId(ids[0]);
        }
    }, [locations, selectedLocationId, setSelectedLocationId]);

    if (isCollapsed) return null;

    const selectedLocation = locations?.find((l) => l.id === selectedLocationId);
    const multipleLocations = (locations?.length ?? 0) > 1;

    if (isLoading) {
        return (
            <div className="mx-2 mt-1 rounded-xl px-3 py-2 bg-indigo-50 border border-indigo-100">
                <Skeleton className="w-full h-5" />
            </div>
        );
    }

    if (multipleLocations) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="w-full rounded-xl px-3 py-2 bg-indigo-50 border border-indigo-100 flex items-center gap-2 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors">
                        <Warehouse size={13} className="shrink-0" />
                        <span className="truncate flex-1 text-left">
                            {selectedLocation?.name ?? "Select location"}
                        </span>
                        <ChevronDown size={12} className="shrink-0 opacity-60" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                    {locations!.map((loc) => (
                        <DropdownMenuItem
                            key={loc.id}
                            onSelect={() => setSelectedLocationId(loc.id)}
                            className={cn(
                                "text-xs",
                                loc.id === selectedLocationId && "font-semibold text-indigo-700"
                            )}
                        >
                            {loc.name}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className="mx-2 mt-1 rounded-xl px-3 py-2 bg-indigo-50 border border-indigo-100">
            {selectedLocation ? (
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-medium">
                    <Warehouse size={13} className="shrink-0" />
                    <span className="truncate">{selectedLocation.name}</span>
                </div>
            ) : (
                <Skeleton className="w-full h-5" />
            )}
        </div>
    );
}

// ─── Storage spaces for selected location ─────────────────────────────────────
function SidebarStorageSpacesBlock() {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const pathname = usePathname();

    const { selectedLocationId } = useAdminStore();
    const { data: location, isLoading } = useLocationWithDetails(selectedLocationId);

    if (isCollapsed || !selectedLocationId) return null;

    const spaces = location?.storage_spaces ?? [];

    return (
        <SidebarGroup className="pt-0">
            <div className="px-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Storage Spaces
                </span>
            </div>
            <SidebarGroupContent>
                <SidebarMenu>
                    {isLoading ? (
                        <div className="space-y-1 px-2">
                            <Skeleton className="h-7 w-full" />
                            <Skeleton className="h-7 w-full" />
                        </div>
                    ) : spaces.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-zinc-400">
                            No storage spaces
                        </div>
                    ) : (
                        spaces.map((space) => {
                            const href = `/admin/storage-spaces/${space.id}`;
                            const isActive = pathname === href || pathname?.startsWith(href + "/");
                            return (
                                <SidebarMenuItem key={space.id}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isActive}
                                        tooltip={space.name}
                                        className="text-xs"
                                    >
                                        <Link href={href}>
                                            <Thermometer className="h-3.5 w-3.5" />
                                            <span className="truncate">{space.name}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useUser();
    const { selectedLocationId } = useAdminStore();
    const { data: orderCount }      = useActiveTicketCountForLocation(selectedLocationId ?? undefined);
    const { data: pendingRequests } = useInventoryUpdateRequests("pending");

    const badgeCounts: Record<string, number> = {
        "/admin/orders":    orderCount ?? 0,
        "/admin/purchases": pendingRequests?.length ?? 0,
    };

    const currentNav = navigation.find(
        (item) =>
            pathname === item.href || pathname?.startsWith(item.href + "/"),
    );

    return (
        <ErrorBoundary>
            <SidebarProvider defaultOpen={true}>
                <div className="min-h-screen bg-zinc-50 flex w-full">
                    <ToastProvider />

                    {/* ── Sidebar ── */}
                    <Sidebar variant="floating" collapsible="icon">
                        {/* Header */}
                        <SidebarHeader>
                            <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
                                <Image
                                    alt="logo"
                                    width={32}
                                    height={32}
                                    src={"/lazabluelogo.png"}
                                    className="h-8 w-8 shrink-0 rounded-full border bg-indigo-600"
                                />
                                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                    <span className="truncate font-semibold">
                                        Laza Dessert Cafe
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Admin Dashboard
                                    </span>
                                </div>
                            </div>

                            {/* Location pill — hidden when collapsed via the component itself */}
                            <SidebarLocationBlock />
                        </SidebarHeader>

                        {/* Nav items */}
                        <SidebarContent>
                            {/* ── New Order CTA ── */}
                            <div className="px-3 pt-2 pb-1 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:pt-1">
                                <Link
                                    href="/admin/orders/new"
                                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 transition-colors group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:px-0"
                                >
                                    <Plus className="h-3.5 w-3.5 shrink-0" />
                                    <span className="group-data-[collapsible=icon]:hidden">New Order</span>
                                </Link>
                            </div>

                            {/* ── Dashboard (standalone, no label) ── */}
                            <SidebarGroup className="group-data-[collapsible=icon]:px-2 pt-2">
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {[navigation[0]].map((item) => {
                                            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                                            return (
                                                <SidebarMenuItem key={item.name}>
                                                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                                                        <Link href={item.href}>
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.name}</span>
                                                            <NavBadge count={badgeCounts[item.href] ?? 0} />
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            );
                                        })}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            {/* ── OPERATIONS ── */}
                            <SidebarGroup className="group-data-[collapsible=icon]:px-2 pt-1">
                                <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                        Operations
                                    </span>
                                </div>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {[navigation[1], navigation[2]].map((item) => {
                                            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                                            return (
                                                <SidebarMenuItem key={item.name}>
                                                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                                                        <Link href={item.href}>
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.name}</span>
                                                            <NavBadge count={badgeCounts[item.href] ?? 0} />
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            );
                                        })}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            {/* ── CATALOG ── */}
                            <SidebarGroup className="group-data-[collapsible=icon]:px-2 pt-1">
                                <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                        Catalog
                                    </span>
                                </div>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {[navigation[4], navigation[5], navigation[6]].map((item) => {
                                            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                                            return (
                                                <SidebarMenuItem key={item.name}>
                                                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                                                        <Link href={item.href}>
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.name}</span>
                                                            <NavBadge count={badgeCounts[item.href] ?? 0} />
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            );
                                        })}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            {/* ── MANAGE ── */}
                            <SidebarGroup className="group-data-[collapsible=icon]:px-2 pt-1">
                                <div className="px-3 pb-1 group-data-[collapsible=icon]:hidden">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                        Manage
                                    </span>
                                </div>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {[navigation[3], navigation[7]].map((item) => {
                                            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                                            return (
                                                <SidebarMenuItem key={item.name}>
                                                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                                                        <Link href={item.href}>
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.name}</span>
                                                            <NavBadge count={badgeCounts[item.href] ?? 0} />
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            );
                                        })}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>

                            <SidebarStorageSpacesBlock />
                        </SidebarContent>

                        {/* Footer */}
                        <SidebarFooter className="group-data-[collapsible=icon]:px-2">
                            <SidebarMenu>
                                {/* Home link */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip="Go to Homepage"
                                    >
                                        <Link href="/">
                                            <Home className="w-4 h-4" />
                                            <span>Home</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>

                                {/* User info — hidden when collapsed */}
                                <SidebarMenuItem>
                                    <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
                                        <div className="w-7 h-7 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                                            {user?.firstName?.[0] ||
                                                user?.emailAddresses[0]
                                                    ?.emailAddress[0] ||
                                                "U"}
                                        </div>
                                        <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                                            <span className="truncate font-semibold text-xs">
                                                {user?.firstName ||
                                                    user?.emailAddresses[0]
                                                        ?.emailAddress ||
                                                    "User"}
                                            </span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {
                                                    user?.emailAddresses[0]
                                                        ?.emailAddress
                                                }
                                            </span>
                                        </div>
                                    </div>
                                </SidebarMenuItem>

                                {/* Sign out */}
                                <SidebarMenuItem>
                                    <SignOutButton>
                                        <SidebarMenuButton tooltip="Sign Out">
                                            <LogOut className="h-4 w-4" />
                                            <span>Sign Out</span>
                                        </SidebarMenuButton>
                                    </SignOutButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarFooter>
                    </Sidebar>

                    {/* ── Main Content ── */}
                    <SidebarInset>
                        <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4">
                            <SidebarTrigger className="ml-auto" />
                            <div className="flex items-center justify-between flex-1">
                                <h2 className="text-lg font-semibold text-zinc-900">
                                    {currentNav?.name || "Dashboard"}
                                </h2>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-scroll p-6">
                            {children}
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ErrorBoundary>
    );
}