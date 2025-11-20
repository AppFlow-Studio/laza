import React from 'react'
import Image from 'next/image'
import FadeIn from '@/components/FadeIn'
import OrderNowButton from '@/components/OrderNowButton'
import OrderForm from '@/components/OrderForm'
import type { Metadata } from 'next'
import AutoPlayVideo from '@/components/AutoPlayVideo'

export const metadata: Metadata = {
  title: "Catering - Laza Dessert Cafe",
  description: "Make your event special with Laza's catering services. Custom dessert platters, wedding cakes, corporate events, and more. Contact us for a consultation.",
  keywords: [
    "laza dessert cafe catering",
    "laza dessert catering nyc",
    "laza kunafa trays",
    "laza crepe boxes",
    "order laza catering nyc",
    "laza catering astoria",
    "laza catering bay ridge",
    "chocolate factory catering",
    "chocolate factory dessert catering",
    "chocolate factory kunafa trays",
    "chocolate factory party trays",
    "order chocolate factory catering nyc",
    "chocolate factory catering astoria",
    "chocolate factory catering bay ridge"
  ],
  alternates: {
    canonical: '/catering',
  },
  openGraph: {
    title: "Catering - Laza Dessert Cafe",
    description: "Make your event special with Laza's catering services. Custom dessert platters, wedding cakes, corporate events, and more.",
    url: 'https://lazadessert.cafe/catering',
  },
  twitter: {
    title: "Catering - Laza Dessert Cafe",
    description: "Make your event special with Laza's catering services. Custom dessert platters, wedding cakes, corporate events, and more.",
  },
}

const Catering = () => {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": "Laza Dessert Cafe",
            "alternateName": ["Chocolate Factory", "The Chocolate Factory", "Laza by Chocolate Factory"],
            "description": "Make your event special with Laza's catering services. Custom dessert platters, wedding cakes, corporate events, and more. Contact us for a consultation.",
            "url": "https://lazadessert.cafe/catering",
            "logo": "https://lazadessert.cafe/lazabluelogo.png",
            "image": "https://lazadessert.cafe/default_og.png",
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
            "hasMenu": "https://lazadessert.cafe/menu",
            "menu": "https://lazadessert.cafe/menu",
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
                "name": "Street Parking",
                "value": true
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
            "sameAs": [
              "https://www.instagram.com/laza.cafe",
              "https://www.tiktok.com/@lazacafe"
            ],
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Catering Services",
              "itemListElement": [
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Dessert Platters",
                    "description": "Custom dessert platters for events and parties"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Wedding Cakes",
                    "description": "Custom wedding cakes and dessert displays"
                  }
                },
                {
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": "Corporate Catering",
                    "description": "Corporate event catering and dessert services"
                  }
                }
              ]
            }
          })
        }}
      />
      <main>
        <section className="relative aspect-video h-full w-full">
          {/* Background Video */}
          <div className="absolute inset-0 w-full h-full">
            <AutoPlayVideo
              src="/cateringvideo.mp4"
              className="w-full h-full object-cover"
              id="catering-video"
              showPlayButton={false}
            />
            <div className="absolute inset-0 bg-black/40"></div>
            {/* Slight overlay for contrast */}
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(102, 102, 102, 0.00) 0%, #000 100%)",
            }}
          />
          <div className="absolute sm:left-10 left-0 sm:bottom-12 bottom-0 p-6">
            <span className="text-white text-5xl md:text-6xl drop-shadow-lg"
              style={{
                fontFamily: "var(--font-bebas)",
              }}
            >
              Catering
            </span>
          </div>
        </section>

        <section className="flex relative flex-col items-center justify-center h-full w-full min-h-screen overflow-hidden lg:mt-20 md:mt-10 mt-6">
          <div className="absolute xl:-top-20 top-0 left-0 z-4 w-full h-full inset-0 max-w-8xl overflow-hidden">
            <FadeIn>
              <p
                className="text-start xl:text-[26rem] md:text-[16rem] text-8xl"
                style={{
                  background: "linear-gradient(180deg, #FFF 0%, #F1F1F1 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "var(--font-playfair)",
                }}
              >
                SWEET
              </p>
            </FadeIn>
          </div>

          <h2 className="text-5xl md:text-7xl font-500 mb-4 lg:mt-40 md:mt-24 mt-10 z-10 relative"
            style={{
              fontFamily: "var(--font-bebas)",
            }}
          >
            Plan Your Event
          </h2>
          <p className="text-lg md:text-xl mb-8 z-10 relative text-center max-w-3xl mx-auto" style={{ fontFamily: "var(--font-raleway)" }}>
            Planning a special event? Laza Dessert Cafe offers custom dessert catering for weddings, parties, and corporate gatherings. Let us create a memorable sweet experience—contact us for a free consultation!
          </p>

          <div className="flex flex-row z-10 xl:-space-x-2 lg:-space-x-6 -space-x-10 items-center justify-center w-full h-full lg:mt-20 sm:mt-20 lg:px-0 px-6">
            <div className="relative lg:w-80 sm:w-70 w-50 lg:h-60 h-20 sm:h-30 lg:rounded-l-[4rem] rounded-l-3xl overflow-hidden">
              <Image src="/pistachio.jpg" alt="Ferro Shake" className="object-cover" fill />
            </div>
            <div className="relative sm:w-140 w-100 z-10 aspect-video rounded-[4rem] overflow-hidden shadow-2xl">
              <Image src="/strawberrybanana.png" alt="Okyway Kunafa Ice Cream" className="object-cover" fill />
            </div>
            <div className="relative lg:w-80 sm:w-70 w-50 lg:h-60 h-20 sm:h-30 lg:rounded-r-[4rem] rounded-r-3xl overflow-hidden">
              <Image src="/triplechoccake.png" alt="Triple Chocolate Cake" className="object-cover" fill />
            </div>
          </div>

          <p className="text-center text-xl z-10 md:w-[60%] w-[90%] mt-20">
            We offer a variety of catered dessert options to complement your special event, from weddings and corporate gatherings to birthday parties and everything in between. We're easy to work with and happy to customize your order. Don't see it on the menu? Just ask and we'll make it for you. Reach out today for a quick, free consultation.
          </p>

          <div className="relative w-full h-full">
            <div className="w-full h-full relative max-w-[1440px] mt-20 mx-auto flex items-center justify-center z-10">
              <OrderForm />
            </div>
            <div
              className="absolute bottom-0 w-full h-full [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem),linear-gradient(to_top,transparent,black_6rem)]"
            >
              <Image src="/bgwave2.png" alt="bg wave" fill className="object-cover aspect-2/1 w-full" />
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

export default Catering