"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
export default function SlideScale({ products }: { products: any[] }) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const autoplayIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-play functionality
  const pauseAutoplay = React.useCallback(() => {
    if (autoplayIntervalRef.current) {
      clearInterval(autoplayIntervalRef.current);
      autoplayIntervalRef.current = null;
    }
  }, []);

  const startAutoplay = React.useCallback(() => {
    if (!api) return;

    pauseAutoplay();
    autoplayIntervalRef.current = setInterval(() => {
      api.scrollNext();
    }, 4000); // 4 seconds
  }, [api, pauseAutoplay]);

  const resumeAutoplay = React.useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
    pauseTimeoutRef.current = setTimeout(() => {
      startAutoplay();
    }, 6000); // Resume after 6 seconds of inactivity
  }, [startAutoplay]);

  const handleUserInteraction = React.useCallback(() => {
    pauseAutoplay();
    resumeAutoplay();
  }, [pauseAutoplay, resumeAutoplay]);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    // Start autoplay initially
    startAutoplay();

    // Pause on user interaction (swipe, drag, etc.)
    api.on("pointerDown", handleUserInteraction);
    api.on("select", handleUserInteraction);

    // Cleanup
    return () => {
      pauseAutoplay();
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
      api.off("pointerDown", handleUserInteraction);
      api.off("select", handleUserInteraction);
    };
  }, [api, startAutoplay, pauseAutoplay, handleUserInteraction]);

  const handlePrev = () => {
    handleUserInteraction();
    api?.scrollPrev();
  };

  const handleNext = () => {
    handleUserInteraction();
    api?.scrollNext();
  };

  const handleDotClick = (index: number) => {
    handleUserInteraction();
    api?.scrollTo(index);
  };

  const link = `https://order.toasttab.com/online/locations/e4e3218e-7ad2-411f-a156-ec157a00652f/default`

  return (
    <div className="mx-auto max-w-8xl h-full [mask-composite:intersect] sm:[mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem),linear-gradient(to_top,transparent,black_0.5rem)]">
      <Carousel
        setApi={setApi}
        className="w-full max-w-8xl xl:h-120 h-full border "
        opts={{
          loop: true,
          align: "center",
          slidesToScroll: 1,
        }}
      >
        {/* <CarouselContent className="py-3 -ml-2 md:-ml-4">
          {Array.from({ length: 7 }).map((_, index) => {
            const isCenter = index === current ;
            return (
              <CarouselItem
                key={index}
                className="pl-2 md:pl-4 basis-[85%] sm:basis-[70%] md:basis-[60%] lg:basis-[30%] "
              >
                <div className="relative h-full transition-transform duration-700 ease-in-out">
                  <Card
                    className={cn("h-full transition-transform duration-700 ease-in-out will-change-transform", {
                      "scale-100 opacity-100 z-10": isCenter,
                      "scale-[0.75] opacity-50": !isCenter,
                    })}
                  >
                    <CardContent className={cn("flex h-full p-4 md:p-6 transition-transform duration-700", {
                      "flex-row items-center gap-4 md:gap-6 min-h-[300px] md:min-h-[400px]": isCenter,
                      "flex-col aspect-square items-center justify-center": !isCenter,
                    })}>
                      {isCenter ? (
                        <>
                          <div className="flex-1 flex flex-col justify-center space-y-3 md:space-y-4">
                            <span className="text-3xl md:text-4xl font-semibold">Item {index + 1}</span>
                            <p className="text-base md:text-lg text-gray-600">
                              This is the center item with text and features on the left side.
                            </p>
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center space-x-2">
                                <span>✓</span>
                                <span>Feature 1</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span>✓</span>
                                <span>Feature 2</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span>✓</span>
                                <span>Feature 3</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg min-h-[200px] md:min-h-[300px]">
                            <span className="text-gray-400">Image Here</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-4xl font-semibold">{index + 1}</span>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            );
          })} */}
        <CarouselContent className="py-3 0 h-full w-full ">
          {products.map((product, index) => (
            <CarouselItem key={index} className={cn(`xl:basis-[25%] lg:basis-[33%] sm:basis-[45%] `, {})}>
              <Card
                className={cn("transition-transform duration-500 ease-in-out h-full w-full bg-transparent", {
                  "sm:scale-[0.6]": index !== current,
                  "xl:scale-120 sm:scale-110": index === current,
                })}
              >
                {/* <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-4xl font-semibold">{index + 1}</span>
                </CardContent> */}
                <CardContent className={`flex flex-col aspect-square items-center justify-center `}>
                  {index === current ? (
                    <div className="flex flex-row items-center justify-between  w-full ">
                      <div className="flex-1 w-[55%] flex items-center justify-center bg-gray-100 min-h-[200px] md:min-h-[300px] relative rounded-2xl overflow-hidden" >
                        <Image src={product.imageSrc} alt={product.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center items-end space-y-3 md:space-y-4 w-[45%] h-full text-center">
                        <span className="text-xl font-semibold">{product.title}</span>
                        <ul className="text-xs text-gray-600  text-end">
                          {product.description.split('/').map((line, index) => (
                            <li key={index} className="list-disc list-inside">{line}</li>
                          ))}
                        </ul>
                        <div className="flex flex-col space-y-2 justify-between items-end mt-3 w-full">
                          <span className={`font-bold text-xs md:text-xl text-gray-800 whitespace-nowrap transition-all text-end duration-500 ease-out ${index == current ? 'opacity-100 translate-y-0 delay-450' : 'opacity-0 translate-y-2 delay-0'}`}>
                            ${product.price}
                          </span>
                          <Link
                            href={link}
                            className={`bg-[#2C4B7E] mb-[1px] text-white font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm hover:bg-blue-700 transition-all duration-500 ease-out hover:scale-105 whitespace-nowrap pointer-events-auto ${index == current ? 'opacity-100 translate-y-0 scale-100 delay-600' : 'opacity-0 translate-y-2 scale-95 delay-0'}`}
                          // onClick={(e) => {
                          //     e.stopPropagation();
                          //     if (!dragging && isActive) {
                          //         setOpenDialogIndex(index);
                          //     }
                          // }}
                          // tabIndex={isActive ? 0 : -1}
                          >
                            Add to cart +
                          </Link>
                        </div>

                      </div>
                    </div>
                  ) : (
                    <div className="sm:flex-1 flex items-center justify-center relative aspect-square sm:w-full w-0 sm:h-full h-0 border rounded-2xl overflow-hidden" >
                      <Image src={product.imageSrc} alt={product.title} fill className="object-cover" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Buttons */}
        <div className="flex justify-center items-center space-x-4 mt-1">
          <button
            onClick={handlePrev}
            className="rounded-full p-3 hover:scale-110 transition-transform duration-200"
            aria-label="Previous slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="67" viewBox="0 0 63 67" fill="none">
              <circle cx="31.5" cy="35.5" r="30.5" stroke="#2C4B7E" strokeWidth="2" />
              <path d="M15.2929 35.2929C14.9024 35.6834 14.9024 36.3166 15.2929 36.7071L21.6569 43.0711C22.0474 43.4616 22.6805 43.4616 23.0711 43.0711C23.4616 42.6805 23.4616 42.0474 23.0711 41.6569L17.4142 36L23.0711 30.3431C23.4616 29.9526 23.4616 29.3195 23.0711 28.9289C22.6805 28.5384 22.0474 28.5384 21.6569 28.9289L15.2929 35.2929ZM48 36L48 35L16 35L16 36L16 37L48 37L48 36Z" fill="#2C4B7E" />
            </svg>
          </button>

          {/* Active Indicator */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-[#2C4B7E]/20 shadow-lg">
            <span className="text-xs md:text-sm font-medium text-[#2C4B7E]">
              {current} / {products.length}
            </span>
            <div className="flex space-x-1.5">
              {products.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleDotClick(index)}
                  className={cn(
                    "transition-all duration-300 rounded-full",
                    index === current
                      ? "w-8 h-2 bg-[#2C4B7E] shadow-md"
                      : "w-2 h-2 bg-[#2C4B7E]/30 hover:bg-[#2C4B7E]/50"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            className="rounded-full p-3 hover:scale-110 transition-transform duration-200"
            aria-label="Next slide"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="67" viewBox="0 0 63 67" fill="none">
              <rect width="63" height="67" fill="white" />
              <circle cx="31.5" cy="35.5" r="30.5" fill="#2C4B7E" stroke="#2C4B7E" strokeWidth="2" />
              <path d="M48.7071 36.7071C49.0976 36.3166 49.0976 35.6834 48.7071 35.2929L42.3431 28.9289C41.9526 28.5384 41.3195 28.5384 40.9289 28.9289C40.5384 29.3195 40.5384 29.9526 40.9289 30.3431L46.5858 36L40.9289 41.6569C40.5384 42.0474 40.5384 42.6805 40.9289 43.0711C41.3195 43.4616 41.9526 43.4616 42.3431 43.0711L48.7071 36.7071ZM15 36V37H48V36V35H15V36Z" fill="white" />
            </svg>
          </button>
        </div>
      </Carousel>
    </div>
  );
}
