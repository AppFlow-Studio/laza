import React from 'react'
import Image from 'next/image'
import FadeIn from '@/components/FadeIn'
import OrderNowButton from '@/components/OrderNowButton'
import MenuImageCard from '@/components/MenuImageCard'
import type { Metadata } from 'next'
import FAQsSections from '@/components/FAQSections'

export const metadata: Metadata = {
  title: "About Us - Laza Dessert Cafe",
  description: "Discover the story behind Laza Dessert Cafe. From premium Middle Eastern desserts to late-night treats, we bring tradition and innovation together.",
  keywords: [
    "about laza dessert cafe",
    "laza dessert cafe chocolate factory",
    "chocolate factory laza dessert cafe",
    "laza formerly chocolate factory",
    "chocolate factory rebrand laza",
    "history of laza dessert cafe",
    "history of chocolate factory astoria",
    "history of chocolate factory bay ridge"
  ],
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: "About Us - Laza Dessert Cafe",
    description: "Discover the story behind Laza Dessert Cafe. From premium Middle Eastern desserts to late-night treats, we bring tradition and innovation together.",
    url: 'https://lazadessert.cafe/about',
  },
  twitter: {
    title: "About Us - Laza Dessert Cafe",
    description: "Discover the story behind Laza Dessert Cafe. From premium Middle Eastern desserts to late-night treats, we bring tradition and innovation together.",
  },
}

const AboutUs = () => {
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
                                  "description": "Discover the story behind Laza Dessert Cafe. From premium Middle Eastern desserts to late-night treats, we bring tradition and innovation together.",
                        "url": "https://lazadessert.cafe/about",
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
                            "https://www.instagram.com/lazacafe/?hl=en",
                            "https://www.tiktok.com/@lazacafe"
                        ]
                    })
                }}
            />
            <main className='flex flex-col items-center justify-center w-full overflow-hidden '>
                {/* Hero Section */}
                <section className='relative flex max-w-[1440px]  overflow-hidden flex-col items-start w-full sm:mt-0 mt-10 md:pl-0 pl-2 [mask-composite:intersect] sm:[mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem),linear-gradient(to_top,transparent,black_6rem)] sm:pb-20'>
                    <div className='relative inset-0 md:w-[70%] w-[90%] md:h-160 h-80 overflow-hidden '>
                        <Image src="/bluelazaheader.png" alt="Blue Laza" fill className='object-fill object-center' />
                    </div>
                    <div className='absolute sm:top-1/3 sm:mt-0 mt-20 xl:-right-10 md:right-0 -right-30 xl:w-200 lg:w-120 md:w-100 w-70 xl:h-180 lg:h-130 md:h-100 h-80' style={{ overflow: 'hidden' }}>
                        <Image src="/dubaichoclateheader.png" alt="Dubai Chocolate" fill className='object-cover object-center' />
                    </div>

                    <div className='flex flex-row items-start space-x-6 md:mt-0 mt-6  w-full md:px-20 px-2 overflow-hidden'>
                        <div className='relative md:w-60 w-[30%] md:h-80 h-50 mt-6 rounded-full overflow-hidden'>
                            <Image src="/strawberrysmoothie.png" alt="Strawberry Smoothie" fill className='object-cover object-center' />
                        </div>
                        <div className='flex flex-col items-start justify-center md:w-full w-[70%] text-black space-y-4'>
                            <div className='md:block hidden'>
                                <p className='text-lg '
                                style={{
                                    fontFamily: "var(--font-raleway)",
                                }}
                                >WE ARE OPEN FROM<br />
                                    <span className=' text-[#2C4B7E] font-bold'> Sunday - Saturday</span>: 2:00pm - 2:00am</p>
                            </div>
                            <div className="bg-[#234B82] w-20 h-[3px] my-4" />
                            <p className='text-lg md:w-[30%] w-[90%] z-10'
                            style={{
                                fontFamily: "var(--font-raleway)",
                            }}
                            >
                                Welcome to Laza Café, where dessert isn’t just a treat, it’s an experience.
                            </p>

                        </div>
                    </div>
                </section>

                <section className="flex relative flex-col items-center justify-center py-4 w-full h-full max-w-[1440px] overflow-hidden my-20">
                    <div className=" absolute xl:-top-20 top-0 left-0 z-4 w-full h-full inset-0 max-w-8xl overflow-hidden">
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
                    <div className=" absolute md:block hidden bottom-12 w-full overflow-hidden h-[80%] [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_6rem),linear-gradient(to_left,transparent,black_6rem),linear-gradient(to_top,transparent,black_6rem)]  "
                        style={{
                        }}
                    >
                        <Image src={'/bgwave.jpg'} alt="bg wave" fill className=" object-cover" />
                    </div>

                    <h2 className="sm:text-5xl md:text-7xl text-4xl font-500 mb-16 xl:mt-40 md:mt-30 mt-14 z-10 relative"
                    style={{
                        fontFamily: "var(--font-bebas)",
                    }}
                    >Why People Love Us</h2>

                    <div className='flex flex-row z-10 xl:-space-x-2 lg:-space-x-6 -space-x-10  items-center justify-center w-full h-full lg:mt-10 sm:mt-20 mt-10 lg:px-0 px-6'>
                        <div className='relative lg:w-80 sm:w-70 w-50 lg:h-60 h-20 sm:h-30 lg:rounded-l-[4rem] rounded-l-3xl overflow-hidden'>
                            <Image src="/ferroshake.jpg" alt="Ferro Shake" className='object-cover' fill />
                        </div>
                        <div className='relative sm:w-140 w-100  z-10 aspect-video rounded-[4rem] overflow-hidden shadow-2xl'>
                            <Image src="/desserts/ockywaykunafaicecream.png" alt="Okyway Kunafa Ice Cream" className='object-cover' fill />
                        </div>
                        <div className='relative lg:w-80 sm:w-70 w-50 lg:h-60 h-20 sm:h-30 lg:rounded-r-[4rem] rounded-r-3xl overflow-hidden'>
                            <Image src="/triplechoccake.jpg" alt="Triple Chocolate Cake" className='object-cover' fill />
                        </div>
                    </div>
                    <p className='text-center text-xl z-10 lg:w-[60%] w-[90%] sm:mt-20 mt-10 '>Laza is your go-to destination for playful, indulgent desserts with a luxe twist. From signature kunafa and sweet crepes to handcrafted matcha drinks, creamy milkshakes, and rich coffee, every item is made to delight. Whether you're stopping by for a late-night treat or a midday pick-me-up, Laza delivers flavor, fun, and Instagram-worthy vibes daily until 2 AM.</p>
                    <div className='sm:pb-50 z-10 mt-20'><OrderNowButton /></div>
                </section>

                <section className="relative flex-col items-center justify-center w-full h-full max-w-[1440px] overflow-hidden lg:px-0 px-6 lg:flex hidden" >
                    <div className=" absolute xl:-top-20 top-0 left-0 z-4 w-full h-full inset-0 max-w-8xl overflow-hidden">
                        <FadeIn>
                            <p className="text-end xl:text-[26rem] md:text-[16rem] text-9xl"
                                style={{
                                    background: "linear-gradient(180deg, #FFF 0%, #F1F1F1 100%)",
                                    backgroundClip: "text",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    fontFamily: "var(--font-playfair)",
                                }}
                            >INFO</p>
                        </FadeIn>
                    </div>


                <div className='flex flex-row items-center justify-center w-full h-full mt-50 '>
                    {/* <FAQSection /> */}
                    <FAQsSections />
                </div>
            </section>
                <section className='items-center grid md:grid-cols-3 grid-cols-1 gap-0 justify-center w-full h-full overflow-hidden '>
                    {[
                        {
                            text: 'Waffles',
                            imageSrc: '/waffles.mp4',
                            alt: 'Waffles',
                            label: 'Waffles',
                        },
                        {
                            text: 'Kunafa',
                            imageSrc: '/crepess.mp4',
                            alt: 'Kunafa',
                            label: 'Kunafa',
                        },
                        {
                            text: 'Cups',
                            imageSrc: '/latte.mp4',
                            alt: 'Cups',
                            label: 'Cups',
                        },
                    ].map((item, index) => (
                        <MenuImageCard key={index} imageSrc={item.imageSrc} alt={item.alt} label={item.label} />
                    ))
                    }
                </section>
            </main>
        </>
    )
}

export default AboutUs