"use client";

import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

// Invitation emails link here (see createInvitation's redirectUrl). Clerk reads
// the __clerk_ticket param, so invitees only pick a password / verify — then
// /auth-redirect activates their org and sends them to the right dashboard.
export default function SignUpPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-white p-8">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                        <Image
                            src="/lazabluelogo.png"
                            alt="Laza Dessert Cafe"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Laza Dessert Cafe
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Set up your account to get started
                    </p>
                </div>

                <div className="flex justify-center">
                    <SignUp
                        routing="path"
                        path="/sign-up"
                        signInUrl="/sign-in"
                        forceRedirectUrl="/auth-redirect"
                        appearance={{
                            elements: {
                                rootBox: "mx-auto",
                                card: "shadow-none border-0",
                                formButtonPrimary: "bg-[#1B3A6B] hover:bg-[#2C4B7E] text-white transition-colors",
                                footerActionLink: "text-[#1B3A6B] hover:text-[#2C4B7E]",
                            },
                            variables: {
                                colorPrimary: "#1B3A6B",
                                colorText: "#1f2937",
                                colorBackground: "#ffffff",
                            },
                        }}
                    />
                </div>
            </div>
        </main>
    );
}
