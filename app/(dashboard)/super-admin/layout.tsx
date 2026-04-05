"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    MapPin,
    Users,
    Package,
    BarChart3,
    LogOut,
    Home,
    Tags,
    Settings,
    Warehouse,
    Store,
    ChartColumn,
    StretchHorizontal,
    ShoppingCart,
    ChevronDown,
    Building2,
    Thermometer,
    Receipt,
    ArrowsUpFromLine,
    BarChart2,
    LineChart,
    CircleDollarSign,
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
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Navigation config
// ---------------------------------------------------------------------------

const navigation = [
    { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    // Warehouse is handled separately below (collapsible group)
    { name: "All Stores", href: "/super-admin/stores", icon: Store },
    {
        name: "Purchase Orders",
        href: "/super-admin/purchase-orders",
        icon: ShoppingCart,
    },
    { name: "Orders", href: "/super-admin/orders", icon: StretchHorizontal },
    { name: "Analytics", href: "/super-admin/analytics", icon: ChartColumn },
    // { name: "Locations", href: "/super-admin/locations", icon: MapPin },
    { name: "Users", href: "/super-admin/users", icon: Users },
    { name: "Items", href: "/super-admin/items", icon: Package },
    { name: "Categories", href: "/super-admin/categories", icon: Tags },
    { name: "Inventory", href: "/super-admin/inventory", icon: BarChart3 },
    {
        name: "Settings",
        href: "/super-admin/settings/notifications",
        icon: Settings,
    },
];

const warehouseChildren = [
    { name: "Inventory", href: "/super-admin/warehouse", icon: Building2 },
    // {
    //     name: "Employees",
    //     href: "/super-admin/warehouse/employees",
    //     icon: Users,
    // },
    {
        name: "Thresholds",
        href: "/super-admin/warehouse/thresholds",
        icon: Thermometer,
    },
    {
        name: "Expenses",
        href: "/super-admin/warehouse/expenses",
        icon: Receipt,
    },
    {
        name: "Pallets",
        href: "/super-admin/warehouse/pallets",
        icon: ArrowsUpFromLine,
    },
];

const analyticsChildren = [
    { name: "Analytics", href: "/super-admin/analytics", icon: ChartColumn },
    {
        name: "Distribution",
        href: "/super-admin/analytics/distribution",
        icon: BarChart2,
    },
    {
        name: "Costs",
        href: "/super-admin/analytics/costs",
        icon: CircleDollarSign,
    },
];

// ---------------------------------------------------------------------------
// Collapsible groups
// ---------------------------------------------------------------------------

function WarehouseGroup({ pathname }: { pathname: string }) {
    const isOnWarehouse = pathname?.startsWith("/super-admin/warehouse");
    const [open, setOpen] = useState(isOnWarehouse);

    // Auto-expand when navigating to a warehouse sub-route
    useEffect(() => {
        if (isOnWarehouse) setOpen(true);
    }, [isOnWarehouse]);

    return (
        <SidebarMenuItem>
            {/* Parent row — clicking toggles sub-menu */}
            <SidebarMenuButton
                onClick={() => setOpen((o) => !o)}
                isActive={isOnWarehouse}
                tooltip="Warehouse"
                className="cursor-pointer"
            >
                <Warehouse className="h-4 w-4" />
                <span className="flex-1">Warehouse</span>
                <ChevronDown
                    className={cn(
                        "h-3.5 w-3.5 text-zinc-400 transition-transform duration-200",
                        open && "rotate-180",
                    )}
                />
            </SidebarMenuButton>

            {/* Sub-items */}
            {open && (
                <div className="ml-4 mt-0.5 flex flex-col">
                    {/* Vertical connector line */}
                    <div className="relative pl-3 border-l border-zinc-200">
                        {warehouseChildren.map((child) => {
                            const isActive =
                                pathname === child.href ||
                                // Warehouse inventory: exact match only to avoid
                                // matching all /warehouse/* when on /warehouse
                                (child.href === "/super-admin/warehouse"
                                    ? pathname === "/super-admin/warehouse"
                                    : pathname?.startsWith(child.href + "/") ||
                                      pathname === child.href);

                            return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    className={cn(
                                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors mb-0.5",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-600 font-medium"
                                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                                    )}
                                >
                                    <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{child.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </SidebarMenuItem>
    );
}

function AnalyticsGroup({ pathname }: { pathname: string }) {
    const isOnWarehouse = pathname?.startsWith("/super-admin/analytics");
    const [open, setOpen] = useState(isOnWarehouse);

    // Auto-expand when navigating to a analytics sub-route
    useEffect(() => {
        if (isOnWarehouse) setOpen(true);
    }, [isOnWarehouse]);

    return (
        <SidebarMenuItem>
            {/* Parent row — clicking toggles sub-menu */}
            <SidebarMenuButton
                onClick={() => setOpen((o) => !o)}
                isActive={isOnWarehouse}
                tooltip="Analytics"
                className="cursor-pointer"
            >
                <LineChart className="h-4 w-4" />
                <span className="flex-1">Analytics</span>
                <ChevronDown
                    className={cn(
                        "h-3.5 w-3.5 text-zinc-400 transition-transform duration-200",
                        open && "rotate-180",
                    )}
                />
            </SidebarMenuButton>

            {/* Sub-items */}
            {open && (
                <div className="ml-4 mt-0.5 flex flex-col">
                    {/* Vertical connector line */}
                    <div className="relative pl-3 border-l border-zinc-200">
                        {analyticsChildren.map((child) => {
                            const isActive =
                                pathname === child.href ||
                                (child.href === "/super-admin/analytics"
                                    ? pathname === "/super-admin/analytics"
                                    : pathname?.startsWith(child.href + "/") ||
                                      pathname === child.href);

                            return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    className={cn(
                                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors mb-0.5",
                                        isActive
                                            ? "bg-indigo-50 text-indigo-600 font-medium"
                                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                                    )}
                                >
                                    <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{child.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </SidebarMenuItem>
    );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useUser();

    const currentNav =
        // Check warehouse children first for accurate header title
        warehouseChildren.find(
            (c) => pathname === c.href || pathname?.startsWith(c.href + "/"),
        ) ??
        navigation.find(
            (item) =>
                pathname === item.href || pathname?.startsWith(item.href + "/"),
        );

    return (
        <ErrorBoundary>
            <SidebarProvider defaultOpen={true}>
                <div className="min-h-screen bg-zinc-50 flex w-full">
                    <ToastProvider />

                    {/* Sidebar */}
                    <Sidebar variant="floating" collapsible="icon">
                        <SidebarHeader>
                            <div className="flex items-center gap-2 px-2 py-2">
                                <Image
                                    alt="logo"
                                    width={100}
                                    height={100}
                                    src={"/lazabluelogo.png"}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border bg-indigo-600 text-white text-sm font-semibold"
                                />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        Laza Dessert Cafe
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Super Admin Dashboard
                                    </span>
                                </div>
                            </div>
                        </SidebarHeader>

                        <SidebarContent>
                            <SidebarGroup>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {/* Dashboard */}
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={
                                                    pathname === "/super-admin"
                                                }
                                                tooltip="Dashboard"
                                            >
                                                <Link href="/super-admin">
                                                    <LayoutDashboard className="h-4 w-4" />
                                                    <span>Dashboard</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>

                                        {/* Warehouse — collapsible group */}
                                        <WarehouseGroup pathname={pathname} />
                                        <AnalyticsGroup pathname={pathname} />

                                        {/* Rest of nav */}
                                        {navigation
                                            .filter(
                                                (item) =>
                                                    item.name !== "Dashboard",
                                            )
                                            .map((item) => {
                                                const isActive =
                                                    pathname === item.href ||
                                                    pathname?.startsWith(
                                                        item.href + "/",
                                                    );
                                                return (
                                                    <SidebarMenuItem
                                                        key={item.name}
                                                    >
                                                        <SidebarMenuButton
                                                            asChild
                                                            isActive={isActive}
                                                            tooltip={item.name}
                                                        >
                                                            <Link
                                                                href={item.href}
                                                            >
                                                                <item.icon className="h-4 w-4" />
                                                                <span>
                                                                    {item.name}
                                                                </span>
                                                            </Link>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                );
                                            })}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>

                        <SidebarFooter>
                            <SidebarMenu>
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
                                <SidebarMenuItem>
                                    <div className="flex items-center gap-2 px-2 py-2 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                                            {user?.firstName?.[0] ||
                                                user?.emailAddresses[0]
                                                    ?.emailAddress[0] ||
                                                "U"}
                                        </div>
                                        <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                                            <span className="truncate font-semibold">
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
                                <SidebarMenuItem>
                                    <SignOutButton>
                                        <SidebarMenuButton
                                            asChild
                                            tooltip="Sign Out"
                                        >
                                            <button
                                                type="button"
                                                className="flex items-center gap-2 w-full"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                <span>Sign Out</span>
                                            </button>
                                        </SidebarMenuButton>
                                    </SignOutButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarFooter>
                    </Sidebar>

                    {/* Main Content */}
                    <SidebarInset>
                        <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4">
                            <SidebarTrigger className="ml-auto" />
                            <div className="flex items-center justify-between flex-1">
                                <h2 className="text-lg font-semibold text-zinc-900">
                                    {currentNav?.name ||
                                        "Super Admin Dashboard"}
                                </h2>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-6">
                            {children}
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ErrorBoundary>
    );
}
