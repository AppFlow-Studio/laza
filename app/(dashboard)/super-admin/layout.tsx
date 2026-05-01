"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    Users,
    Package,
    BarChart3,
    LogOut,
    Home,
    Tags,
    Settings,
    Warehouse,
    Store,
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
    ChartColumn,
    ScanLine,
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
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Navigation config
// ---------------------------------------------------------------------------

const navigation = [
    { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { name: "All Stores", href: "/super-admin/stores", icon: Store },
    {
        name: "Purchase Orders",
        href: "/super-admin/purchase-orders",
        icon: ShoppingCart,
    },
    { name: "Orders", href: "/super-admin/orders", icon: StretchHorizontal },
    { name: "Users", href: "/super-admin/users", icon: Users },
    { name: "Settings", href: "/super-admin/settings/notifications", icon: Settings },
];

const warehouseChildren = [
    { name: "Inventory", href: "/super-admin/warehouse", icon: Building2 },
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
    {
        name: "Invoices",
        href: "/super-admin/warehouse/invoices",
        icon: ScanLine,
    },
];

const catalogChildren = [
    { name: "Items", href: "/super-admin/items", icon: Package },
    { name: "Categories", href: "/super-admin/categories", icon: Tags },
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
// Collapsible groups — sidebar-aware
// ---------------------------------------------------------------------------

function CollapsibleNavGroup({
    label,
    icon: Icon,
    basePath,
    activePaths,
    children,
    pathname,
}: {
    label: string;
    icon: React.ElementType;
    basePath: string;
    activePaths?: string[];
    children: { name: string; href: string; icon: React.ElementType }[];
    pathname: string;
}) {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const isOnSection = activePaths
        ? activePaths.some((p) => pathname?.startsWith(p))
        : pathname?.startsWith(basePath);
    const [open, setOpen] = useState(isOnSection);

    useEffect(() => {
        if (isOnSection) setOpen(true);
    }, [isOnSection]);

    // In collapsed mode: just show the parent icon with tooltip linking to base path
    if (isCollapsed) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isOnSection}
                    tooltip={label}
                >
                    <Link href={children[0].href}>
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={() => setOpen((o) => !o)}
                isActive={isOnSection}
                tooltip={label}
                className="cursor-pointer"
            >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
                <ChevronDown
                    className={cn(
                        "h-3.5 w-3.5 text-zinc-400 transition-transform duration-200",
                        open && "rotate-180",
                    )}
                />
            </SidebarMenuButton>

            {open && (
                <SidebarMenuSub>
                    {children.map((child) => {
                        const isActive =
                            child.href === basePath
                                ? pathname === child.href
                                : pathname === child.href ||
                                  pathname?.startsWith(child.href + "/");
                        return (
                            <SidebarMenuSubItem key={child.href}>
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={isActive}
                                >
                                    <Link href={child.href}>
                                        <child.icon className="h-3.5 w-3.5" />
                                        <span>{child.name}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        );
                    })}
                </SidebarMenuSub>
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
        warehouseChildren.find(
            (c) => pathname === c.href || pathname?.startsWith(c.href + "/"),
        ) ??
        analyticsChildren.find(
            (c) => pathname === c.href || pathname?.startsWith(c.href + "/"),
        ) ??
        catalogChildren.find(
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

                    <Sidebar
                        variant="floating"
                        collapsible="icon"
                        className="[&[data-collapsible=icon]]:w-12"
                    >
                        <SidebarHeader className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
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
                                        Super Admin Dashboard
                                    </span>
                                </div>
                            </div>
                        </SidebarHeader>

                        <SidebarContent>
                            <SidebarGroup className="group-data-[collapsible=icon]:px-2">
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

                                        {/* Warehouse */}
                                        <CollapsibleNavGroup
                                            label="Warehouse"
                                            icon={Warehouse}
                                            basePath="/super-admin/warehouse"
                                            children={warehouseChildren}
                                            pathname={pathname}
                                        />

                                        {/* Analytics */}
                                        <CollapsibleNavGroup
                                            label="Analytics"
                                            icon={LineChart}
                                            basePath="/super-admin/analytics"
                                            children={analyticsChildren}
                                            pathname={pathname}
                                        />

                                        {/* Catalog */}
                                        <CollapsibleNavGroup
                                            label="Catalog"
                                            icon={Package}
                                            basePath="/super-admin/items"
                                            activePaths={["/super-admin/items", "/super-admin/categories"]}
                                            children={catalogChildren}
                                            pathname={pathname}
                                        />

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

                        <SidebarFooter className="group-data-[collapsible=icon]:px-2">
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
