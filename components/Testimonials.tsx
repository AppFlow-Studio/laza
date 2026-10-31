'use client'
import { useState, useEffect, useRef } from "react";
import Google from "./icons/google";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

// Google Reviews Data - 5-star reviews only
// Filter for 5-star reviews only
// Google Review interface type for type safety and clarity

export interface GoogleReview {
  name: string; // review resource name
  relativePublishTimeDescription: string; // e.g. "a month ago"
  rating: number; // 1-5
  text: {
    text: string;
    languageCode: string;
  };
  originalText?: {
    text: string;
    languageCode: string;
  };
  authorAttribution: {
    displayName: string;
    uri: string;
    photoUri?: string;
  };
  publishTime: string; // ISO string
  flagContentUri?: string;
  googleMapsUri?: string;
}

function StarRow({ count = 5 }) {
  return (
    <div className="flex flex-row gap-1 mb-2">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} width="20" height="20" fill="#FFD700" viewBox="0 0 20 20"><polygon points="10,1 12.59,7.36 19.51,7.64 14,12.14 15.82,18.99 10,15.27 4.18,18.99 6,12.14 0.49,7.64 7.41,7.36" /></svg>
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial, index }: { testimonial: GoogleReview; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        duration: 0.3,
        ease: "easeOut"
      }}
      className="rounded-xl shadow p-6 xl:w-90 xl:h-70 w-80 h-70 flex flex-col border border-gray-200"
      style={{
        background: 'rgba(241, 241, 241, 0.10)',
        boxShadow: ' 0px -2px 6px 0px rgba(0, 0, 0, 0.25) inset',
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        {testimonial.authorAttribution.photoUri ? (
          <div>
            <Image
              src={testimonial.authorAttribution.photoUri}
              alt={testimonial.name}
              className="w-10 h-10 rounded-full border border-gray-300 object-cover"
              width={40}
              height={40}
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-[#2C4B7E] border border-gray-300">
            {testimonial.authorAttribution.displayName.charAt(0)}
          </div>
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#2C4B7E]">{testimonial.authorAttribution.displayName}</span>
            <div>
              <Google />
            </div>
          </div>
          <span className="text-xs text-gray-500">{testimonial.relativePublishTimeDescription}</span>
        </div>
      </div>

      <div>
        <StarRow count={testimonial.rating} />
      </div>

      <p className="text-black text-sm leading-relaxed mt-1 overflow-y-auto flex-1">
        {testimonial.text.text.length > 200
          ? `${testimonial.text.text.substring(0, 200)}...`
          : testimonial.text.text
        }
      </p>
    </motion.div>
  );
}

export default function TestimonialsCarousel({ reviews }: { reviews: GoogleReview[] }) {
  if (reviews.length === 0) return null
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(true);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right, 0 for initial

  // Responsive visible count
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1280) {
        setVisible(3);
      } else if (window.innerWidth >= 768) {
        setVisible(2);
      } else {
        setVisible(1);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Arrow navigation
  function goPrev() {
    if (canPrev) {
      setDirection(-1);
      setIndex(Math.max(0, index - visible)); // Move by visible count
      pauseAutoAdvance();
      resumeAutoAdvance();
    }
  }
  function goNext() {
    if (canNext) {
      setDirection(1);
      setIndex(Math.min(maxIndex, index + visible)); // Move by visible count
      pauseAutoAdvance();
      resumeAutoAdvance();
    }
  }

  // Pagination dots
  const pageCount = Math.ceil(reviews.length / visible); // Calculate pages based on visible count

  const handleDotClick = (dotIndex: number) => {
    setDirection(dotIndex > Math.floor(index / visible) ? 1 : -1);
    setIndex(dotIndex * visible); // Move to the correct starting index
    pauseAutoAdvance();
    resumeAutoAdvance();
  };

  // Auto-advance timer
  useEffect(() => {
    if (!isAutoAdvancing) return;

    const startAutoAdvance = () => {
      autoAdvanceRef.current = setInterval(() => {
        setDirection(1); // Right direction for auto-advance
        setIndex((currentIndex) => {
          const maxIndex = reviews.length - visible;
          if (currentIndex >= maxIndex) {
            return 0; // Loop back to first
          }
          return currentIndex + visible; // Move by visible count
        });
      }, 3000); // 10 seconds
    };

    startAutoAdvance();

    return () => {
      if (autoAdvanceRef.current) {
        clearInterval(autoAdvanceRef.current);
      }
    };
  }, [reviews.length, visible, isAutoAdvancing]);

  // Pause auto-advance on user interaction
  const pauseAutoAdvance = () => {
    setIsAutoAdvancing(false);
    if (autoAdvanceRef.current) {
      clearInterval(autoAdvanceRef.current);
    }
  };

  // Resume auto-advance after 5 seconds of no interaction
  const resumeAutoAdvance = () => {
    setTimeout(() => {
      setIsAutoAdvancing(true);
    }, 3000);
  };

  const maxIndex = reviews.length - visible;
  const canPrev = index > 0;
  const canNext = index < maxIndex;

  // Touch/swipe handlers
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    pauseAutoAdvance();
  }
  function onTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.touches[0].clientX;
  }
  function onTouchEnd() {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const diff = touchStartX.current - touchEndX.current;
      if (diff > 50 && canNext) {
        setDirection(1);
        setIndex(Math.min(maxIndex, index + visible)); // Move by visible count
      } else if (diff < -50 && canPrev) {
        setDirection(-1);
        setIndex(Math.max(0, index - visible)); // Move by visible count
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
    resumeAutoAdvance();
  }

  return (
    <div className="w-full flex flex-col items-center relative">
      <motion.div
        className="flex flex-row gap-8 justify-center items-stretch w-full xl:px-0 px-4 relative"
        ref={containerRef}
        key={index} // Force re-render for smooth transitions
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence>
          {reviews.slice(index, index + visible).map((t, i) => (
            <TestimonialCard
              testimonial={t}
              key={`${index}-${i}`}
              index={i}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Progress Bar */}
      {/* <motion.div
        className="w-full max-w-md mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="bg-gray-200 rounded-full h-1 overflow-hidden">
          <motion.div
            className="bg-[#2C4B7E] h-1 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${((index + 1) / pageCount) * 100}%`
            }}
            transition={{
              duration: isAutoAdvancing ? 10 : 0.6,
              ease: isAutoAdvancing ? "linear" : "easeOut"
            }}
          />
        </div>
      </motion.div> */}

      {/* Dots */}
      <motion.div
        className="flex flex-row gap-2 mt-8 items-center justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        {Array.from({ length: pageCount }).map((_, i) => (
          i === Math.floor(index / visible) ? (
            <motion.button
              key={i}
              className="relative w-4 h-4 flex items-center justify-center rounded-full transition-all duration-300"
              aria-label={`Go to testimonials page ${i + 1}`}
              onClick={() => handleDotClick(i)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.span
                className="absolute inset-0 border-1 border-[#2C4B7E] rounded-full bg-white"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="absolute inset-1 rounded-full bg-white"></span>
              <span className="absolute inset-2 w-3 h-3 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-full bg-[#2C4B7E]"></span>
            </motion.button>
          ) : (
            <motion.button
              key={i}
              className="w-4 h-4 rounded-full bg-[#2C4B7E] hover:bg-[#1B3A6B] transition-all duration-300"
              aria-label={`Go to testimonials page ${i + 1}`}
              onClick={() => handleDotClick(i)}
              whileHover={{ scale: 1.2, backgroundColor: "#1B3A6B" }}
              whileTap={{ scale: 0.9 }}
            />
          )
        ))}
      </motion.div>

      {/* Auto-advance indicator */}
      {/* <div className="mt-4 text-xs text-[#2C4B7E]/70 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isAutoAdvancing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        <span>{isAutoAdvancing ? 'Auto-advancing' : 'Paused'}</span>
      </div> */}
    </div>
  );
}

