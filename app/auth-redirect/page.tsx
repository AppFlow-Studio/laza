"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthRedirectPage() {
    const { isLoaded, userId, sessionClaims } = useAuth();
    const { userMemberships, setActive, isLoaded: orgsLoaded } = useOrganizationList({
        userMemberships: { infinite: true },
    });
    const router = useRouter();

    useEffect(() => {
        if (!isLoaded || !userId) return;

        const role = (sessionClaims as any)?.o?.rol as string | undefined;

        // Happy path: JWT already has org claims
        if (role === "admin") { router.replace("/admin"); return; }
        if (role === "member") { router.replace("/employee"); return; }

        // Org claims not yet in JWT — wait for memberships to load, then activate
        if (!orgsLoaded) return;

        const first = userMemberships?.data?.[0];
        if (!first || !setActive) { router.replace("/"); return; }

        setActive({ organization: first.organization.id }).then(() => {
            const memberRole = first.role ?? "";
            if (memberRole.includes("admin")) router.replace("/admin");
            else router.replace("/employee");
        });
    }, [isLoaded, orgsLoaded, userId, sessionClaims, userMemberships, setActive, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-500 text-sm">Redirecting…</p>
        </div>
    );
}
