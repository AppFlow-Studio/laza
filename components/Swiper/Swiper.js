"use client"
import React, { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import crepesMenu from "@/components/data/crepesMenu";
import Image from "next/image";
import './style.css'

const SwiperComponent = () => {
  const SwipperWrappedRef = useRef(null);
  const AdjustMargin = () => {
    const screenWidth = window.innerWidth;
    if (SwipperWrappedRef.current) {
      SwipperWrappedRef.current.style.marginLeft = screenWidth <= 520 ? '0px' : screenWidth <= 650 ? '-50px' : screenWidth <= 800 ? '-100px' : '-50px';
    }
  }

  useEffect(() => {
    AdjustMargin();
    window.addEventListener('resize', AdjustMargin);
    return () => {
      window.removeEventListener('resize', AdjustMargin);
    }
  }, []);

  return (
    <section className="w-full max-w-8xl h-full flex flex-col items-center justify-center self-center">
      <Swiper
        spaceBetween={50}
        slidesPerView="auto"
        initialSlide={2}
        speed={1000}
        centeredSlides={true}
        slideToClickedSlide={true}
        observeParents={true}
        onSlideChange={(swiper) => {
          swiper.update();
          swiper.updateSlides();
        }}
        onSwiper={(swiper) => {
          SwipperWrappedRef.current = swiper.wrapperEl;
        }}
        modules={[Pagination]}
        breakpoints={{
          320 : {
            spaceBetween : 40,
          },
          650: {
            spaceBetween : 30,
          },
          100: {
            spaceBetween : 20,
          }
        }}
        className="w-full h-full [mask-composite:intersect] flex items-center justify-center sm:[mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem)]"
      >
        {
          crepesMenu.map((item, index) => (
            <SwiperSlide key={index} className=" items-center flex justify-center "
              style={{}}
            >
              {({ isActive }) => (
                <div
                  className={`flex flex-row items-center mx-auto gap-x-8 h-full justify-between`}
                >
                  <div className={`rounded-2xl overflow-hidden relative ${isActive ? 'aspect-square w-full ' : 'aspect-square w-full mt-40'}`}>
                    <Image src={item.imageSrc} alt={item.title} fill className=" object-cover block aspect-square" />
                  </div>
                  <div className={`${isActive ? 'block w-fit' : 'hidden'} flex flex-col justify-between h-[80%] py-12 gap-y-2`}>
                    <div>
                      <p className="font-bold text-2xl mb-4">{item.title}</p>
                      <p className="text-lg">{item.description}</p>
                    </div>
                    <div className="flex flex-row items-center justify-between">
                      <p className="text-xl text-[#2C4B7E] font-bold">Add to Cart +</p>
                    </div>
                  </div>
                </div>
              )}
            </SwiperSlide>
          ))
        }
      </Swiper>
      <div className="flex flex-row items-center justify-center gap-x-4 w-full ">
        <svg xmlns="http://www.w3.org/2000/svg" width="63" height="67" viewBox="0 0 63 67" fill="none">
          <circle cx="31.5" cy="35.5" r="30.5" stroke="#2C4B7E" strokeWidth="2"/>
          <path d="M15.2929 35.2929C14.9024 35.6834 14.9024 36.3166 15.2929 36.7071L21.6569 43.0711C22.0474 43.4616 22.6805 43.4616 23.0711 43.0711C23.4616 42.6805 23.4616 42.0474 23.0711 41.6569L17.4142 36L23.0711 30.3431C23.4616 29.9526 23.4616 29.3195 23.0711 28.9289C22.6805 28.5384 22.0474 28.5384 21.6569 28.9289L15.2929 35.2929ZM48 36L48 35L16 35L16 36L16 37L48 37L48 36Z" fill="#2C4B7E"/>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" width="63" height="67" viewBox="0 0 63 67" fill="none">
          <rect width="63" height="67" fill="white"/>
          <circle cx="31.5" cy="35.5" r="30.5" fill="#2C4B7E" stroke="#2C4B7E" strokeWidth="2"/>
          <path d="M48.7071 36.7071C49.0976 36.3166 49.0976 35.6834 48.7071 35.2929L42.3431 28.9289C41.9526 28.5384 41.3195 28.5384 40.9289 28.9289C40.5384 29.3195 40.5384 29.9526 40.9289 30.3431L46.5858 36L40.9289 41.6569C40.5384 42.0474 40.5384 42.6805 40.9289 43.0711C41.3195 43.4616 41.9526 43.4616 42.3431 43.0711L48.7071 36.7071ZM15 36V37H48V36V35H15V36Z" fill="white"/>
        </svg>
      </div>
    </section>
  );
}

export default SwiperComponent;