"use client"
import React, { useState } from "react";
import { useCartStore } from "@/utils/cart";
import Image from "next/image";
import ContactForm from "@/components/ContactForm";
import type { CartItem } from "@/utils/cart";
import PaymentForm from "@/components/PaymentForm";
import FadeIn from "@/components/FadeIn";
import CartItemCard from "@/components/CartItemCard";

const addresses = [
    {
        id: 1,
        label: "6740 5th Ave,\nBrooklyn, NY 11220",
    },
    {
        id: 2,
        label: "25-33 Steinway St,\nAstoria, NY",
    },
];

export default function CheckoutPage() {
    const { items, removeItem } = useCartStore();
    const [selectedAddress, setSelectedAddress] = useState(addresses[0].id);
    const [pickupMethod, setPickupMethod] = useState("in_store");
    const [pickupTime, setPickupTime] = useState("standard");

    return (
        <div className="max-w-7xl mx-auto px-4 mt-30 relative pb-30">

            <div className="flex flex-col lg:flex-row gap-10 h-full">
                {/* Left: Pickup options and Contact Form */}
                <div className="flex-1 min-w-[260px] lg:max-w-md w-full space-y-8 z-10 lg:order-first order-last">
                    <div className="flex-col md:flex hidden">
                        <h1 className="text-5xl md:text-6xl font-[--font-playfair] font-500 mb-2">Checkout</h1>
                        <div className="mb-8">
                            <span className="text-[#2C4B7E] text-lg font-semibold cursor-pointer">Items ({items.length})</span>
                        </div>
                    </div>
                    <div className="flex lg:flex-row items-center justify-between">
                        <div className="font-semibold mb-2">Pickup Method</div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                checked={pickupMethod === "in_store"}
                                onChange={() => setPickupMethod("in_store")}
                                className="accent-[#2C4B7E] w-5 h-5"
                            />
                            <span>In Store</span>
                        </label>
                    </div>
                    <div className="flex lg:flex-row items-center justify-between">
                        <div className="font-semibold mb-2">Pickup Time</div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                checked={pickupTime === "standard"}
                                onChange={() => setPickupTime("standard")}
                                className="accent-[#2C4B7E] w-5 h-5"
                            />
                            <span>Standard (10 - 15 mins)</span>
                        </label>
                    </div>
                    <div className="flex lg:flex-row items-start justify-between">
                        <div className="font-semibold mb-2">Pickup address</div>
                        <div>
                            <div className="text-[#2C4B7E] text-base font-medium mb-2 cursor-pointer">Choose Location</div>
                            {addresses.map((addr) => (
                                <label key={addr.id} className="flex items-start gap-3 cursor-pointer mb-2">
                                    <input
                                        type="radio"
                                        checked={selectedAddress === addr.id}
                                        onChange={() => setSelectedAddress(addr.id)}
                                        className="accent-[#2C4B7E] w-5 h-5 mt-1"
                                    />
                                    <span className={`whitespace-pre-line ${selectedAddress === addr.id ? "font-bold text-black" : "text-gray-700"}`}>{addr.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {/* Contact Form Section */}
                    <ContactForm />
                    {/* Payment Form Section */}
                    <PaymentForm />
                </div>
                {/* Right: Cart Items and Order Summary */}
                <div className="flex-1 flex flex-col space-y-8 z-10">
                    <div className="flex-col md:hidden flex">
                        <h1 className="text-5xl md:text-6xl font-[--font-playfair] font-500 mb-2">Checkout</h1>
                        <div className="mb-8">
                            <span className="text-[#2C4B7E] text-lg font-semibold cursor-pointer">Items ({items.length})</span>
                        </div>
                    </div>
                    {/* Cart Items */}
                    {items.map((item) => (
                        <CartItemCard
                            key={item.id}
                            item={item}
                            onUpdate={(updatedItem) => {
                                // Update the item in Zustand
                                useCartStore.setState((state) => ({
                                    items: state.items.map((i) =>
                                        i.id === updatedItem.id ? { ...i, ...updatedItem } : i
                                    ),
                                }));
                            }}
                            onDelete={(id) => removeItem(id)}
                        />
                    ))}
                    {/* Order Summary */}
                    <OrderSummary items={items} />
                </div>
            </div>

            <div className=" absolute bottom-0 left-0 z-0 w-full h-fit max-w-8xl overflow-hidden">
                <FadeIn>
                    <p className="text-start xl:text-[20rem] md:text-[16rem] text-8xl"
                        style={{
                            background: "linear-gradient(180deg, #FFF 0%, #F1F1F1 100%)",
                            backgroundClip: "text",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            fontFamily: "var(--font-playfair)",
                        }}
                    >ORDER</p>
                </FadeIn>
            </div>

        </div>
    );
}

function OrderSummary({ items }: { items: CartItem[] }) {
    const subtotal = items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
    const tax = +(subtotal * 0.01).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    return (
        <div
            className="mt-8 p-8"
            style={{
                borderRadius: 10,
                background: "rgba(255,255,255,0.20)",
                boxShadow: "0px 2px 4px 2px rgba(0,0,0,0.10) inset",
            }}
        >
            <div className="flex flex-row items-center justify-between text-xl mb-6">
                <span className="flex flex-row w-full">Subtotal<span className="mx-2 grow border-b border-dotted border-black/80 inline-block align-middle" style={{ borderWidth: 0, borderBottomWidth: 2, width: '100%' }}></span></span>
                <span className="text-[#2C4B7E] font-bold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex flex-row items-center justify-between text-xl mb-6">
                <span className="flex flex-row w-full">Tax<span className="mx-2 grow border-b border-dotted border-black/80 inline-block align-middle" style={{ borderWidth: 0, borderBottomWidth: 2, width: '100%' }}></span></span>
                <span className="text-[#2C4B7E] font-bold">${tax.toFixed(2)}</span>
            </div>
            <div className="flex flex-row items-center justify-between text-2xl mt-8">
                <span className="flex flex-row w-full font-bold">Total<span className="mx-2 grow border-b border-dotted border-black/80 inline-block align-middle" style={{ borderWidth: 0, borderBottomWidth: 2, width: '100%' }}></span></span>
                <span className="text-[#2C4B7E] font-bold">${total.toFixed(2)}</span>
            </div>
        </div>
    );
} 