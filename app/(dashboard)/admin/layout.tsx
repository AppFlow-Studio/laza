"use client";

import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
    LayoutDashboard,
    MapPin,
    Users,
    Package,
    BarChart3,
    Bell,
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

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Orders", href: "/admin/orders", icon: StretchHorizontal },
    // { name: "Locations", href: "/admin/locations", icon: MapPin },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Items", href: "/admin/items", icon: Package },
    { name: "Categories", href: "/admin/categories", icon: Tags },
    { name: "Inventory", href: "/admin/inventory", icon: BarChart3 },
    { name: "Settings", href: "/admin/settings/notifications", icon: Settings },
];

// Add this inner component above AdminLayout:
function SidebarLocationBlock() {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    const { data: userInfo } = useUserInfo();
    const { data: location } = useLocation(
        userInfo?.assigned_location_id ?? "",
    );

    if (isCollapsed) return null;

    return (
        <div className="w-full rounded-xl px-6 py-2.5 bg-indigo-50 border-b border-indigo-100">
            {location ? (
                <div className="flex items-center gap-3 text-indigo-700 text-sm font-medium">
                    <Warehouse size={14} />
                    {location.name}
                </div>
            ) : (
                <Skeleton className="w-full h-8" />
            )}
        </div>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { user } = useUser();

    const { data: userInfo } = useUserInfo();
    const { data: location } = useLocation(
        userInfo?.assigned_location_id ?? "",
    );

    return (
        <ErrorBoundary>
            <SidebarProvider defaultOpen={true}>
                <div className="min-h-screen bg-zinc-50 flex w-full ">
                    <ToastProvider />

                    {/* Sidebar */}
                    <Sidebar variant="floating" collapsible="icon" className="">
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
                                        Admin Dashboard
                                    </span>
                                </div>
                            </div>
                            <SidebarLocationBlock />
                        </SidebarHeader>

                        <SidebarContent>
                            <SidebarGroup>
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
                        {/* Top Header */}
                        <header className="sticky top-0 z-10 bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-4">
                            {/* <SidebarTrigger /> */}
                            <SidebarTrigger className="ml-auto" />

                            <div className="flex items-center justify-between flex-1">
                                <div>
                                    <h2 className="text-lg font-semibold text-zinc-900">
                                        {navigation.find(
                                            (item) =>
                                                pathname === item.href ||
                                                pathname?.startsWith(
                                                    item.href + "/",
                                                ),
                                        )?.name || "Dashboard"}
                                    </h2>
                                </div>

                                {/* <div className="flex items-center gap-4">
                                    <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors relative">
                                        <Bell className="w-5 h-5 text-zinc-600" />
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                                    </button>
                                </div> */}
                            </div>
                        </header>

                        {/* Page Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {children}
                        </div>
                    </SidebarInset>
                </div>
            </SidebarProvider>
        </ErrorBoundary>
    );
}
