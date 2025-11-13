"use client"
import React, { useState } from "react";
import crepesMenu from "./data/crepesMenu";
import MenuCard from "./MenuCard";
import MenuItemCard from "./MenuItemCard";
import { categories, wafflesMenu, kunafaMenu, cupsMenu, cakesMenu, cafeMenu, shakesMenu, refreshersMenu } from "./MenuCategories";
interface CategoryScrollerProps {
  categories: string[];
  activeCategory: string;
  onCategoryClick: (category: string) => void;
}



const allCategories = [
  { title: "Crepes", products: crepesMenu },
  { title: "Waffles", products: wafflesMenu },
  { title: "Kunafa", products: kunafaMenu },
  { title: "Cups", products: cupsMenu },
  { title: "Cakes", products: cakesMenu },
  { title: "Cafe", products: cafeMenu },
  { title: "Shakes", products: shakesMenu },
  { title: "Refreshers / Mojitos", products: refreshersMenu },
];
const CategoryScroller = () => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const categoryRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [activeCategory, setActiveCategory] = useState<{
    title: string,
    products: {
      title: string;
      description: string;
      price: number;
      imageSrc: string;
      modifiers: {
        name: string;
        options: string[];
      }[];
    }[]
  }>(allCategories[0]);

  const handleCategoryClick = (category: typeof allCategories[0], index: number) => {
    setActiveCategory(category);

    // Scroll the clicked category into view (centered)
    const categoryElement = categoryRefs.current[index];
    const scrollContainer = scrollRef.current;

    if (categoryElement && scrollContainer) {
      const containerWidth = scrollContainer.offsetWidth;
      const elementWidth = categoryElement.offsetWidth;
      const elementOffsetLeft = categoryElement.offsetLeft;

      // Calculate scroll position to center the element
      const scrollPosition = elementOffsetLeft - (containerWidth / 2) + (elementWidth / 2);

      scrollContainer.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleCategoryClickButton = () => {
    // Find current category index
    const currentIndex = allCategories.findIndex(cat => cat.title === activeCategory.title);
    
    // Go to next category, or back to start if at the end
    const nextIndex = (currentIndex + 1) % allCategories.length;
    const nextCategory = allCategories[nextIndex];
    
    // Set active and scroll to center
    setActiveCategory(nextCategory);
    // Scroll the clicked category into view (centered)
    const categoryElement = categoryRefs.current[nextIndex];
    const scrollContainer = scrollRef.current;

    if (categoryElement && scrollContainer) {
      const containerWidth = scrollContainer.offsetWidth;
      const elementWidth = categoryElement.offsetWidth;
      const elementOffsetLeft = categoryElement.offsetLeft;

      // Calculate scroll position to center the element
      const scrollPosition = elementOffsetLeft - (containerWidth / 2) + (elementWidth / 2);

      scrollContainer.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
};
  return (
    <main className="flex flex-col items-center justify-center w-full h-full ">
      <div className="flex flex-row items-center justify-center w-full h-full relative">
        {/* Scrollable categories */}
        <div
          ref={scrollRef}
          className="flex flex-row gap-8 overflow-x-auto no-scrollbar w-full px-4"
          style={{ scrollBehavior: 'smooth' }}
          id="category-scroll-container"
        >
          {allCategories.map((category, idx) => (
            <div
              ref={(el) => { categoryRefs.current[idx] = el; }}
              onClick={() => handleCategoryClick(category, idx)}
              key={category.title}
              className="flex flex-col items-center justify-center min-w-max"
            >
              <p className={`text-xl md:text-2xl  text-black leading-tight hover:text-[#2C4B7E] hover:cursor-pointer font-semibold px-4 py-2 transition-colors duration-200 ${activeCategory.title === category.title ? 'text-[#2C4B7E] underline underline-offset-4' : ''}`}
                style={{
                  fontFamily: "var(--font-roboto)",
                }}
              >{category.title}</p>
            </div>
          ))}
        </div>
        {/* Scroll arrow button */}
        <div className="xl:hidden block">
          <button
            className="absolute right-0 -top-1/1 md:-top-[145%] -translate-y-1/2 "
            style={{ display: 'block' }}
            onClick={handleCategoryClickButton}
            aria-label="Scroll categories right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="50" height="60" viewBox="0 0 63 67" fill="none">
              <rect width="63" height="67" fill="white" />
              <circle cx="31.5" cy="35.5" r="30.5" fill="#2C4B7E" stroke="#2C4B7E" strokeWidth="2" />
              <path d="M48.7071 36.7071C49.0976 36.3166 49.0976 35.6834 48.7071 35.2929L42.3431 28.9289C41.9526 28.5384 41.3195 28.5384 40.9289 28.9289C40.5384 29.3195 40.5384 29.9526 40.9289 30.3431L46.5858 36L40.9289 41.6569C40.5384 42.0474 40.5384 42.6805 40.9289 43.0711C41.3195 43.4616 41.9526 43.4616 42.3431 43.0711L48.7071 36.7071ZM15 36V37H48V36V35H15V36Z" fill="white" />
            </svg>
          </button>
        </div>
      </div>

      <section className="grid xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 lg:gap-y-10 gap-y-5 lg:gap-x-0 gap-x-5 my-20 w-full h-full ">
        {activeCategory.products.map((product) => (
          <MenuItemCard key={product.title} imageSrc={product.imageSrc} title={product.title} description={product.description} price={product.price} modifiers={product.modifiers} />
        ))}
      </section>
    </main>
  );
};

export default CategoryScroller; 