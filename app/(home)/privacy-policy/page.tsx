import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-white pt-8">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-6">
                <div className="max-w-4xl mx-auto">
                    <Link href="/" className="inline-flex items-center mb-6 hover:opacity-80 transition-opacity">
                        <Image
                            src="/lazabluelogo.png"
                            alt="Laza Logo"
                            width={120}
                            height={40}
                            className="h-10 w-auto"
                        />
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#2C4B7E] mb-4">
                        Privacy Policy
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Last updated: January 2025
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="prose prose-lg max-w-none">
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Introduction
                        </h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            At Laza Cafe, we respect your privacy and are committed to protecting your personal information.
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
                            you visit our website, use our services, or interact with us.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Information We Collect
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Personal Information</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    We may collect personal information such as your name, email address, phone number,
                                    and delivery address when you place orders, create an account, or contact us.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Usage Information</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    We automatically collect certain information about your device and how you interact
                                    with our website, including IP address, browser type, pages visited, and time spent on pages.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            How We Use Your Information
                        </h2>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700">
                            <li>Process and fulfill your orders</li>
                            <li>Communicate with you about your orders and account</li>
                            <li>Send you promotional offers and updates (with your consent)</li>
                            <li>Improve our website and services</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Information Sharing
                        </h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            We do not sell, trade, or rent your personal information to third parties. We may share
                            your information only in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700">
                            <li>With service providers who assist in our operations</li>
                            <li>To comply with legal requirements</li>
                            <li>To protect our rights and safety</li>
                            <li>With your explicit consent</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Data Security
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            We implement appropriate security measures to protect your personal information against
                            unauthorized access, alteration, disclosure, or destruction. However, no method of
                            transmission over the internet is 100% secure.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Your Rights
                        </h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            You have the right to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700">
                            <li>Access your personal information</li>
                            <li>Correct inaccurate information</li>
                            <li>Request deletion of your information</li>
                            <li>Opt-out of marketing communications</li>
                            <li>Lodge a complaint with supervisory authorities</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Cookies and Tracking
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            We use cookies and similar technologies to enhance your browsing experience, analyze
                            website traffic, and personalize content. You can control cookie settings through
                            your browser preferences.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Children's Privacy
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            Our services are not intended for children under 13 years of age. We do not knowingly
                            collect personal information from children under 13. If you believe we have collected
                            such information, please contact us immediately.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Changes to This Policy
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any changes
                            by posting the new policy on this page and updating the "Last updated" date.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Contact Us
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have any questions about this Privacy Policy or our privacy practices,
                            please contact us at:
                        </p>
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-700">
                                <strong>Laza Cafe</strong><br />
                                Email: privacy@lazacafe.com<br />
                                Phone: (555) 123-4567<br />
                                Address: 6740 5th Ave, Brooklyn, NY 11220
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            {/* Back to Home Button */}
            <div className="max-w-4xl mx-auto px-4 pb-12">
                <Link
                    href="/"
                    className="inline-flex items-center px-6 py-3 bg-[#2C4B7E] text-white rounded-lg hover:bg-[#1a365d] transition-colors duration-200"
                >
                    ← Back to Home
                </Link>
            </div>
        </div>
    );
}
