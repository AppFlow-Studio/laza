import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function TermsConditions() {
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
                        Terms & Conditions
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
                            Agreement to Terms
                        </h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            By accessing and using the Laza Cafe website and services, you accept and agree to be bound
                            by the terms and provision of this agreement. If you do not agree to abide by the above,
                            please do not use this service.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Use License
                        </h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            Permission is granted to temporarily download one copy of the materials (information or software)
                            on Laza Cafe's website for personal, non-commercial transitory viewing only. This is the grant
                            of a license, not a transfer of title, and under this license you may not:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-700">
                            <li>Modify or copy the materials</li>
                            <li>Use the materials for any commercial purpose or for any public display</li>
                            <li>Attempt to reverse engineer any software contained on the website</li>
                            <li>Remove any copyright or other proprietary notations from the materials</li>
                            <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Ordering and Payment
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Order Acceptance</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    All orders are subject to acceptance and availability. We reserve the right to refuse
                                    service to anyone for any reason at any time.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Pricing</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    All prices are subject to change without notice. Prices do not include applicable taxes,
                                    which will be added to your order total.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Payment</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Payment must be made at the time of ordering. We accept major credit cards, debit cards,
                                    and other payment methods as indicated on our website.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Delivery and Pickup
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Delivery</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Delivery is available within our designated service areas. Delivery times are estimates
                                    and may vary based on order volume and weather conditions.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Pickup</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Orders for pickup must be collected within 30 minutes of the estimated ready time.
                                    Unclaimed orders may be disposed of after this period.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Refunds and Cancellations
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Order Cancellation</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Orders may be cancelled up to 15 minutes before the estimated ready time.
                                    Cancellations made after this time may not be eligible for a refund.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Refunds</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Refunds will be processed for orders that are cancelled within the allowed time frame
                                    or in cases where we are unable to fulfill your order. Refunds may take 3-5 business
                                    days to appear on your statement.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Food Safety and Allergies
                        </h2>
                        <p className="text-gray-700 mb-4 leading-relaxed">
                            While we take great care in preparing our food, we cannot guarantee that our products are
                            free from allergens. If you have food allergies or dietary restrictions, please inform us
                            when placing your order.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            We are not responsible for any allergic reactions or health issues that may occur from
                            consuming our products.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Intellectual Property
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            The content on this website, including but not limited to text, graphics, images, logos,
                            and software, is the property of Laza Cafe and is protected by copyright and other
                            intellectual property laws.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Limitation of Liability
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            In no event shall Laza Cafe, nor its directors, employees, partners, agents, suppliers,
                            or affiliates, be liable for any indirect, incidental, special, consequential, or punitive
                            damages, including without limitation, loss of profits, data, use, goodwill, or other
                            intangible losses.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Governing Law
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            These terms and conditions are governed by and construed in accordance with the laws of
                            the State of New York, and you irrevocably submit to the exclusive jurisdiction of the
                            courts in that state or location.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Changes to Terms
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            We reserve the right to modify these terms and conditions at any time. Changes will be
                            effective immediately upon posting on the website. Your continued use of the website
                            after any changes constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-[#2C4B7E] mb-6">
                            Contact Information
                        </h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have any questions about these Terms & Conditions, please contact us at:
                        </p>
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-gray-700">
                                <strong>Laza Cafe</strong><br />
                                Email: legal@lazacafe.com<br />
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
