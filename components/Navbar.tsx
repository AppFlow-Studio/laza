"use client"
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Menu, X, LogIn, User, LayoutDashboard } from "lucide-react";
import { useCartStore } from "@/utils/cart";
import { useUser } from "@clerk/nextjs";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
const navLinks = [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "Online Order", href: "https://order.toasttab.com/online/locations/e4e3218e-7ad2-411f-a156-ec157a00652f/default" },
    { label: "About", href: "/about" },
    { label: "Catering", href: "/catering" },
    // { label: "Locations", href: "#" },
    { label: "Join Us", href: "/join-us" },
];

// Pages that should have a solid white navbar
const SOLID_NAVBAR_PAGES = [
    "/menu",
    "/about",
    "/checkout",
    "/join-us",
    "/privacy-policy",
    "/terms-conditions",
    '/admin'
] as const;

/**
 * Determines if the navbar should be in solid (white background) mode
 * @param scrolled - Whether the page is scrolled
 * @param pathname - Current pathname
 * @returns true if navbar should be solid, false if transparent
 */
function shouldUseSolidNavbar(scrolled: boolean, pathname: string): boolean {
    return scrolled || SOLID_NAVBAR_PAGES.includes(pathname as typeof SOLID_NAVBAR_PAGES[number]);
}

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    // const { user, isLoaded } = useUser();
    // const { data: userInfo } = useUserInfo();
    // const { items } = useCartStore();

    // // Get user role from public metadata
    // const userRole = userInfo?.role;
    // console.log('userRole', userRole);
    // const dashboardPath = userRole === 'admin' ? '/admin' : userRole === 'employee' ? '/employee' : '/sign-in';
    // const isLoggedIn = !!user && isLoaded;

    // Determine navbar style
    const isSolidNavbar = shouldUseSolidNavbar(scrolled, pathname);
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Close sidebar on ESC
    useEffect(() => {
        if (!sidebarOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSidebarOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [sidebarOpen]);
    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 ${isSolidNavbar
                ? "bg-white shadow text-[#2C4B7E]"
                : "bg-transparent text-white"
                }`}
        >
            <div className="mx-auto flex items-center justify-between px-4 xl:px-20 py-4">
                {/* Logo */}
                <Link href="/" className="flex items-center rounded-full overflow-hidden relative h-16 w-16 xl:h-20 xl:w-20">
                    <Image
                        src={isSolidNavbar ? "/lazabluelogo.png" : "/lazanavbarlogo.png"}
                        alt="Laza Logo"
                        fill
                        className={`${isSolidNavbar ? "object-cover" : "object-contain"} transition-all duration-300`}
                    />
                </Link>
                {/* Hamburger for mobile */}
                <button
                    className="xl:hidden flex items-center justify-center ml-2 p-2 rounded-full hover:bg-[#2C4B7E]/10 transition"
                    aria-label="Open menu"
                    onClick={() => setSidebarOpen(true)}
                >
                    <Menu className="w-8 h-8" />
                </button>
                {/* Nav Links (desktop) */}
                <div className="flex-1 xl:flex hidden justify-center gap-12">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="text-lg font-medium transition-colors hover:cursor-pointer duration-300 hover:opacity-80"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
                {/* Right Side (desktop) */}
                <div className="xl:flex hidden items-center gap-6">
                    {/* <a href="#" className="flex items-center gap-2 text-lg font-medium">
                        <Image src="/icons/phone.png" alt="Laza Logo" width={20} height={20} />
                        +1 (347) 560-6080
                    </a> */}
                    {/* <Link href="/checkout" className="flex items-center gap-2 text-lg font-medium">
                        <ShoppingCart className={`${scrolled || pathname === "/menu" || pathname === "/about" || pathname == '/checkout' || pathname == '/join-us' ? "text-[#2C4B7E]" : "text-white"} w-6 h-6`} />
                        {items.length > 0 && <span className={` rounded-full w-4 h-4 flex items-center justify-center text-sm ${scrolled || pathname === "/menu" || pathname === "/about" || pathname == '/checkout' ? "bg-[#2C4B7E] text-white" : "bg-white text-[#2C4B7E]"}`}>{(items.map(item => item.quantity).reduce((acc, curr) => acc + curr, 0))}</span>}
                    </Link> */}
                    {/* {isLoggedIn ? (
                        <>
                            
                            <Link
                                href={dashboardPath}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95 ${isSolidNavbar
                                    ? "bg-[#2C4B7E] text-white hover:bg-[#1a2d4d] shadow-md hover:shadow-lg"
                                    : "bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20"
                                    }`}
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                Dashboard
                            </Link>
                        </>
                    ) : (
                        <Link
                            href="/sign-in"
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95 ${isSolidNavbar
                                ? "bg-[#2C4B7E] text-white hover:bg-[#1a2d4d] shadow-md hover:shadow-lg"
                                : "bg-white/10 backdrop-blur-sm text-white border border-white/20 hover:bg-white/20"
                                }`}
                        >
                            <LogIn className="w-5 h-5" />
                            Sign In
                        </Link>
                    )} */}
                </div>

                {/* Sidebar overlay */}
                {sidebarOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Close menu overlay"
                        />
                        <aside
                            className={`fixed top-0 left-0 h-full w-4/5 max-w-xs bg-white shadow-2xl z-50 flex flex-col p-6 pt-8 gap-8 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} text-[#2C4B7E] rounded-r-3xl`}
                            style={{ boxShadow: '4px 0 24px 0 rgba(44,75,126,0.10)' }}
                            tabIndex={0}
                        >
                            <button
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#2C4B7E]/10 transition"
                                aria-label="Close menu"
                                onClick={() => setSidebarOpen(false)}
                            >
                                <X className="w-7 h-7" />
                            </button>
                            <Link href="/" className="flex items-center rounded-full overflow-hidden relative h-16 w-16 mb-6">
                                <Image src="/lazabluelogo.png" alt="Laza Logo" fill className="object-cover" />
                            </Link>
                            <nav className="flex flex-col gap-6 mt-8">
                                {navLinks.map((link) => (
                                    <a
                                        key={link.label}
                                        href={link.href}
                                        className="text-xl font-semibold hover:text-[#1a2d4d] transition-colors duration-200"
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        {link.label}
                                    </a>
                                ))}
                            </nav>
                            <div className="flex flex-col gap-4 mt-8">
                                {/* <a href="#" className="flex items-center gap-3 text-lg font-medium">
                                    <Image src="/icons/phone.png" alt="Laza Logo" width={22} height={22} />
                                    +1 (347) 560-6080
                                </a> */}
                                {/* <Link href="/checkout" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 text-lg font-medium">
                                    <ShoppingCart className="text-[#2C4B7E] w-6 h-6" />
                                    {items.length > 0 && <span className="rounded-full w-5 h-5 flex items-center justify-center text-xs bg-[#2C4B7E] text-white">{(items.map(item => item.quantity).reduce((acc, curr) => acc + curr, 0))}</span>}
                                    Checkout
                                </Link> */}
                                {/* {isLoggedIn ? (
                                    <>
                                        <div className="flex items-center gap-3 text-base font-medium text-[#2C4B7E] px-2">
                                            <User className="w-5 h-5" />
                                            <span>Signed in as {user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User'}</span>
                                        </div>
                                        <Link
                                            href={dashboardPath}
                                            onClick={() => setSidebarOpen(false)}
                                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-base bg-[#2C4B7E] text-white hover:bg-[#1a2d4d] transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
                                        >
                                            <LayoutDashboard className="w-5 h-5" />
                                            Dashboard
                                        </Link>
                                    </>
                                ) : (
                                    <Link
                                        href="/sign-in"
                                        onClick={() => setSidebarOpen(false)}
                                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-base bg-[#2C4B7E] text-white hover:bg-[#1a2d4d] transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
                                    >
                                        <LogIn className="w-5 h-5" />
                                        Sign In
                                    </Link>
                                )} */}
                            </div>
                        </aside>
                    </>
                )}
            </div>
        </nav>
    );
} 