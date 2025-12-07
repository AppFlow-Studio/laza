"use client";

import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
    return (
        <main className="max-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div
                    className="w-full h-full flex flex-col justify-between p-12"
                    style={{
                        background: 'linear-gradient(135deg, #1B3A6B 0%, #2C4B7E 100%)',
                    }}
                >
                    {/* Logo and Branding */}
                    <div className="flex flex-col items-start">
                        <div className="relative w-32 h-32 mb-8 rounded-full border-4 border-white bg-white flex items-center justify-center overflow-hidden">
                            <Image
                                src="/lazabluelogo.png"
                                alt="Laza Dessert Cafe"
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                        <h1 className="text-white text-4xl font-bold mb-4">
                            Laza Dessert Cafe
                        </h1>
                        <p className="text-white/90 text-lg mb-6">
                            Your inventory management workspace
                        </p>
                    </div>

                    {/* Product Gallery */}
                    <div className="flex items-center justify-center my-6">
                        <div className="grid grid-cols-3 gap-3 w-full max-w-xl">
                            {/* Row 1 */}
                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <Image
                                    src="/desserts/pistachio-kunafa.jpg"
                                    alt="Pistachio Kunafa"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <Image
                                    src="/crepes/nutella-crepe.jpg"
                                    alt="Nutella Crepe"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <Image
                                    src="/drinks/pistachio-shake.jpg"
                                    alt="Pistachio Shake"
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {/* Row 2 */}
                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <Image
                                    src="/desserts/classic-kunafa.jpg"
                                    alt="Classic Kunafa"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <Image
                                    src="/crepes/strawberry-banana-crepe.jpg"
                                    alt="Strawberry Banana Crepe"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <Image
                                    src="/drinks/Dubai-Chocolate-Shake.jpg"
                                    alt="Dubai Chocolate Shake"
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {/* Row 3 */}
                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <Image
                                    src="/desserts/triple-chocolate-kunafa.jpg"
                                    alt="Triple Chocolate Kunafa"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <Image
                                    src="/crepes/ferrero-crepe.jpg"
                                    alt="Ferrero Crepe"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <Image
                                    src="/drinks/matcha-latte.jpg"
                                    alt="Matcha Latte"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Tagline */}
                    <div className="text-white/80">
                        <p className="text-xl font-semibold">
                            Manage inventory with ease
                        </p>
                        <p className="text-sm mt-2 opacity-75">
                            For employees and administrators
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Sign In Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 text-center">
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
                            Sign in to continue
                        </p>
                    </div>

                    {/* Clerk Sign In Component */}
                    <div className="flex justify-center">
                        <SignIn
                            appearance={{
                                elements: {
                                    rootBox: "mx-auto",
                                    card: "shadow-none border-0",
                                    headerTitle: "text-2xl font-bold text-gray-900",
                                    headerSubtitle: "text-gray-600",
                                    socialButtonsBlockButton: "border border-gray-300 hover:bg-gray-50 transition-colors",
                                    socialButtonsBlockButtonText: "text-gray-700 font-medium",
                                    formButtonPrimary: "bg-[#1B3A6B] hover:bg-[#2C4B7E] text-white transition-colors",
                                    formFieldInput: "border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]",
                                    formFieldLabel: "text-gray-700",
                                    footerActionLink: "text-[#1B3A6B] hover:text-[#2C4B7E]",
                                    identityPreviewText: "text-gray-700",
                                    identityPreviewEditButton: "text-[#1B3A6B] hover:text-[#2C4B7E]",
                                    formResendCodeLink: "text-[#1B3A6B] hover:text-[#2C4B7E]",
                                    otpCodeFieldInput: "border-gray-300 focus:border-[#1B3A6B] focus:ring-[#1B3A6B]",
                                },
                                variables: {
                                    colorPrimary: "#1B3A6B",
                                    colorText: "#1f2937",
                                    colorTextSecondary: "#6b7280",
                                    colorBackground: "#ffffff",
                                    colorInputBackground: "#ffffff",
                                    colorInputText: "#1f2937",
                                },
                            }}
                            routing="path"
                            path="/sign-in"
                            signUpUrl="/sign-up"
                        />
                    </div>

                    {/* Footer Links */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        <div className="flex justify-center gap-6">
                            <a href="/" className="hover:text-gray-700 transition-colors">
                                Home
                            </a>
                            <a href="/privacy-policy" className="hover:text-gray-700 transition-colors">
                                Privacy
                            </a>
                            <a href="/terms-conditions" className="hover:text-gray-700 transition-colors">
                                Terms
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
