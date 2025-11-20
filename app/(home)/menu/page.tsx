import React from 'react'
import Image from 'next/image'
import MenuHeader from '@/components/MenuHeader'
import MenuCategories from '@/components/MenuCategories'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Menu - Premium Middle Eastern Desserts",
  description: "Explore our menu of premium Middle Eastern desserts including kunafa, crepes, waffles, shakes, and more. Fresh ingredients, traditional recipes.",
  keywords: [
    "laza dessert cafe menu",
    "laza kunafa",
    "laza crepes",
    "laza waffles",
    "laza milkshake",
    "laza cakes",
    "laza pistachio latte",
    "laza mojito",
    "laza dessert cups",
    "laza kunafa tray",
    "order laza kunafa online",
    "chocolate factory menu",
    "chocolate factory dessert menu",
    "chocolate factory kunafa",
    "chocolate factory knafeh",
    "chocolate factory cheese kunafa",
    "chocolate factory pistachio kunafa",
    "chocolate factory crepes",
    "chocolate factory nutella crepe",
    "chocolate factory waffles",
    "chocolate factory bubble waffle",
    "chocolate factory milkshake",
    "chocolate factory lotus biscoff shake",
    "chocolate factory ferrero rocher shake",
    "chocolate factory cakes",
    "chocolate factory pistachio latte",
    "chocolate factory mojito",
    "chocolate factory dessert cups",
    "chocolate factory kunafa tray",
    "order chocolate factory kunafa online"
  ],
  alternates: {
    canonical: '/menu',
  },
  openGraph: {
    title: "Menu - Premium Middle Eastern Desserts",
    description: "Explore our menu of premium Middle Eastern desserts including kunafa, crepes, waffles, shakes, and more.",
    url: 'https://lazadessert.cafe/menu',
  },
  twitter: {
    title: "Menu - Premium Middle Eastern Desserts",
    description: "Explore our menu of premium Middle Eastern desserts including kunafa, crepes, waffles, shakes, and more.",
  },
}

export default function Menu() {
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
            "description": "Premium Middle Eastern desserts including kunafa, crepes, waffles, shakes, and more. Fresh ingredients, traditional recipes.",
            "url": "https://lazadessert.cafe/menu",
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
            ]
          })
        }}
      />
      <main className="min-h-screen w-full pb-28 sm:pb-24 md:pb-20">
        {/* <section className='flex flex-col relative items-center justify-center w-full h-full'>
            <div className='flex items-end w-full h-full'>
                <Image src='/lazablack.jpg' alt='bg wave' fill className='object-cover' />
            </div>
            <div className=' flex flex-col space-y-8'>
                <p className='text-center text-5xl font-[--font-playfair] font-500'>Explore Our Menu</p>
                <p className='text-center text-xl w-[60%] self-center'>Handcrafted indulgences that captured the spotlight, each bite 
                a testament to dessert artistry at Laza.</p>
            </div>
        </section> */}
        <MenuHeader />
        <MenuCategories />
      </main>
    </>
  )
}