'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react';
import MenuItemDialog from './MenuItemDialog';
import Link from 'next/link';


// Main App Component
export default function GeminiCenter2Carousel({ products }: { products: any[] }) {
    const [activeIndex, setActiveIndex] = useState(Math.floor(products.length / 2));
    const carouselRef = useRef<HTMLDivElement | null>(null); // Ref for the sliding container
    const viewportRef = useRef<HTMLDivElement | null>(null); // Ref for the visible area
    const [offset, setOffset] = useState(0); // State for the CSS transform offset
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const SWIPE_THRESHOLD = 50;

    // Add at the top, after other useState hooks
    const [openDialogIndex, setOpenDialogIndex] = useState<number | null>(null);
    const [dragging, setDragging] = useState(false);

    // Memoize navigation functions
    const handleNext = useCallback(() => {
        setActiveIndex((prevIndex) => (prevIndex + 1) % products.length);
    }, []);

    const handlePrev = useCallback(() => {
        setActiveIndex((prevIndex) => (prevIndex - 1 + products.length) % products.length);
    }, []);

    // Effect to calculate and set the transform offset for centering.
    // REFINED: Effect to calculate and set the transform offset.
    useEffect(() => {
        const calculateOffset = () => {
            if (carouselRef.current && viewportRef.current) {
                const viewport = viewportRef.current;
                const activeItem = carouselRef.current.children[activeIndex] as HTMLElement;

                if (activeItem) {
                    const viewportCenter = viewport.offsetWidth / 2;
                    const itemCenter = activeItem.offsetLeft + activeItem.offsetWidth / 2;
                    setOffset(viewportCenter - itemCenter);
                }
            }
        };

        // This short delay allows the CSS scaling transition to begin,
        // ensuring we calculate the offset based on the item's new, larger size.
        // 150ms is often enough time for the render to kick in.
        const timer = setTimeout(calculateOffset, 150);
        window.addEventListener('resize', calculateOffset);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateOffset);
        };
    }, [activeIndex, products.length]); // Added products.length as a dependency

    // Effect for keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            setIsPaused(true);
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePrev, handleNext]);

    // Effect for auto-play loop
    useEffect(() => {
        if (!isPaused) {
            const interval = setInterval(() => handleNext(), 3000);
            return () => clearInterval(interval);
        }
    }, [isPaused, handleNext]);

    // --- Mouse Swipe Handlers ---
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsPaused(true);
        setDragStart(e.clientX);
        setDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (dragStart !== null) {
            const x = e.clientX;
            if (Math.abs(x - dragStart) > 10) {
                setDragging(true);
            }
        }
    };
    const link = `https://order.toasttab.com/online/locations/e4e3218e-7ad2-411f-a156-ec157a00652f/default`

    const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
        if (dragStart === null) return;
        const dragEnd = e.clientX;
        const dragDistance = dragStart - dragEnd;

        if (Math.abs(dragDistance) > SWIPE_THRESHOLD) {
            if (dragDistance > 0) handleNext();
            else handlePrev();
        } else {
            const clickedItem = (e.target as HTMLElement).closest('[data-index]');
            if (clickedItem) {
                setActiveIndex(parseInt((clickedItem as HTMLElement).dataset.index || '0', 10));
            }
        }
        setDragStart(null);
        setDragging(false);
    };

    const handleMouseLeave = () => {
        setDragStart(null);
        setIsPaused(false);
    };
    // MOBILE: Handlers for touch-based swiping
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        setIsPaused(true);
        // Get the first touch point's X coordinate
        setTouchStart(e.touches[0].clientX);
        setDragging(false);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (touchStart !== null) {
            if (Math.abs(e.touches[0].clientX - touchStart) > 10) {
                setDragging(true);
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (touchStart === null) return;

        // Get the final touch point's X coordinate
        const touchEnd = e.changedTouches[0].clientX;
        const touchDistance = touchStart - touchEnd;

        if (Math.abs(touchDistance) > SWIPE_THRESHOLD) {
            if (touchDistance > 0) handleNext();
            else handlePrev();
        } else {
            // Handle tap event if it wasn't a swipe
            const tappedItem = (e.target as HTMLElement).closest('[data-index]');
            if (tappedItem) {
                const tappedIndex = parseInt((tappedItem as HTMLElement).dataset.index || '0', 10);
                if (tappedIndex !== activeIndex) {
                    setActiveIndex(tappedIndex);
                }
            }
        }
        setTouchStart(null);
        setTimeout(() => setIsPaused(false), 2000);
    };

    return (
        <div className="flex flex-col items-center justify-start overflow-hidden h-full">
            <div
                className="w-full max-w-8xl relative h-fit  select-none [mask-composite:intersect] sm:[mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem)]"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={handleMouseLeave}
            >
                {/* Viewport container - this creates the visible window */}
                <div ref={viewportRef}
                    className="overflow-hidden cursor-grab active:cursor-grabbing h-80 sm:h-96 flex items-center"
                    style={{ touchAction: 'pan-y' }} // MOBILE: Critical for smooth swiping
                // ... all other event handlers
                >
                    {/* Carousel container - this is the element that moves */}
                    <div
                        ref={carouselRef}
                        className="flex items-center justify-start space-x-8 md:space-x-12 px-4 transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                        style={{ transform: `translateX(${offset}px)`, willChange: 'transform' }}
                    >
                        {products.map((product, index) => {
                            const isActive = index === activeIndex;
                            return (
                                <div
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    key={`${product.id || product.title}-${index}`}
                                    data-index={index}
                                    className={`flex-shrink-0 sm:w-auto w-screen flex items-center justify-center transition-all duration-700 select-none ${isActive ? 'opacity-100 scale-100' : 'opacity-75 scale-95'}`}
                                >
                                    {/* The actual card element with layout and content */}
                                    <div
                                        className={`flex items-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] rounded-2xl overflow-hidden pointer-events-none select-none ${isActive ? 'p-6' : 'bg-transparent'}`}
                                    >
                                        <img
                                            src={product.imageSrc}
                                            alt={product.title}
                                            draggable={false}
                                            className={`object-cover rounded-xl transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex-shrink-0 ${isActive ? 'w-40 h-40 md:w-54 md:h-54' : 'w-24 h-24 md:w-32 md:h-32'}`}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = 'https://placehold.co/400x400/CCCCCC/FFFFFF?text=Image+Not+Found';
                                            }}
                                        />
                                        {/* Details section - animates width and opacity */}
                                        <div className={`transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex-1 ml-4 md:ml-6 flex flex-col justify-center text-left overflow-hidden ${isActive ? 'max-w-sm opacity-100 translate-x-0' : 'max-w-0 opacity-0 translate-x-4'}`}>
                                            <h3
                                                className={`text-xl md:text-3xl font-bold text-gray-800 transition-all w-full duration-500 ease-out ${isActive
                                                    ? 'opacity-100 translate-y-0 delay-150'
                                                    : 'opacity-0 translate-y-2 delay-0'
                                                    } ${product.title.length > 15
                                                        ? 'whitespace-normal'
                                                        : 'whitespace-nowrap'
                                                    }`}
                                            >
                                                {product.title}
                                            </h3>
                                            <p className={`text-xs md:text-base mt-3 text-gray-600 overflow-hidden transition-all duration-500 flex-wrap-reverse ease-out ${isActive ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 translate-y-2 delay-0'}`}>
                                                {product.description.length > 100 ? product.description.slice(0, 100) + '...' : product.description}
                                            </p>
                                            <div className="flex flex-col space-y-2 justify-between items-start mt-3">
                                                <span className={`font-bold text-xs md:text-xl text-gray-800 whitespace-nowrap transition-all duration-500 ease-out ${isActive ? 'opacity-100 translate-y-0 delay-450' : 'opacity-0 translate-y-2 delay-0'}`}>
                                                    ${product.price}
                                                </span>
                                                <Link
                                                    href={link}
                                                    className={`bg-[#2C4B7E] mb-[1px] text-white font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm hover:bg-blue-700 transition-all duration-500 ease-out hover:scale-105 whitespace-nowrap pointer-events-auto ${isActive ? 'opacity-100 translate-y-0 scale-100 delay-600' : 'opacity-0 translate-y-2 scale-95 delay-0'}`}
                                                    // onClick={(e) => {
                                                    //     e.stopPropagation();
                                                    //     if (!dragging && isActive) {
                                                    //         setOpenDialogIndex(index);
                                                    //     }
                                                    // }}
                                                    tabIndex={isActive ? 0 : -1}
                                                >
                                                    Add to cart +
                                                </Link>
                                                {/* <MenuItemDialog
                                                    imageSrc={product.imageSrc}
                                                    title={product.title}
                                                    description={product.description}
                                                    price={product.price}
                                                    modifiers={product.modifiers}
                                                    externalOpen={openDialogIndex === index}
                                                    setExternalOpen={(open) => setOpenDialogIndex(open ? index : null)}
                                                >
                                                    <button
                                                        className="bg-blue-600  text-white font-semibold px-4 py-2 md:px-5 md:py-2.5 rounded-full text-sm md:text-base hover:bg-blue-700 transition-colors whitespace-nowrap pointer-events-auto"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!dragging && isActive) {
                                                                setOpenDialogIndex(index);
                                                            }
                                                        }}
                                                        tabIndex={isActive ? 0 : -1}
                                                        disabled={!isActive}
                                                    >
                                                        Add to cart +
                                                    </button>
                                                </MenuItemDialog> */}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-center space-x-4 ">
                    <button
                        onClick={handlePrev}
                        className=" rounded-full p-3"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="67" viewBox="0 0 63 67" fill="none">
                            <circle cx="31.5" cy="35.5" r="30.5" stroke="#2C4B7E" strokeWidth="2" />
                            <path d="M15.2929 35.2929C14.9024 35.6834 14.9024 36.3166 15.2929 36.7071L21.6569 43.0711C22.0474 43.4616 22.6805 43.4616 23.0711 43.0711C23.4616 42.6805 23.4616 42.0474 23.0711 41.6569L17.4142 36L23.0711 30.3431C23.4616 29.9526 23.4616 29.3195 23.0711 28.9289C22.6805 28.5384 22.0474 28.5384 21.6569 28.9289L15.2929 35.2929ZM48 36L48 35L16 35L16 36L16 37L48 37L48 36Z" fill="#2C4B7E" />
                        </svg>
                    </button>
                    <button
                        onClick={handleNext}
                        className=" rounded-full p-3"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="67" viewBox="0 0 63 67" fill="none">
                            <rect width="63" height="67" fill="white" />
                            <circle cx="31.5" cy="35.5" r="30.5" fill="#2C4B7E" stroke="#2C4B7E" strokeWidth="2" />
                            <path d="M48.7071 36.7071C49.0976 36.3166 49.0976 35.6834 48.7071 35.2929L42.3431 28.9289C41.9526 28.5384 41.3195 28.5384 40.9289 28.9289C40.5384 29.3195 40.5384 29.9526 40.9289 30.3431L46.5858 36L40.9289 41.6569C40.5384 42.0474 40.5384 42.6805 40.9289 43.0711C41.3195 43.4616 41.9526 43.4616 42.3431 43.0711L48.7071 36.7071ZM15 36V37H48V36V35H15V36Z" fill="white" />
                        </svg>
                    </button>
                </div>
            </div>
            <style jsx global>{`
        .cursor-grab {
          cursor: grab;
        }
        .cursor-grab:active {
          cursor: grabbing;
        }
        .select-none {
          user-select: none;
          -webkit-user-select: none;
          -ms-user-select: none;
          -moz-user-select: none;
        }
      `}</style>
        </div>
    );
}
