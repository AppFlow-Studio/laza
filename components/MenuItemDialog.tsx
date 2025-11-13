"use client"
import React, { useState } from "react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useCartStore } from "@/utils/cart";

interface Modifier {
    name: string;
    options: string[];
}

interface MenuItemDialogProps {
    children: React.ReactNode;
    imageSrc: string;
    title: string;
    description: string;
    price: string | number;
    modifiers: Modifier[];
    externalOpen?: boolean;
    setExternalOpen?: (open: boolean) => void;
    imagePosition?: string;
}

const MenuItemDialog: React.FC<MenuItemDialogProps> = ({ children, imageSrc, title, description, price, modifiers, externalOpen, setExternalOpen, imagePosition }) => {
    const [quantity, setQuantity] = useState(1);
    const [selectedAddons, setSelectedAddons] = useState<Record<string, string>>({});
    const [comments, setComments] = useState("");
    const { addItem } = useCartStore();
    // Use external open state if provided, otherwise internal
    const [internalOpen, setInternalOpen] = useState(false);
    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = setExternalOpen ? setExternalOpen : setInternalOpen;
    const [showConfirmation, setShowConfirmation] = useState(false);

    const handleAddToCart = () => {
        addItem({
            name: title,
            price: Number(price),
            description: description,
            imageSrc: imageSrc,
            quantity: quantity,
            modifiers: Object.entries(selectedAddons).map(([name, option]) => ({ name, options: option })),
            comments: comments,
        });
        setShowConfirmation(true);
        setTimeout(() => {
            setShowConfirmation(false);
            setOpen(false);
        }, 1200);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* Only render DialogTrigger if using internal state */}
            {children}
            <DialogContent className="w-full lg:max-w-[calc(60%-2rem)] [&>button:last-child]:hidden max-h-[90vh] p-0 overflow-y-auto overflow-x-hidden rounded-3xl">
                {/* Animated Added to Cart Confirmation */}
                {showConfirmation && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <div className="bg-[#2C4B7E] text-white px-8 py-5 rounded-2xl shadow-2xl text-2xl font-bold flex items-center gap-3 animate-bounce-in animate-fade-in transition-all duration-500">
                            <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#fff" opacity="0.15" /><path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Added to cart!
                        </div>
                    </div>
                )}
                {/* Image */}
                <div className="relative w-full lg:h-130 bg-[#1B3A6B] aspect-video">
                    <Image src={imageSrc} alt={title} fill quality={100} className="object-cover" style={{ objectPosition: imagePosition || 'center' }} />
                </div>
                <div className="flex flex-col gap-6 px-10 py-4">
                    <DialogHeader className="items-start">
                        <DialogTitle className="text-3xl font-bold">{title}</DialogTitle>
                    </DialogHeader>
                    <p className="text-lg text-black/80 ">{description}</p>
                    {/* Add-ons */}
                    {modifiers.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Add-ons</h3>
                            <div className="flex flex-col flex-wrap gap-4">
                                {modifiers.map((mod) => (
                                    <div key={mod.name} className="flex flex-col ">
                                        <span className="mb-1 font-medium text-black/80">{mod.name}</span>
                                        <div className="flex gap-2">
                                            {mod.options.map((opt) => (
                                                <button
                                                    key={opt}
                                                    className={`px-4 py-2 rounded-full border transition-all sm:text-base text-sm font-medium ${selectedAddons[mod.name] === opt ? "bg-[#2C4B7E] text-white border-[#2C4B7E]" : "bg-[rgba(255,255,255,0.20)] shadow-[0px_2px_4px_2px_rgba(0,0,0,0.10)_inset]"}`}
                                                    onClick={() => setSelectedAddons((prev) => ({ ...prev, [mod.name]: opt }))}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Special Instructions */}
                    <div className="w-full">
                        <h3 className="text-lg font-semibold mb-2">Special Instructions</h3>
                        <textarea
                            className="w-full placeholder:text-sm rounded-full p-4 bg-[rgba(255,255,255,0.20)] shadow-[0px_2px_4px_2px_rgba(0,0,0,0.10)_inset] border-none outline-none text-base min-h-[60px] resize-none"
                            placeholder="We’ll do our best to accommodate special requests but may not be able to honor all substitutes. Extra charges may apply."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                    </div>
                    {/* Footer: Quantity, Add to cart */}
                    <div className="flex items-center justify-between gap-4 mt-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                type="button"
                            >
                                –
                            </button>
                            <span className="w-8 text-center text-lg font-semibold bg-[#2C4B7E] text-white rounded-full flex items-center justify-center px-6 py-1">{quantity}</span>
                            <button
                                onClick={() => setQuantity((q) => q + 1)}
                                type="button"
                            >
                                +
                            </button>
                        </div>
                        <button onClick={handleAddToCart} className="flex justify-between items-center gap-3 bg-[#2C4B7E] text-white md:w-[40%] w-full text-lg font-semibold rounded-2xl px-3 py-3 shadow-[0px_2px_4px_2px_rgba(0,0,0,0.10)_inset] hover:scale-105 transition-all duration-300 hover:bg-[#2C4B7E]">
                            <div className="flex items-center gap-3">
                                <Image src="/icons/bag.png" alt="cart" width={15} height={15} />
                                <span className="hidden md:inline">Add to cart</span>
                            </div>
                            <span className="ml-2">${Number(price) * quantity}</span>
                        </button>
                    </div>
                </div>
                <DialogClose asChild>
                    <button className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-200 text-2xl z-10">
                        ×
                    </button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    );
};

export default MenuItemDialog; 