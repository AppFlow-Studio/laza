"use client"
import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";

const link = `https://order.toasttab.com/online/locations/e4e3218e-7ad2-411f-a156-ec157a00652f/default`
export default function Carousel({ items }) {
  const [active, setActive] = useState(0);
  const containerRef = useRef(null);

  // Dimensions (px)
  const SQUARE = 180;          // inactive: 180×180
  const ACTIVE_IMG = 320;      // active image: 320×320
  const INFO_WIDTH = 240;      // active panel width

  // center the active slide
  useEffect(() => {
    const slide = containerRef.current.children[active];
    slide.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [active]);

  const prev = () => setActive(i => (i - 1 + items.length) % items.length);
  const next = () => setActive(i => (i + 1) % items.length);

  return (
    <div className="flex items-center px-8 w-full">
      {/* ← */}
      <button
        onClick={prev}
        className="p-2 rounded-full bg-white shadow hover:bg-gray-100"
      >
        <ArrowLeftIcon className="h-6 w-6 text-blue-600" />
      </button>

      {/* slides */}
      <div
        ref={containerRef}
        className="flex gap-x-6 overflow-x-auto snap-x snap-mandatory scroll-smooth px-6"
        style={{ scrollPadding: "0 50%" }}
      >
        {items.map((item, idx) => {
          const isActive = idx === active;
          return (
            <motion.div
              key={item.id}
              className="snap-center flex-shrink-0"
              layout
              initial={false}
              animate={{
                width: isActive
                  ? ACTIVE_IMG + INFO_WIDTH
                  : SQUARE,
                height: isActive
                  ? ACTIVE_IMG
                  : SQUARE,
                opacity: isActive ? 1 : 0.6,
              }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
            >
              <div className="flex h-full w-full rounded-2xl overflow-hidden shadow-lg bg-white">
                {/* LEFT: always a square image */}
                <div
                  className="overflow-hidden"
                  style={{
                    width: isActive ? ACTIVE_IMG : SQUARE,
                    height: isActive ? ACTIVE_IMG : SQUARE,
                  }}
                >
                  <img
                    src={item.imageSrc}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* RIGHT: info panel when active */}
                {isActive && (
                  <motion.div
                    className="flex-1 p-6 flex flex-col justify-between"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div>
                      <h3 className="text-2xl font-bold">
                        {item.title}
                      </h3>
                      <p className="text-gray-700 mt-2 leading-snug">
                        {item.description}
                      </p>
                    </div>
                    <Link href={link} className="mt-4 text-blue-600 font-medium">
                      Add to cart +
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* → */}
      <button
        onClick={next}
        className="p-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700"
      >
        <ArrowRightIcon className="h-6 w-6" />
      </button>
    </div>
  );
}
