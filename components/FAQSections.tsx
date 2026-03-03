'use client'
import React, { useState } from 'react'
import { Minus, Plus } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import Image from 'next/image'
const faqs = [
    {
        question: "What are your hours of operation?",
        answer:
            "We're open 7 days a week from 2 PM to 2 AM. Perfect for late-night cravings or sweet daytime escapes.",
    },
    {
        question: "Where are you located?",
        answer: "We have locations in Brooklyn and Astoria, NY.",
    },
    {
        question: "What is Kunafa?",
        answer: "Kunafa is a traditional Middle Eastern dessert made with shredded phyllo dough, layered with a creamy cheese filling, and soaked in sweet, rose-scented syrup. It's served warm and often topped with crushed pistachios for a delightful blend of textures and flavors.",
    },
    {
        question: "Do you offer catering?",
        answer: "Absolutely! We offer catering for events of all sizes. Contact us for more details.",
    },
    {
        question: "Can I customize a dessert or order a custom cake?",
        answer: "Yes, we love custom orders! Reach out to us to discuss your ideas.",
    },
    {
        question: "Do you have seating available?",
        answer: "Yes, we have comfortable seating for you to enjoy your desserts in-store.",
    },
];
export default function FAQsSections() {
    const [openItem, setOpenItem] = useState<number>(0)

    const toggleItem = (index: number) => {
        setOpenItem(openItem === index ? -1 : index)
    }


    return (
        <section className="flex flex-col md:flex-row w-full items-stretch justify-center py-24 gap-8 relative z-10">
            {/* Left: Title and image */}
            <div className="flex flex-col items-start justify-center w-full md:w-[40%] relative z-10">
                <h2 className="text-5xl md:text-7xl mb-12 font-500 leading-tight"
                style={{
                    fontFamily: "var(--font-bebas)",
                }}
                >Frequently<br />Asked<br />Questions</h2>
                <div className="relative w-140 h-140 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem),linear-gradient(to_top,transparent,black_6rem)]">
                    <Image src="/desserts/oreocrepe.png" alt="Dessert" fill className="object-cover w-full h-full " />
                    <div className="absolute -top-0 left-1/4  rounded-full overflow-hidden w-40 h-40 border-4 border-white bg-white flex items-center justify-center shadow-lg">
                        <Image src="/lazabluelogo.png" alt="Laza Logo" fill className="object-cover" />
                    </div>
                </div>
            </div>
            <main className='w-full flex flex-col items-center justify-center h-full z-10'>
                <section className="max-w-[1440px] w-full h-full flex flex-col relative overflow-hidden space-y-[60px] px-6 xl:px-[100px] py-[50px]">
                    <div className="space-y-[20px] flex flex-col">
                        {faqs.map((item, index) => (
                            <div
                                key={index}
                                className={`border border-[#DCDEE1] rounded-[20px] overflow-hidden bg-[#FAFAFA] ${openItem === index ? "shadow-md" : ""}`}
                            >
                                <button
                                    onClick={() => toggleItem(index)}
                                    className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                                    aria-expanded={openItem === index}
                                >
                                    <span
                                        style={{
                                            fontFamily: 'var(--font-raleway)',
                                            fontWeight: 500,
                                        }}
                                        className={`${openItem === index ? 'text-black' : 'text-[#5B5F67]'} text-2xl`}
                                    >{item.question}</span>
                                    <motion.div initial={false} animate={{ rotate: openItem === index ? 0 : 0 }}>
                                        {openItem === index ? (
                                            <Minus className="h-5 w-5 text-black" />
                                        ) : (
                                            <Plus className="h-5 w-5 text-[#838890]" />
                                        )}
                                    </motion.div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {openItem === index && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="overflow-hidden text-[#54535C]"
                                        >
                                            <div className="px-6 pb-6 text-gray-600"
                                                style={{
                                                    fontFamily: 'var(--font-inter)',
                                                    fontWeight: 400,
                                                }}

                                            >{item.answer}</div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </section>
    )
}