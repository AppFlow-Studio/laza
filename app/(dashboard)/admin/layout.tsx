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
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { useLocation } from "@/lib/hooks/queries/useLocations";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Navigation ───────────────────────────────────────────────────────────────
const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Orders", href: "/admin/orders", icon: StretchHorizontal },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Items", href: "/admin/items", icon: Package },
    { name: "Categories", href: "/admin/categories", icon: Tags },
    { name: "Inventory", href: "/admin/inventory", icon: BarChart3 },
    { name: "Settings", href: "/admin/settings/notifications", icon: Settings },
];

// ─── Location block — hidden when sidebar is collapsed ────────────────────────
function SidebarLocationBlock() {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    const { data: userInfo } = useUserInfo();
    const { data: location } = useLocation(
        userInfo?.assigned_location_id ?? "",
    );

    // Don't render anything in collapsed mode — it would overflow
    if (isCollapsed) return null;

    return (
        <div className="mx-2 mt-1 rounded-xl px-3 py-2 bg-indigo-50 border border-indigo-100">
            {location ? (
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-medium">
                    <Warehouse size={13} className="shrink-0" />
                    <span className="truncate">{location.name}</span>
                </div>
            ) : (
                <Skeleton className="w-full h-5" />
            )}
        </div>
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
                            <SidebarGroup className="group-data-[collapsible=icon]:px-2">
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {navigation.map((item) => {
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
                                                        <Link href={item.href}>
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

                        <div className="flex-1 overflow-y-auto p-6">
                            {children}
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ErrorBoundary>
    );
}