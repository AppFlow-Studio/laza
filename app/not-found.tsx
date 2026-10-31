'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center px-4">
            <div className="max-w-4xl mx-auto text-center pt-20">
                {/* Background decorative elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#2C4B7E]/10 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#2C4B7E]/10 to-transparent rounded-full blur-3xl"></div>
                </div>

                {/* Main content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10"
                >
                    {/* Logo */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mb-8"
                    >
                        <Image
                            src="/lazabluelogo.png"
                            alt="Laza Dessert Cafe"
                            width={200}
                            height={80}
                            className="mx-auto rounded-full h-40 w-40"
                        />
                    </motion.div>

                    {/* 404 Number */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="mb-6"
                    >
                        <h1 className="text-8xl md:text-9xl font-bold text-[#2C4B7E] leading-none">
                            404
                        </h1>
                    </motion.div>

                    {/* Error Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="mb-8"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1B3A6B] mb-4">
                            Oops! Page Not Found
                        </h2>
                        <p className="text-lg md:text-xl text-[#2C4B7E] max-w-2xl mx-auto leading-relaxed">
                            Looks like this dessert got lost in the kitchen! The page you're looking for doesn't exist or has been moved.
                        </p>
                    </motion.div>

                    {/* Decorative dessert icon */}
                    <motion.div
                        initial={{ rotate: -10, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="mb-8"
                    >
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#2C4B7E] to-[#1B3A6B] rounded-full flex items-center justify-center shadow-lg">
                            <svg
                                className="w-12 h-12 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
                    >
                        <Link
                            href="/"
                            className="px-8 py-4 bg-[#2C4B7E] text-white font-semibold rounded-full hover:bg-[#1B3A6B] transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            🏠 Back to Home
                        </Link>
                        <Link
                            href="/menu"
                            className="px-8 py-4 bg-white text-[#2C4B7E] font-semibold rounded-full border-2 border-[#2C4B7E] hover:bg-[#2C4B7E] hover:text-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                        >
                            🍰 Browse Menu
                        </Link>
                    </motion.div>

                    {/* Helpful Links */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1.2 }}
                        className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#2C4B7E]/10"
                    >
                        <h3 className="text-xl font-semibold text-[#1B3A6B] mb-4">
                            Looking for something specific?
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Link
                                href="/about"
                                className="p-4 bg-white rounded-xl hover:bg-[#2C4B7E]/5 transition-all duration-300 border border-[#2C4B7E]/10 hover:border-[#2C4B7E]/30"
                            >
                                <div className="text-[#2C4B7E] font-medium">About Us</div>
                                <div className="text-sm text-[#2C4B7E]/70">Learn our story</div>
                            </Link>
                            <Link
                                href="/catering"
                                className="p-4 bg-white rounded-xl hover:bg-[#2C4B7E]/5 transition-all duration-300 border border-[#2C4B7E]/10 hover:border-[#2C4B7E]/30"
                            >
                                <div className="text-[#2C4B7E] font-medium">Catering</div>
                                <div className="text-sm text-[#2C4B7E]/70">Events & parties</div>
                            </Link>
                            <Link
                                href="/join-us"
                                className="p-4 bg-white rounded-xl hover:bg-[#2C4B7E]/5 transition-all duration-300 border border-[#2C4B7E]/10 hover:border-[#2C4B7E]/30"
                            >
                                <div className="text-[#2C4B7E] font-medium">Join Us</div>
                                <div className="text-sm text-[#2C4B7E]/70">Franchise opportunities</div>
                            </Link>
                        </div>
                    </motion.div>

                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1.4 }}
                        className="mt-8 text-[#2C4B7E]"
                    >
                        <p className="text-sm">
                            Still can't find what you're looking for?{' '}
                            <Link href="/contact" className="underline hover:text-[#1B3A6B] font-medium">
                                Contact us
                            </Link>{' '}
                            and we'll help you out!
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
