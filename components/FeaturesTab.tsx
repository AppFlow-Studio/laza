"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const FeatureTabs: React.FC<{ features: any[] }> = ({ features }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  if (!features || features.length === 0) {
    return null;
  }

  const activeFeature = features[activeIndex];

  // Intersection Observer to detect when component is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.3 } // Trigger when 30% of component is visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Auto-advance timer - only starts when in view
  const startTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (isInView) {
      timerRef.current = setTimeout(() => {
        setActiveIndex((prevIndex) => (prevIndex + 1) % features.length);
      }, 8000);
    }
  };

  // Start timer when in view or when activeIndex changes
  useEffect(() => {
    if (isInView) {
      startTimer();
    } else {
      // Clear timer when out of view
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [activeIndex, features.length, isInView]);

  const handleNext = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % features.length);
  };

  const handleCardClick = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <section ref={sectionRef} className="py-16 sm:py-24">
      <div className="w-full overflow-x-auto mx-auto px-4">
        {/* Mobile Layout (below md breakpoint) */}
        <div className="lg:hidden">
          <div className="flex flex-col gap-6">
            {/* Active card for mobile */}
                      <AnimatePresence>
            <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="w-full rounded-2xl shadow-lg flex flex-col justify-between bg-[#672AB233] dark:bg-[#672AB233] overflow-hidden"
              >
                <div className="p-6 sm:p-8 h-full flex flex-col justify-between">
                  <div className="flex flex-1 flex-col gap-4">
                    {/* Text content */}
                    <div className="w-full flex flex-col">
                      <span className="text-xl font-bold text-gray-700 dark:text-gray-400">
                        {`0${activeIndex + 1}`}
                      </span>
                      <h3 className="text-base font-normal my-2 text-[#2C3551] dark:text-white">
                        {activeFeature.title}
                      </h3>
                      <div className="min-h-[120px]">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg">
                          {activeFeature.description}
                        </p>
                      </div>
                    </div>
                    {/* Image */}
                    <div className="h-auto">
                      <Image
                        src={activeFeature.imageSrc}
                        alt={activeFeature.title}
                        width={600}
                        height={400}
                        className="rounded-xl object-cover h-full w-full"
                      />
                    </div>
                  </div>
                  {/* Next button */}
                  <div className="mt-8">
                    <button
                      onClick={handleNext}
                      className="flex items-center justify-center gap-2 w-32 px-4 py-3 rounded-full bg-gradient-to-b from-[#662CB2] to-[#2C134C] text-white font-semibold shadow-md hover:bg-indigo-700 transition-all duration-300"
                    >
                      Next
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {/* Progress bar for mobile */}
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
                  <motion.div
                    key={`progress-mobile-${activeIndex}`}
                    className="h-full bg-gradient-to-r from-[#662CB2] to-[#2C134C] rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: isInView ? "100%" : "0%" }}
                    transition={{
                      duration: 7.8, // -0.2 to account for the initial delay
                      ease: "linear",
                    }}
                  />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Inactive cards row for mobile */}
            <div className="w-full flex flex-row gap-3 overflow-x-auto pb-4">
              {features.map((feature, index) => {
                if (index === activeIndex) return null;

                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleCardClick(index)}
                    className="
                      p-4 rounded-2xl transition-all duration-300
                      flex flex-col items-center justify-between
                      w-20 flex-shrink-0
                      bg-[#672AB233] hover:bg-[#E9E5F5]
                      dark:bg-[#672AB233] dark:hover:bg-[#382E5A]
                    "
                  >
                    <span className="font-bold text-gray-700 dark:text-gray-400">
                      {`0${index + 1}`}
                    </span>

                    <div className="h-full flex items-center justify-center">
                      <span
                        className="
                        font-semibold text-sm whitespace-nowrap
                        [writing-mode:vertical-rl] rotate-180
                        text-gray-800 dark:text-white
                      "
                      >
                        {feature.title}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Desktop Layout (md breakpoint and above) */}
        <div className="hidden lg:block">
          <div className="lg:flex lg:min-h-[450px] h-[450px] gap-6">
            {/* Render all cards */}
            {features.map((feature, index) => {
              const isActive = index === activeIndex;

              return (
                <motion.div
                  key={index}
                  layout
                  animate={{
                    width: isActive ? "100%" : "30%",
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier for smoother feel
                  }}
                  className={`
                    relative overflow-hidden rounded-2xl shadow-lg cursor-pointer
                   
                    ${isActive ? "lg:min-h-[450px]" : "h-1/2"}
                  `}
                  onClick={() => !isActive && handleCardClick(index)}
                >
                  <AnimatePresence>
                    {isActive ? (
                      // Active card content

                      <motion.div
                        key="active-content"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{
                          duration: 0.2,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        className="flex flex-col justify-between h-full"
                      >
                        <div className="h-full flex flex-col justify-between flex-1">
                          <div className="flex flex-1 flex-col lg:flex-row gap-2 lg:gap-4">
                            {/* Text content */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.7, duration: 0.4 }}
                              className="h-auto"
                            >
                              <Image
                                src={feature.imageSrc}
                                alt={feature.title}
                                width={600}
                                height={400}
                                className="rounded-xl object-cover h-full"
                              />
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6, duration: 0.4 }}
                              className="w-full min-w-1/3 flex flex-col"
                            >
                              <h3 className="text-base font-normal my-2 text-[#2C3551] dark:text-white">
                                {feature.title}
                              </h3>
                              <div className="min-h-[120px] lg:min-h-[100px]">
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-lg">
                                  {feature.description}
                                </p>
                              </div>
                              
                            </motion.div>
                            {/* Image */}
                          
                          </div>
                          {/* Next button */}
                          {/* <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            // transition={{ delay: 0, duration: 0.3 }}
                            className="mt-8"
                          >
                            <button
                              onClick={handleNext}
                              className="flex items-center justify-center gap-2 w-32 px-4 py-3 rounded-full bg-gradient-to-b from-[#662CB2] to-[#2C134C] text-white font-semibold shadow-md hover:bg-indigo-700 transition-all duration-300 hover:scale-105"
                            >
                              Next
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </motion.div> */}
                        </div>
                        {/* Progress bar for desktop */}
                        {/* <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          // transition={{ delay: 0, duration: 0.3 }}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4"
                        >
                          <motion.div
                            key={`progress-desktop-${activeIndex}`}
                            className="h-full bg-gradient-to-r from-[#662CB2] to-[#2C134C] rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: isInView ? "100%" : "0%" }}
                            transition={{
                              duration: 7.8, // -0.2 to account for the initial delay
                              ease: "linear",
                            }}
                          />
                        </motion.div> */}
                      </motion.div>
                    ) : (
                      // Inactive card content
                      <motion.div
                        key="inactive-content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.2,
                        }}
                        className="h-full flex w-full aspect-square flex-col items-center justify-between transition-colors duration-300"
                      >
                        <div className="w-full h-full relative">
                          <Image src={feature.imageSrc} alt={feature.title} fill className="object-cover object-center" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureTabs;