"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import React from "react";
import { SendFranchiseWaitlistEmails } from "@/email";
import { z } from "zod";

// Zod schema for waitlist validation
const waitlistSchema = z.object({
    name: z.string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be less than 50 characters")
        .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
    email: z.string()
        .email("Please enter a valid email address")
        .min(1, "Email is required")
        .max(100, "Email must be less than 100 characters")
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

// Waitlist Component
const WaitlistForm: React.FC = () => {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Clear previous errors
        setErrors({});

        // Validate form data with Zod
        const formData = {
            name: name.trim(),
            email: email.trim()
        };

        try {
            const validatedData = waitlistSchema.parse(formData);

            setIsLoading(true);

            // Send emails using the existing Resend setup
            const submission = {
                name: validatedData.name,
                email: validatedData.email,
                submittedAt: new Date()
            };

            // Send both confirmation and notification emails
            await SendFranchiseWaitlistEmails(submission);

            setIsSubmitted(true);
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Handle validation errors
                const fieldErrors: { name?: string; email?: string } = {};
                error.errors.forEach((err) => {
                    if (err.path[0] === 'name') {
                        fieldErrors.name = err.message;
                    } else if (err.path[0] === 'email') {
                        fieldErrors.email = err.message;
                    }
                });
                setErrors(fieldErrors);
            } else {
                console.error('Error submitting waitlist:', error);
                // Still show success to user even if email fails
                setIsSubmitted(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">You're on the list!</h3>
                <p className="text-green-700 text-sm">We'll notify you when franchise opportunities become available.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C4B7E] focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                    required
                />
                {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
            </div>
            <div>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email address"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2C4B7E] focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                    required
                />
                {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#2C4B7E] text-white font-medium py-3 px-6 rounded-lg hover:bg-[#1B3A6B] transition-colors disabled:opacity-50"
            >
                {isLoading ? "Joining..." : "Join Waitlist"}
            </button>
        </form>
    );
};

// Confirmation Popup Component
const FranchiseConfirmationPopup: React.FC<{ isVisible: boolean; onClose: () => void; fullName: string }> = ({ isVisible, onClose, fullName }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Popup */}
            <div className="relative bg-white rounded-3xl p-8 max-w-lg w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-500">
                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-[#2C4B7E] to-[#1B3A6B] rounded-full flex items-center justify-center ">
                    <span className="text-white text-2xl">🚀</span>
                </div>



                {/* Content */}
                <div className="text-center relative z-10">
                    {/* Success Icon */}
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in-95 duration-700 delay-200">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-[#1B3A6B] mb-4 animate-in slide-in-from-bottom-4 duration-700 delay-300">
                        Welcome to the Laza Family! 🎊
                    </h2>

                    {/* Message */}
                    <p className="text-[#2C4B7E] text-lg leading-relaxed mb-6 animate-in slide-in-from-bottom-4 duration-700 delay-400">
                        Thank you, <span className="font-semibold">{fullName}</span>! Your franchise inquiry has been received and we're excited to explore this opportunity with you.
                    </p>

                    {/* Additional Info */}
                    <div className="bg-gradient-to-r from-[#2C4B7E]/10 to-[#1B3A6B]/10 rounded-2xl p-4 mb-6 animate-in slide-in-from-bottom-4 duration-700 delay-500">
                        <p className="text-[#1B3A6B] font-semibold mb-2">What's Next?</p>
                        <p className="text-[#2C4B7E] text-sm">
                            Our franchise development team will carefully review your information and reach out within 48 hours to discuss next steps and answer your questions.
                        </p>
                    </div>

                    {/* Email Confirmation */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 mb-6 animate-in slide-in-from-bottom-4 duration-700 delay-600">
                        <p className="text-blue-700 text-sm font-medium">
                            📧 Check your email for confirmation details
                        </p>
                    </div>

                    {/* Franchise Benefits Preview */}
                    <div className="grid grid-cols-1 gap-3 mb-6 animate-in slide-in-from-bottom-4 duration-700 delay-700">
                        <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-2">
                            <span className="text-amber-600">🏆</span>
                            <span className="text-amber-700 text-sm font-medium">Proven Business Model</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-2">
                            <span className="text-green-600">📚</span>
                            <span className="text-green-700 text-sm font-medium">Comprehensive Training</span>
                        </div>
                        <div className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-2">
                            <span className="text-purple-600">📈</span>
                            <span className="text-purple-700 text-sm font-medium">Growing Market</span>
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="bg-gradient-to-r from-[#2C4B7E] to-[#1B3A6B] text-white font-semibold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-in slide-in-from-bottom-4 duration-700 delay-800"
                    >
                        Got it! ✨
                    </button>
                </div>

                {/* Floating franchise icons */}
                {/* <div className="absolute top-4 left-4 text-2xl animate-bounce delay-1000">🏪</div>
                <div className="absolute top-8 right-8 text-xl animate-bounce delay-1200">💼</div>
                <div className="absolute bottom-8 left-8 text-xl animate-bounce delay-1400">📊</div>
                <div className="absolute bottom-4 right-4 text-lg animate-bounce delay-1600">🎯</div> */}
            </div>
        </div>
    );
};

export default function JoinUsPage() {
    // Set canonical URL for SEO
    React.useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'canonical';
        link.href = 'https://lazadessert.cafe/join-us';
        document.head.appendChild(link);

        return () => {
            document.head.removeChild(link);
        };
    }, []);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Restaurant",
                        "name": "Laza Dessert Cafe",
                        "description": "Franchise opportunities coming soon. Join our waitlist to be notified when we start franchising.",
                        "url": "https://lazadessert.cafe/join-us",
                        "logo": "https://lazadessert.cafe/lazabluelogo.png",
                        "sameAs": [
                            "https://www.instagram.com/lazacafe/?hl=en",
                            "https://www.tiktok.com/@lazacafe"
                        ]
                    })
                }}
            />

            <main className="min-h-screen bg-gray-50 py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16 mt-20">
                        <div className="mb-6">
                            <Image
                                src="/lazabluelogo.png"
                                alt="Laza Cafe Logo"
                                width={80}
                                height={80}
                                className="mx-auto"
                            />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-4">
                            Franchise Opportunities
                        </h1>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            We're preparing to expand the Laza experience to new communities.
                            Join our waitlist to be among the first to know when franchise opportunities become available.
                        </p>
                    </div>

                    {/* Waitlist Form */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-16">
                        <div className="max-w-md mx-auto">
                            <h2 className="text-2xl font-medium text-gray-900 mb-6 text-center">Join Our Waitlist</h2>
                            <WaitlistForm />
                        </div>
                    </div>

                    {/* About Laza */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                        <div>
                            <h3 className="text-2xl font-medium text-gray-900 mb-6">About Laza Dessert Cafe</h3>
                            <div className="space-y-4 text-gray-600">
                                <p>
                                    Laza Dessert Cafe brings together the finest Middle Eastern desserts with modern cafe culture.
                                    Our signature kunafa, artisanal crepes, and premium coffee create an unforgettable experience.
                                </p>
                                <p>
                                    Founded with a passion for quality and community, we've built a loyal following through
                                    authentic flavors, exceptional service, and a welcoming atmosphere that keeps customers coming back.
                                </p>
                                <p>
                                    Our menu features traditional favorites like pistachio kunafa and innovative creations
                                    like our signature Laza Special, all made with premium ingredients and time-honored techniques.
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-2xl font-medium text-gray-900 mb-6">Why Franchise with Laza</h3>
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="w-8 h-8 bg-[#2C4B7E] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-1">Proven Concept</h4>
                                        <p className="text-gray-600 text-sm">Successful locations with strong community presence and loyal customer base</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="w-8 h-8 bg-[#2C4B7E] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-1">Growing Market</h4>
                                        <p className="text-gray-600 text-sm">Dessert and specialty coffee market continues to expand nationwide</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="w-8 h-8 bg-[#2C4B7E] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-1">Comprehensive Support</h4>
                                        <p className="text-gray-600 text-sm">Training, marketing, operations support, and ongoing guidance</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-4">
                                    <div className="w-8 h-8 bg-[#2C4B7E] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-1">Unique Menu</h4>
                                        <p className="text-gray-600 text-sm">Distinctive offerings that set us apart from traditional coffee shops</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Current Locations */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-16">
                        <h3 className="text-2xl font-medium text-gray-900 mb-8 text-center">Visit Our Current Locations</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="text-center">
                                <h4 className="text-lg font-medium text-gray-900 mb-2">Brooklyn</h4>
                                <p className="text-gray-600 mb-1">6740 5th Ave, Brooklyn, NY 11220</p>
                                <p className="text-sm text-gray-500">Open 2:00 PM - 2:00 AM</p>
                            </div>
                            <div className="text-center">
                                <h4 className="text-lg font-medium text-gray-900 mb-2">Astoria</h4>
                                <p className="text-gray-600 mb-1">25-33 Steinway St, Astoria, NY 11220</p>
                                <p className="text-sm text-gray-500">Open 2:00 PM - 2:00 AM</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="text-center">
                        <h3 className="text-xl font-medium text-gray-900 mb-4">Questions?</h3>
                        <p className="text-gray-600 mb-6">
                            For more information about our current operations and future franchise opportunities,
                            please visit one of our locations or follow us on social media.
                        </p>
                        <div className="flex justify-center space-x-6">
                            <a
                                href="https://www.instagram.com/lazacafe/?hl=en"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-[#2C4B7E] transition-colors"
                            >
                                Instagram
                            </a>
                            <a
                                href="https://www.tiktok.com/@lazacafe"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 hover:text-[#2C4B7E] transition-colors"
                            >
                                TikTok
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
} 