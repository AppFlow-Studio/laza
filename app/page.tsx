import EmblaCarousel from "@/components/carousel/emblacarousel";
import DessertMenu from "@/components/DessertMenu";
import FadeIn from "@/components/FadeIn";
import OrderNowButton from "@/components/OrderNowButton";
import Image from "next/image";
import { EmblaOptionsType } from 'embla-carousel'
import desserts from "@/components/carousel/dessertData";
import Reveal from "@/components/Reveal";
import Toppings from "@/components/icons/Toppings";
import { products } from "@/components/data/products";
import MenuCard from "@/components/MenuCard";
import { Button } from "@/components/ui/button";
import React from "react";
import TestimonialsCarousel from "@/components/Testimonials";
import FeatureTabs from "@/components/FeaturesTab";
import { getRandomMenuItems } from "@/components/data/mixedMenu";
import SwiperComponent from "@/components/Swiper/Swiper";
import CategoryScroller from "@/components/CategoryScroller";
import Carousel from "@/components/ChatCarousel";
import GeminiCarousel from "@/components/GeminiCarousel";
import GeminiCarouselSlide from "@/components/GeminiCarouselSlide";
import GeminiCenterCarousel from "@/components/GeminiCenterCarousel";
import GeminiCenter2Carousel from "@/components/GeminiCenter2Carousel";
import { locations } from "@/lib/locations";
import Link from "next/link";
import getPlaceReviews from "./actions/get-google-reviews";
import HeroVideo from "@/components/HeroVideo";
import SlideScale from "@/components/customized/carousel/carousel-11";

// Get the base URL for metadata (works both locally and in production)
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  return 'https://lazadessert.cafe';
};

const baseUrl = getBaseUrl();

const OPTIONS: EmblaOptionsType = { loop: true, watchResize: false, align: 'center', containScroll: 'trimSnaps' }
const SLIDE_COUNT = 7
const SLIDES = Array.from(Array(SLIDE_COUNT).keys())

const categories = [
  "Kunafa",
  "Crepes",
  "Waffles",
  "Lukmate",
  "Churro Bites Online",
  "Mini Puff",
  "Dip Sticks",
  // "Cakes",
  // "Cups",
]

// const featureItem = [
//   {
//     title: "Payment Processing & Management",
//     description:
//       "Efficiently manage transactions, track payments, and streamline your financial workflows with our secure payment processing solutions.",
//     imageSrc: "/features/feature-1-payment.png",
//   },
//   {
//     title: "100% Transparent Costs",
//     description:
//       "Enjoy clear, upfront pricing with no hidden fees. We believe in honesty and building trust through transparent cost structures.",
//     imageSrc: "/features/feature-1-payment.png",
//   },
//   {
//     title: "Technical Support",
//     description:
//       "Our expert technical support team is available around the clock to assist you with any issues or questions you may have.",
//     imageSrc: "/features/feature-1-payment.png",
//   },
//   {
//     title: "Right Equipment & Software",
//     description:
//       "Get access to the latest, most secure POS terminals and software tailored to your specific business needs.",
//     imageSrc: "/features/feature-1-payment.png",
//   },
//   {
//     title: "Full Data Security & Compliance",
//     description:
//       "Rest easy knowing your data is protected with top-tier security measures and full PCI compliance, safeguarding you and your customers.",
//     imageSrc: "/features/feature-1-payment.png",
//   },
//   {
//     title: "User Friendly & reliable Options",
//     description:
//       "Choose from a range of reliable, easy-to-use payment options that provide a seamless experience for your customers.",
//     imageSrc: "/features/feature-1-payment.png",
//   },
// ];

export default async function Home() {
  const reviews = await getPlaceReviews()
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Laza Dessert Cafe",
            "alternateName": ["Chocolate Factory", "The Chocolate Factory", "Laza by Chocolate Factory"],
            "description": "Premium Middle Eastern desserts including kunafa, crepes, waffles, shakes, and more. Open daily 2:00 PM - 2:00 AM.",
            "url": baseUrl,
            "logo": `${baseUrl}/lazabluelogo.png`,
            "image": `${baseUrl}/default_og.png`,
            "telephone": ["+1 347 560 6080", "+1 347 507 1087"],
            "address": [
              {
                "@type": "PostalAddress",
                "streetAddress": "6740 5th Ave",
                "addressLocality": "Brooklyn",
                "addressRegion": "NY",
                "postalCode": "11220",
                "addressCountry": "US"
              },
              {
                "@type": "PostalAddress",
                "streetAddress": "25-33 Steinway St",
                "addressLocality": "Queens",
                "addressRegion": "NY",
                "postalCode": "11103",
                "addressCountry": "US"
              }
            ],
            "openingHours": "Mo-Su 14:00-02:00",
            "priceRange": "$$",
            "servesCuisine": ["Middle Eastern", "Desserts", "Coffee", "Shakes"],
            "hasMenu": `${baseUrl}/menu`,
            "sameAs": [
              "https://www.instagram.com/laza.cafe",
              "https://www.tiktok.com/@lazacafe"
            ],
            /* Location section commented out until /brooklyn and /queens pages exist
            "department": [
              {
                "@type": "Restaurant",
                "name": "Laza Dessert Cafe Brooklyn",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "6740 5th Ave",
                  "addressLocality": "Brooklyn",
                  "addressRegion": "NY",
                  "postalCode": "11220",
                  "addressCountry": "US"
                },
                "telephone": "+1 347 560 6080",
                "openingHours": "Mo-Su 14:00-02:00"
              },
              {
                "@type": "Restaurant",
                "name": "Laza Dessert Cafe Queens",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "25-33 Steinway St",
                  "addressLocality": "Queens",
                  "addressRegion": "NY",
                  "postalCode": "11103",
                  "addressCountry": "US"
                },
                "telephone": "+1 347 507 1087",
                "openingHours": "Mo-Su 14:00-02:00"
              }
            ]
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": "Laza Dessert Cafe Brooklyn",
            "alternateName": ["Chocolate Factory", "The Chocolate Factory", "Laza by Chocolate Factory"],
            "description": "Premium Middle Eastern desserts in Bay Ridge, Brooklyn. Fresh kunafa, crepes, waffles, and shakes. Open daily 2:00 PM - 2:00 AM.",
            "url": `${baseUrl}/brooklyn`,
            "logo": `${baseUrl}/lazabluelogo.png`,
            "image": `${baseUrl}/default_og.png`,
            "telephone": "+1 347 560 6080",
            "email": "brooklyn@lazadessert.cafe",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "6740 5th Ave",
              "addressLocality": "Brooklyn",
              "addressRegion": "NY",
              "postalCode": "11220",
              "addressCountry": "US"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 40.6347,
              "longitude": -74.0167
            },
            "openingHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                "opens": "14:00",
                "closes": "02:00"
              }
            ],
            "priceRange": "$$",
            "servesCuisine": ["Middle Eastern", "Desserts", "Coffee", "Shakes", "Beverages"],
            "hasMenu": `${baseUrl}/menu`,
            "menu": `${baseUrl}/menu`,
            "acceptsReservations": false,
            "deliveryAvailable": true,
            "takeoutAvailable": true,
            "dineInAvailable": true,
            "wheelchairAccessible": true,
            "parkingAvailable": true,
            "parkingType": "Street Parking",
            "areaServed": [
              {
                "@type": "City",
                "name": "Bay Ridge",
                "sameAs": "https://en.wikipedia.org/wiki/Bay_Ridge,_Brooklyn"
              },
              {
                "@type": "City",
                "name": "Brooklyn",
                "sameAs": "https://en.wikipedia.org/wiki/Brooklyn"
              },
              {
                "@type": "City",
                "name": "New York City",
                "sameAs": "https://en.wikipedia.org/wiki/New_York_City"
              }
            ],
            "amenityFeature": [
              {
                "@type": "LocationFeatureSpecification",
                "name": "Free WiFi",
                "value": true
              },
              {
                "@type": "LocationFeatureSpecification",
                "name": "Street Parking",
                "value": true
              },
              {
                "@type": "LocationFeatureSpecification",
                "name": "Late Night Hours",
                "value": true
              }
            ],
            "paymentAccepted": ["Cash", "Credit Card", "Debit Card", "Digital Wallet"],
            "currenciesAccepted": "USD",
            "sameAs": [
              "https://www.instagram.com/laza.cafe",
              "https://www.tiktok.com/@lazacafe"
            ]
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": "Laza Dessert Cafe Queens",
            "alternateName": ["Chocolate Factory", "The Chocolate Factory", "Laza by Chocolate Factory"],
            "description": "Premium Middle Eastern desserts in Astoria, Queens. Fresh kunafa, crepes, waffles, and shakes. Open daily 2:00 PM - 2:00 AM.",
            "url": `${baseUrl}/queens`,
            "logo": `${baseUrl}/lazabluelogo.png`,
            "image": `${baseUrl}/default_og.png`,
            "telephone": "+1 347 507 1087",
            "email": "queens@lazadessert.cafe",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "25-33 Steinway St",
              "addressLocality": "Queens",
              "addressRegion": "NY",
              "postalCode": "11103",
              "addressCountry": "US"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 40.7648,
              "longitude": -73.9208
            },
            "openingHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                "opens": "14:00",
                "closes": "02:00"
              }
            ],
            "priceRange": "$$",
            "servesCuisine": ["Middle Eastern", "Desserts", "Coffee", "Shakes", "Beverages"],
            "hasMenu": `${baseUrl}/menu`,
            "menu": `${baseUrl}/menu`,
            "acceptsReservations": false,
            "deliveryAvailable": true,
            "takeoutAvailable": true,
            "dineInAvailable": true,
            "wheelchairAccessible": true,
            "parkingAvailable": true,
            "parkingType": "Street Parking",
            "areaServed": [
              {
                "@type": "City",
                "name": "Astoria",
                "sameAs": "https://en.wikipedia.org/wiki/Astoria,_Queens"
              },
              {
                "@type": "City",
                "name": "Queens",
                "sameAs": "https://en.wikipedia.org/wiki/Queens"
              },
              {
                "@type": "City",
                "name": "New York City",
                "sameAs": "https://en.wikipedia.org/wiki/New_York_City"
              }
            ],
            "amenityFeature": [
              {
                "@type": "LocationFeatureSpecification",
                "name": "Free WiFi",
                "value": true
              },
              {
                "@type": "LocationFeatureSpecification",
                "name": "Street Parking",
                "value": true
              },
              {
                "@type": "LocationFeatureSpecification",
                "name": "Late Night Hours",
                "value": true
              }
            ],
            "paymentAccepted": ["Cash", "Credit Card", "Debit Card", "Digital Wallet"],
            "currenciesAccepted": "USD",
            "sameAs": [
              "https://www.instagram.com/laza.cafe",
              "https://www.tiktok.com/@lazacafe"
            ]
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Laza Dessert Cafe",
            "description": "Premium Middle Eastern desserts including kunafa, crepes, waffles, shakes, and more. Open daily 2:00 PM - 2:00 AM.",
            "url": baseUrl,
            "logo": `${baseUrl}/lazabluelogo.png`,
            "image": `${baseUrl}/default_og.png`,
            "telephone": ["+1 347 560 6080", "+1 347 507 1087"],
            "email": "support@lazadessert.cafe",
            "foundingDate": "2020",
            "numberOfEmployees": "15-25",
            "currenciesAccepted": "USD",
            "paymentAccepted": ["Cash", "Credit Card", "Debit Card", "Digital Wallet"],
            "priceRange": "$$",
            "servesCuisine": ["Middle Eastern", "Desserts", "Coffee", "Shakes", "Beverages"],
            "hasMenu": `${baseUrl}/menu`,
            "menu": `${baseUrl}/menu`,
            "acceptsReservations": false,
            "deliveryAvailable": true,
            "takeoutAvailable": true,
            "dineInAvailable": true,
            "wheelchairAccessible": true,
            "parkingAvailable": true,
            "parkingType": "Street Parking",
            "amenityFeature": [
              {
                "@type": "LocationFeatureSpecification",
                "name": "Free WiFi",
                "value": true
              },
              {
                "@type": "LocationFeatureSpecification",
                "name": "Outdoor Seating",
                "value": false
              },
              {
                "@type": "LocationFeatureSpecification",
                "name": "Late Night Hours",
                "value": true
              }
            ],
            "areaServed": [
              {
                "@type": "City",
                "name": "Brooklyn",
                "sameAs": "https://en.wikipedia.org/wiki/Brooklyn"
              },
              {
                "@type": "City",
                "name": "Queens",
                "sameAs": "https://en.wikipedia.org/wiki/Queens"
              },
              {
                "@type": "City",
                "name": "New York City",
                "sameAs": "https://en.wikipedia.org/wiki/New_York_City"
              }
            ],
            "serviceArea": {
              "@type": "GeoCircle",
              "geoMidpoint": {
                "@type": "GeoCoordinates",
                "latitude": 40.7128,
                "longitude": -74.0060
              },
              "geoRadius": "50000"
            },
            "sameAs": [
              "https://www.instagram.com/laza.cafe",
              "https://www.tiktok.com/@lazacafe"
            ],
            "location": [
              {
                "@type": "Place",
                "name": "Laza Dessert Cafe Brooklyn",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "6740 5th Ave",
                  "addressLocality": "Brooklyn",
                  "addressRegion": "NY",
                  "postalCode": "11220",
                  "addressCountry": "US"
                },
                "telephone": "+1 347 560 6080",
                "openingHours": "Mo-Su 14:00-02:00",
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": 40.6347,
                  "longitude": -74.0167
                },
                "publicAccess": true,
                "amenityFeature": [
                  {
                    "@type": "LocationFeatureSpecification",
                    "name": "Street Parking",
                    "value": true
                  }
                ]
              },
              {
                "@type": "Place",
                "name": "Laza Dessert Cafe Queens",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "25-33 Steinway St",
                  "addressLocality": "Queens",
                  "addressRegion": "NY",
                  "postalCode": "11103",
                  "addressCountry": "US"
                },
                "telephone": "+1 347 507 1087",
                "openingHours": "Mo-Su 14:00-02:00",
                "geo": {
                  "@type": "GeoCoordinates",
                  "latitude": 40.7648,
                  "longitude": -73.9208
                },
                "publicAccess": true,
                "amenityFeature": [
                  {
                    "@type": "LocationFeatureSpecification",
                    "name": "Street Parking",
                    "value": true
                  }
                ]
              }
            ],
            */
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Dessert Menu",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Product",
                    "name": "Kunafa",
                    "description": "Traditional Middle Eastern dessert with cheese and syrup"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Product",
                    "name": "Crepes",
                    "description": "Sweet and savory crepes with various fillings"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Product",
                    "name": "Milkshakes",
                    "description": "Premium milkshakes with unique flavors"
                  }
                }
              ]
            },
            "openingHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                "opens": "14:00",
                "closes": "02:00"
              }
            ],
            "specialOpeningHoursSpecification": [
              {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Friday", "Saturday"],
                "opens": "14:00",
                "closes": "02:00",
                "description": "Extended hours on weekends"
              }
            ]
          })
        }}
      />
      <main className="relative min-h-screen w-full ">
        {/* Hidden H1 for SEO - not visible on UI */}
        <h1 className="sr-only">Laza Dessert Cafe - Premium Desserts, Crepes, Waffles, and Kunafa</h1>

        {/* Hero Section */}
        <HeroVideo />

        {/* <SlideScale products={getRandomMenuItems(7)} /> */}

        {/* Most Wanted Section */}
        <section className="relative h-full w-full items-center justify-start overflow-hidden sm:min-h-220 min-h-180" >
          {/* Gradient + Image background */}
          <FadeIn className="relative -z-10">
            <div className="absolute sm:-top-10 -top-14 md:w-225 w-70 md:h-180 h-60 -z-20 md:right-0 -right-10 "
            >
              <Image src="https://laza-dessert-cafe.b-cdn.net/lazablack1.png" alt="Blue Laza" fill className='object-cover object-center' />
            </div>
          </FadeIn>

          <div className="flex flex-col  items-center justify-start w-full h-fit space-y-4 sm:space-y-2 md:px-20 px-4 sm:pt-40 pt-20 z-10">
            <p className="text-[#2C4B7E] md:text-8xl text-shadow-2xs font-bold text-5xl text-center leading-tight "
              style={{
                fontFamily: "var(--font-bebas)",
              }}
            >Most Popular of the Week</p>
            <p className="text-black sm:text-xl text-base sm:w-[50%] text-center"
              style={{
                fontFamily: "var(--font-raleway)",
              }}
            >Handcrafted indulgences in the spotlight.<br />
              a testament to dessert artistry at <span className="text-[#2C4B7E] font-[--font-bebas]">Laza.</span>
            </p>
          </div>

          <section className="h-full  max-w-8xl w-full py-8 mx-auto relative">
            {/* <SwiperComponent /> */}
            {/* <Carousel items={getRandomMenuItems(7)} /> */}
            {/* <GeminiCarousel products={getRandomMenuItems(7)} /> */}
            {/* <GeminiCarouselSlide products={getRandomMenuItems(7)} /> */}
            {/* <GeminiCenterCarousel products={getRandomMenuItems(7)} /> */}
            {/* <GeminiCenter2Carousel products={getRandomMenuItems(7)} /> */}
            <SlideScale products={getRandomMenuItems(7)} />

          </section>
        </section>

        {/* Kunafa Section */}
        <section className="flex relative flex-row items-center justify-center w-full">
          <div className=" absolute top-0 left-0 w-full h-fit inset-0 sm:max-w-8xl overflow-hidden">
            <FadeIn>
              <p className="text-center xl:text-[26rem] md:text-[16rem] text-9xl"
                style={{
                  background: "linear-gradient(180deg, #FFF 0%, #F1F1F1 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "var(--font-playfair)",
                }}
              >KUNAFA</p>
            </FadeIn>
          </div>
          <div className=" absolute bottom-0 w-full h-100 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem),linear-gradient(to_top,transparent,black_6rem)]  "
            style={{
            }}
          >
            <Image src={'https://laza-dessert-cafe.b-cdn.net/bgwave.jpg'} alt="bg wave" fill className="" />
          </div>
          {/* Signature Kunafa Section */}
          <section className=" max-w-[1440px]  overflow-hidden  mx-auto flex flex-col lg:flex-row xl:space-y-0 space-y-10 items-center justify-center xl:gap-x-10 w-full xl:mt-40 sm:mt-30 py-24 xl:px-12 px-4 relative">

            {/* Left: Large circle image with overlapping logo */}
            <div className="relative flex-shrink-0 flex items-center justify-center lg:w-[50%] sm:w-[70%] w-full h-fit aspect-square" >
              <div className="rounded-full relative overflow-hidden w-full h-full border bg-gray-200 flex items-center justify-center">
                <Image src="https://laza-dessert-cafe.b-cdn.net/sigkunafa.png" alt="Signature Kunafa" fill className="object-cover object-center" />
              </div>
              {/* Overlapping logo circle */}
              <div className="absolute -bottom-10 left-0 rounded-full overflow-hidden lg:w-55 lg:h-55 sm:w-50 sm:h-50 w-40 h-40 border-4 border-white bg-white flex items-center justify-center shadow-lg">
                <Image src="https://laza-dessert-cafe.b-cdn.net/lazabluelogo.png" alt="Laza Logo" fill className="object-cover" />
              </div>
            </div>


            {/* Right: Text and small circles */}
            <div className="flex-1 flex flex-col justify-center items-start md:pl-16 mt-12 md:mt-0">
              <div className="w-full flex-col lg:space-y-0 space-y-10 items-start justify-center px-6">
                <h2 className="text-4xl md:text-6xl mb-6 leading-tight"
                  style={{
                    fontFamily: "var(--font-bebas)",
                  }}
                >Our Signature<br /> Kunafa</h2>
                <p className="text-lg md:text-xl text-black mb-10 max-w-xl leading-tight sm:w-[80%]"
                  style={{
                    fontFamily: "var(--font-raleway)",
                  }}
                >
                  Indulge in our signature Kunafa — a golden, crispy layer of shredded phyllo wrapped around a rich, creamy cheese center, delicately soaked in rose-scented syrup. Each bite offers the perfect balance of texture and sweetness, finished with a touch of crushed pistachios. Served warm, it's our most decadent dessert and a timeless Middle Eastern classic reimagined with Laza Cafe elegance.
                </p>
              </div>
              <div className="flex flex-row gap-8 mt-2 w-full px-6">
                {['/topping1.png', '/topping2.png', '/topping3.png'].map((i) => (
                  <Reveal className="w-full py-5" key={i}>
                    <div key={i} className="flex flex-col items-center relative w-full">
                      <div className="rounded-full overflow-hidden sm:w-30 w-24 aspect-square relative  flex items-center justify-center">
                        <Image src={i} alt="Topping" fill className="object-cover object-center" />
                      </div>
                      <span className="text-xs text-gray-500 mt-2 rotate-[-10deg] absolute sm:-bottom-5 -bottom-6 sm:right-0 -right-1">
                        <Toppings />
                      </span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        </section>

        {/* Menu Section */}
        <section className="flex relative flex-row items-center justify-center w-full">
          <div className=" absolute top-0 left-0 w-full h-full inset-0 overflow-hidden">
            <FadeIn>
              <p className="text-start xl:text-[26rem] md:text-[16rem] text-9xl"
                style={{
                  background: "linear-gradient(180deg, #FFF 0%, #F1F1F1 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "var(--font-playfair)",
                }}
              >MENU</p>
            </FadeIn>
          </div>
          <div className=" absolute bottom-0 w-full h-100 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem),linear-gradient(to_top,transparent,black_6rem)]  "
            style={{
            }}
          >
            <Image src={'https://laza-dessert-cafe.b-cdn.net/bgwave.jpg'} alt="bg wave" fill className="" />
          </div>


          <section className=" max-w-[1440px] overflow-hidden  mx-auto flex flex-col items-center justify-center gap-x-10 border-black w-full xl:mt-40 sm:mt-20 sm:py-24 py-14 md:px-20 px-4 relative">
            <div className="flex flex-col items-center justify-center w-full h-full">
              <p className="text-4xl md:text-7xl  mb-6  leading-tight"
                style={{
                  fontFamily: "var(--font-bebas)",
                }}
              >Menu</p>
            </div>
            <CategoryScroller />
          </section>
        </section>

        {/* Our Story Section */}
        <section className="flex relative flex-row items-center justify-center w-full overflow-hidden">
          <div className=" absolute top-0 left-0 w-full h-fit inset-0">
            <FadeIn>
              <p className="text-start xl:text-[26rem] md:text-[16rem] text-9xl"
                style={{
                  background: "linear-gradient(180deg, #FFF 0%, #F1F1F1 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "var(--font-playfair)",
                }}
              >ABOUT</p>
            </FadeIn>
          </div>
          <div className=" rotate-180 absolute -bottom-0 w-full h-100 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem),linear-gradient(to_top,transparent,black_6rem)]  "
            style={{
            }}
          >
            <Image src={'https://laza-dessert-cafe.b-cdn.net/bgwave.jpg'} alt="bg wave" fill className="" />
          </div>


          <section className="max-w-[1440px]  mx-auto flex flex-col items-center justify-center gap-x-10 border-black w-full xl:mt-50 sm:mt-20 sm:py-24 py-14 relative">
            <div className="flex flex-col items-start w-full h-full">
              <p className="text-4xl md:text-7xl  mb-6  leading-tight px-4"
                style={{
                  fontFamily: "var(--font-bebas)",
                }}
              >Our Story</p>
            </div>




            <div className="flex lg:flex-row flex-col items-start justify-between w-full h-full ">
              {/* left */}
              <div className="flex flex-row items-center justify-center lg:w-[80%] w-full lg:order-first order-last h-fit lg:gap-x-0 gap-x-10">


                <div className="sm:text-xl text-base mb-6 leading-tight lg:w-[25%] w-full font-[--font-roboto]  lg:order-first order-last"
                  style={{
                    fontFamily: "var(--font-raleway)",
                  }}
                >
                  <div className="bg-[#234B82] w-20 h-[3px] my-4 " />
                  <Reveal className="w-full sm:text-xl text-base"><p>Born in the heart of Bay Ridge, our story begins with a simple passion: transforming the world's finest cocoa into moments of pure joy. Laza is more than a dessert cafe; it's a celebration of craftsmanship, where every rich, decadent creation is handcrafted with love.</p></Reveal>
                </div>


                <div className="flex flex-row items-start aspect-2/3 xl:h-250 lg:h-200 sm:h-120 h-60  relative px-4">
                  <Image src="https://laza-dessert-cafe.b-cdn.net/Canva%20Image%20(4).png" alt="brownie shake" fill className="object-contain object-center" />
                  {/* Overlapping logo circle */}
                  <div className="absolute sm:top-10 top-3 sm:left-15 left-0 rounded-full overflow-hidden lg:w-55 lg:h-55 sm:w-30 sm:h-30 w-18 h-18 border-4 border-white bg-white flex items-center justify-center shadow-lg">
                    <Image src="https://laza-dessert-cafe.b-cdn.net/lazabluelogo.png" alt="Laza Logo" fill className="object-cover" />
                  </div>
                </div>
              </div>


              {/* right */}
              <div className="flex lg:flex-col flex-row items-center justify-center lg:w-[22%] lg:gap-x-0 gap-x-10 w-full h-full space-y-20 px-4 ">

                <div className="sm:flex hidden flex-row items-center justify-center sm:aspect-[456.77/700.00] aspect-2/3 lg:w-50 w-full sm:h-fit h-60 relative rounded-full overflow-hidden"

                >
                  <Image src="https://laza-dessert-cafe.b-cdn.net/matcha-latte.jpg" alt="Matcha Latte" fill className="object-cover object-center" />
                </div>


                <div className="sm:text-xl text-base mb-6 lg:order-last order-first  leading-tight"
                  style={{
                    fontFamily: "var(--font-raleway)",
                  }}
                >
                  <div className="bg-[#234B82] w-20 h-[3px] my-4" />
                  <Reveal className="w-full sm:text-xl text-base"><p>Our menu is a journey of flavor, blending timeless tradition with a vibrant New York edge. From comforting chocolate classics to inspired delights infused with rose-scented syrup and pistachios, we invite you to indulge your senses and discover a treat that feels like it was made just for you.</p></Reveal>
                </div>
              </div>


            </div>
          </section>
        </section>


        {/* Love / Join Us Section */}
        <section className="flex relative items-center justify-center xl:mb-30 mb-0 w-full ">


          <div className=" absolute sm:-top-50 top-0 left-0 w-full overflow-hidden">
            <FadeIn className="">
              <p className="lg:text-end text-start xl:text-[26rem] md:text-[16rem] text-9xl"
                style={{
                  background: 'linear-gradient(180deg, #FFF 0%, #F1F1F1 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: 'var(--font-playfair)',
                }}
              >LOVE</p>
            </FadeIn>
          </div>


          <div className=" absolute top-1/2 left-0  w-full h-100 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem),linear-gradient(to_top,transparent,black_6rem)]  "
            style={{
            }}
          >
            <Image src={'https://laza-dessert-cafe.b-cdn.net/bgwave.jpg'} alt="bg wave" fill className="" />
          </div>
          {/* Dubai Chocolate Image */}
          <div className="flex absolute items-end justify-end right-0 xl:top-50 top-20 w-full md:h-120 h-60 z-10">
            <div className="w-50 sm:top-0 -top-10 flex h-full absolute sm:relative sm:w-100 right-0">
              <Image src="https://laza-dessert-cafe.b-cdn.net/dubaichocalate.png" alt="Dubai Chocolate" fill className="object-cover object-center self-end flex " />
            </div>
          </div>
          {/* Ice Cream Image */}
          <div className="flex-row lg:flex hidden  absolute left-0 -bottom-5 items-start justify-start w-full h-144">
            <div className="w-[50%] h-full relative mt-20">
              <Image src="https://laza-dessert-cafe.b-cdn.net/icecream.png" alt="Dubai Chocolate" fill className="object-cover object-center" />
              <div className="absolute -top-20 right-1/5 rounded-full overflow-hidden w-55 h-55 border-4 border-white bg-white flex items-center justify-center shadow-lg">
                <Image src="https://laza-dessert-cafe.b-cdn.net/lazabluelogo.png" alt="Laza Logo" fill className="object-cover" />
              </div>
            </div>
          </div>


          {/* Join Us Content */}
          <section className="max-w-[1440px] mx-auto  flex flex-col items-center justify-center w-full xl:mt-32 mt-0 z-10 sm:px-10 px-6 lg:py-24 relative">
            <div className="flex flex-row w-full h-full ">
              <div className="hidden flex-col lg:flex  items-start justify-center w-full h-full">
                <p className="text-[#2C4B7E] text-xl font-[500]  mb-6 leading-tight"
                  style={{
                    fontFamily: "var(--font-raleway)",
                  }}
                >Join the Laza Cafe Family</p>
                <p className="text-xl mb-6  leading-tight pr-44"
                  style={{
                    fontFamily: "var(--font-raleway)",
                  }}
                >
                  Be part of one of the most unique dessert experiences around. Our bold branding, delicious menu, and effortless setup make it easy to serve joy in every bite while creating a space your community will love.
                </p>
              </div>

              <div className="flex flex-col  items-start relative justify-center w-full h-full mt-14 sm:mt-0 lg:space-y-20 space-y-10">
                <p className="text-black sm:text-7xl text-3xl  mb-6 leading-tight"
                  style={{
                    fontFamily: "var(--font-bebas)",
                  }}
                >Join Us</p>
                <Link href="/join-us" className="bg-[#2C4B7E] hover:bg-[#2C4B7E] hover:scale-105 transition-all duration-300 cursor-pointer text-white text-xl rounded-full sm:block hidden px-6 py-4 w-fit h-fit"
                  style={{
                    boxShadow: '0px 2px 8px 2px rgba(0, 0, 0, 0.40) inset',
                  }}
                >
                  Make it yours
                </Link>


                <div className="flex flex-col items-start justify-center w-full h-full space-y-10 mt-10">
                  <div className="flex flex-col items-start justify-center w-full h-full">
                    <p className="text-black text-xl font-bold leading-tight">Effortless setup</p>
                    <p className="text-black text-xl leading-tight">Streamlined operations with personalized support</p>
                  </div>
                  <div className="flex flex-col items-start justify-center w-full h-full">
                    <p className="text-black text-xl font-bold leading-tight">Flexible growth</p>
                    <p className="text-black text-xl leading-tight">Grow at your own pace with a concept that evolves with your vision</p>
                  </div>
                  <div className="flex flex-col items-start justify-center w-full h-full">
                    <p className="text-black text-xl font-bold leading-tight">Customer love</p>
                    <p className="text-black text-xl leading-tight">Over 4.5 stars across all Laza Cafe locations – people can't get enough</p>
                  </div>
                  <div className="flex flex-col items-start justify-center w-full h-full">
                    <p className="text-black text-xl font-bold leading-tight">Community magic</p>
                    <p className="text-black text-xl leading-tight">Be the sweet spot in your neighborhood and create memorable moments</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>


        {/* Testimonials Section */}
        <section className="relative flex flex-col max-w-8xl overflow-hidden items-center justify-center md:min-h-200 w-full xl:mt-0 mt-40  sm:py-24 py-14 pb-40 px-4 md:px-16  [mask-composite:intersect] [mask-image:linear-gradient(to_top,transparent,black_6rem)]">
          <div className="absolute sm:-top-20 inset-0 left-0 w-full pointer-events-none select-none">
            <FadeIn className="">
              <p className="text-start xl:text-[26rem] md:text-[16rem] text-9xl "
                style={{
                  background: 'linear-gradient(180deg, #FFF 0%, #F1F1F1 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: 'var(--font-playfair)',
                }}
              >REVIEWS</p>
            </FadeIn>
          </div>
          <h2 className="sm:text-6xl text-3xl  mb-16 z-10 xl:mt-20 mt-0"
            style={{
              fontFamily: "var(--font-bebas)",
            }}
          >Testimonials</h2>
          <div className="z-10 sm:mt-10 "><TestimonialsCarousel reviews={reviews || []} /></div>
          {/* Waffle image on the right */}
          <div className="absolute lg:-bottom-20 md:-bottom-40 -bottom-5 right-0 sm:w-100 w-60 h-60 sm:h-100  pointer-events-none select-none ">
            <Image src="https://laza-dessert-cafe.b-cdn.net/waffle1.png" alt="Waffle" fill className="object-contain object-bottom" />
          </div>
        </section>


        {/* Our Locations Section */}
        <section className="relative flex flex-col sm:items-start items-center overflow-hidden w-full  py-24 pb-40 px-4 md:px-16 xl:mt-0 mt-20">
          <div className="absolute sm:-top-20 inset-0 left-0 w-full pointer-events-none select-none">
            <FadeIn className="">
              <p className="text-start xl:text-[26rem] md:text-[16rem] text-9xl"
                style={{
                  background: 'linear-gradient(180deg, #FFF 0%, #F1F1F1 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontFamily: 'var(--font-playfair)',
                }}
              >VISIT</p>
            </FadeIn>
          </div>
          <h2 className="text-5xl md:text-6xl  mb-16 xl:mt-20 mt-0 z-10 relative"
            style={{
              fontFamily: "var(--font-bebas)",
            }}
          >Our Locations</h2>
          <div className="flex sm:flex-row flex-col sm:items-start items-center sm:justify-start justify-center w-full sm:gap-12 gap-6 z-10 relative">
            {/* Brooklyn Card */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8 w-[340px] min-h-[220px] flex flex-col sm:mt-10">
              <div className="flex items-center gap-2 mb-2">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2C4B7E" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4.418 0-8-5.373-8-10A8 8 0 1 1 20 11c0 4.627-3.582 10-8 10z" /><circle cx="12" cy="11" r="3" fill="#2C4B7E" /></svg>
                <span className="text-xl font-bold text-[#2C4B7E]">Brooklyn</span>
              </div>
              <div className="text-black text-base mb-2">6740 5th Ave,<br />Brooklyn, NY 11220</div>
              <div className="text-black text-base mb-2">+1 (347) 560-6080</div>
              <div className="text-black text-base mb-2">support@lazadessert.cafe</div>
              <a href="https://maps.google.com/?q=6740+5th+Ave,+Brooklyn,+NY+11220" target="_blank" rel="noopener noreferrer" className="text-[#2C4B7E] font-medium hover:underline mt-2">Get Directions</a>
            </div>
            {/* Astoria Card */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8 w-[340px] min-h-[220px] flex flex-col sm:mt-10">
              <div className="flex items-center gap-2 mb-2">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2C4B7E" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4.418 0-8-5.373-8-10A8 8 0 1 1 20 11c0 4.627-3.582 10-8 10z" /><circle cx="12" cy="11" r="3" fill="#2C4B7E" /></svg>
                <span className="text-xl font-bold text-[#2C4B7E]">Astoria</span>
              </div>
              <div className="text-black text-base mb-2">25-33 Steinway St,<br />Astoria, NY 11220</div>
              <div className="text-black text-base mb-2">+1 (347) 507-1087</div>
              <div className="text-black text-base mb-2">support@lazadessert.cafe</div>
              <a href="https://maps.google.com/?q=25-33+Steinway+St,+Long+Island+City,+NY+11220" target="_blank" rel="noopener noreferrer" className="text-[#2C4B7E] font-medium hover:underline mt-2">Get Directions</a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
