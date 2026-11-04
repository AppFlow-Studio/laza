"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

// Full page navigation (not router.replace) so the middleware sees the freshly
// minted session cookie with org claims, and no stale RSC cache is reused.
// Soft navigation here is what made users refresh before landing on the dashboard.
function go(path: string) {
    window.location.replace(path);
}

export default function AuthRedirectPage() {
    const { isLoaded, userId, sessionClaims } = useAuth();
    const { userMemberships, setActive, isLoaded: orgsLoaded } = useOrganizationList({
        userMemberships: { infinite: true },
    });
    const started = useRef(false);

    useEffect(() => {
        if (started.current || !isLoaded) return;

        if (!userId) { started.current = true; go("/sign-in"); return; }

        const role = (sessionClaims as any)?.o?.rol as string | undefined;

        // Happy path: JWT already has org claims
        if (role === "admin") { started.current = true; go("/admin"); return; }
        if (role === "member") { started.current = true; go("/employee"); return; }

        // Org claims not yet in JWT — wait for memberships to actually load, then activate
        if (!orgsLoaded || !setActive || userMemberships.isLoading) return;

        started.current = true;
        const first = userMemberships.data?.[0];
        if (!first) { go("/"); return; }

        setActive({ organization: first.organization.id })
            .then(() => go(first.role?.includes("admin") ? "/admin" : "/employee"))
            .catch(() => go("/"));
    }, [isLoaded, orgsLoaded, userId, sessionClaims, userMemberships.isLoading, userMemberships.data, setActive]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-zinc-200 border-t-[#1B3A6B] animate-spin" />
            <p className="text-gray-500 text-sm">Signing you in…</p>
        </div>
    );
}
