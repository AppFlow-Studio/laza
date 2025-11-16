'use client';

import React from "react";
import Image from "next/image";
import AutoPlayVideo from "@/components/AutoPlayVideo";
import FadeIn from "./FadeIn";
import OrderNowButton from "./OrderNowButton";

export default function HeroVideo() {
    return (
        <section className="relative aspect-video w-full lg:h-auto sm:min-h-100 h-[85vh]">
            {/* Background Video */}
            <div className="absolute inset-0 w-full sm:h-full h-[85vh]">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    src="https://laza-dessert-cafe.b-cdn.net/herovideo.mp4"
                    className="w-full sm:h-full h-[85vh] object-cover sm:object-center object-left"
                    id="hero-video"
                />
                <div className="absolute inset-0 bg-black/40 sm:h-auto h-[85vh]"></div>
            </div>

            <div className="relative z-10 flex flex-col sm:items-start items-center lg:px-20 px-4 sm:space-y-8 space-y-4 sm:pb-0 sm:justify-center justify-center sm:h-full h-[85vh] py-4">
                <FadeIn className="sm:w-fit sm:h-fit w-80">
                    <Image src="https://laza-dessert-cafe.b-cdn.net/lazacafehero.png" alt="Laza Desserts" width={400} height={400} />
                </FadeIn>
                <FadeIn className="sm:w-fit w-full h-fit sm:text-start text-center">
                    <p className="text-white ml-3 sm:text-3xl text-2xl">
                        WE ARE OPEN FROM <br />
                        <span className="font-bold">Sunday - Saturday</span>:<br className="sm:hidden block" /> 2:00pm - 2:00am
                    </p>
                </FadeIn>
                <FadeIn className="w-fit h-fit">
                    <div className="ml-4 mt-4">
                        <OrderNowButton />
                    </div>
                </FadeIn>
            </div>
        </section>
    );
}
