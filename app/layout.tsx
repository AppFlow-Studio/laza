import type { Metadata } from "next";
import { Inter, Playfair_Display, Roboto, Raleway, Bebas_Neue } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import '@/components/embla.css'
import Footer from "@/components/Footer";
import Script from 'next/script';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
});

// Get the base URL for metadata (works both locally and in production)
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  return 'https://lazadessert.cafe';
};

const baseUrl = getBaseUrl();

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  weight: ["500"],
  display: "swap",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas",
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Laza Dessert Cafe - Premium Middle Eastern Desserts & Drinks",
    template: "%s | Laza Dessert Cafe"
  },
  description: "Indulge in premium Middle Eastern desserts at Laza Dessert Cafe. Fresh kunafa, crepes, shakes, and more. Order online for pickup or catering. Experience the sweet taste of tradition.",
  keywords: [
    "laza dessert cafe",
    "laza dessert cafe nyc",
    "laza dessert cafe queens",
    "laza dessert cafe astoria",
    "laza dessert cafe brooklyn",
    "laza dessert cafe bay ridge",
    "laza dessert cafe steinway",
    "laza dessert cafe 5th ave",
    "laza dessert cafe near me",
    "laza dessert cafe hours",
    "directions to laza dessert cafe astoria",
    "directions to laza dessert cafe bay ridge",
    "laza dessert cafe order online",
    "laza dessert cafe delivery",
    "laza dessert cafe pickup",
    "laza by chocolate factory",
    "laza formerly chocolate factory",
    "chocolate factory",
    "the chocolate factory",
    "chocolate factory nyc",
    "chocolate factory queens",
    "chocolate factory astoria",
    "chocolate factory steinway",
    "chocolate factory steinway street",
    "chocolate factory brooklyn",
    "chocolate factory bay ridge",
    "chocolate factory 5th ave",
    "chocolate factory near me",
    "chocolate factory open late",
    "chocolate factory open till 2am",
    "chocolate factory hours",
    "directions to chocolate factory astoria",
    "directions to chocolate factory bay ridge",
    "chocolate factory order online",
    "chocolate factory delivery",
    "chocolate factory pickup",
    "chocolate factory new name laza"
  ],
  authors: [{ name: "Laza Dessert Cafe" }],
  creator: "Laza Dessert Cafe",
  publisher: "Laza Dessert Cafe",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(baseUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Laza Dessert Cafe',
    title: 'Laza Dessert Cafe - Premium Middle Eastern Desserts & Drinks',
    description: 'Indulge in premium Middle Eastern desserts at Laza Dessert Cafe. Fresh kunafa, crepes, shakes, and more. Order online for pickup or catering.',
    images: [
      {
        url: `${baseUrl}//logosocial.png`,
        width: 1200,
        height: 630,
        alt: 'Laza Dessert Cafe - Authentic Middle Eastern Desserts',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Laza Dessert Cafe - Premium Middle Eastern Desserts & Drinks',
    description: 'Indulge in premium Middle Eastern desserts at Laza Dessert Cafe. Fresh kunafa, crepes, shakes, and more.',
    images: [`${baseUrl}/default_og.png`],
    creator: '@laza.cafe',
    site: '@lazacafe',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  icons: {
    icon: [
      { url: '/lazabluelogo.png', sizes: '32x32', type: 'image/png' },
      { url: '/lazabluelogo.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/lazabluelogo.png',
    apple: [
      { url: '/lazabluelogo.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/lazabluelogo.png',
        color: '#1B3A6B',
      },
    ],
  },
  manifest: '/manifest.json',
  category: 'food and beverage',
  classification: 'restaurant',
  other: {
    'theme-color': '#1B3A6B',
    'msapplication-TileColor': '#1B3A6B',
    'msapplication-config': '/browserconfig.xml',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Laza Dessert Cafe',
    'application-name': 'Laza Dessert Cafe',
    'mobile-web-app-capable': 'yes',
  },
};
// Primary : #2C4B7E
// Accent : #F1F1F1
// Highlight : #E3B952

// xl:padding-x-20 
// padding-y-20
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="laza-theme" suppressHydrationWarning>
      <head>
        <script src="https://cdn.userway.org/widget.js" data-account="qY0jkg6Ywf"/>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K3WGVNK8');`,
          }}
        />
        {/* End Google Tag Manager */}

        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-7S7ESYHH6J" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-7S7ESYHH6J');
            `,
          }}
        />
        {/* End Google tag (gtag.js) */}

      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${bebas.variable} ${roboto.variable} ${raleway.variable} antialiased w-full overflow-none `}
      >
        {/* Prevent external classes from being added to HTML element - runs on every page */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Function to force the correct className
                function forceCorrectClassName() {
                  if (document.documentElement.className !== 'laza-theme') {
                    document.documentElement.className = 'laza-theme';
                  }
                }
                
                // Run immediately
                forceCorrectClassName();
                
                // Run after a short delay to catch late additions
                setTimeout(forceCorrectClassName, 0);
                setTimeout(forceCorrectClassName, 10);
                setTimeout(forceCorrectClassName, 50);
                setTimeout(forceCorrectClassName, 100);
                
                // Override setAttribute method
                const htmlElement = document.documentElement;
                const originalSetAttribute = htmlElement.setAttribute;
                
                htmlElement.setAttribute = function(name, value) {
                  if (name === 'class' && value.includes('chromane-sonic-dark')) {
                    // Block the external class
                    return;
                  }
                  return originalSetAttribute.call(this, name, value);
                };
                
                // Override className property
                Object.defineProperty(htmlElement, 'className', {
                  set: function(value) {
                    if (value.includes('chromane-sonic-dark')) {
                      // Block the external class
                      return;
                    }
                    this.setAttribute('class', value);
                  },
                  get: function() {
                    return this.getAttribute('class') || 'laza-theme';
                  }
                });
                
                // Override classList.add method
                const originalClassListAdd = htmlElement.classList.add;
                htmlElement.classList.add = function(...classes) {
                  const filteredClasses = classes.filter(cls => !cls.includes('chromane-sonic-dark'));
                  if (filteredClasses.length > 0) {
                    return originalClassListAdd.apply(this, filteredClasses);
                  }
                };
                
                // Override classList.remove method
                const originalClassListRemove = htmlElement.classList.remove;
                htmlElement.classList.remove = function(...classes) {
                  // Always ensure laza-theme stays
                  const result = originalClassListRemove.apply(this, classes);
                  if (!this.className.includes('laza-theme')) {
                    this.className = 'laza-theme';
                  }
                  return result;
                };
                
                // Create a MutationObserver with aggressive monitoring
                const observer = new MutationObserver(function(mutations) {
                  let needsFix = false;
                  mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                      const currentClass = htmlElement.className;
                      if (currentClass.includes('chromane-sonic-dark') || currentClass !== 'laza-theme') {
                        needsFix = true;
                      }
                    }
                  });
                  
                  if (needsFix) {
                    forceCorrectClassName();
                  }
                });
                
                // Start observing with aggressive settings
                observer.observe(htmlElement, {
                  attributes: true,
                  attributeFilter: ['class'],
                  attributeOldValue: true
                });
                
                // Also monitor for any DOM changes
                observer.observe(document, {
                  childList: true,
                  subtree: true
                });
                
                // Periodic check as backup
                setInterval(forceCorrectClassName, 1000);
                
                // Listen for any focus/blur events that might trigger class changes
                document.addEventListener('focusin', forceCorrectClassName);
                document.addEventListener('focusout', forceCorrectClassName);
                
                // Listen for scroll events that might trigger class changes
                document.addEventListener('scroll', forceCorrectClassName, { passive: true });
                
                // Override any global functions that might modify classes
                if (window.document && window.document.documentElement) {
                  const originalSetAttributeGlobal = window.document.documentElement.setAttribute;
                  window.document.documentElement.setAttribute = function(name, value) {
                    if (name === 'class' && value.includes('chromane-sonic-dark')) {
                      return;
                    }
                    return originalSetAttributeGlobal.call(this, name, value);
                  };
                }
              })();
            `,
          }}
        />
        {/* <Script
          id="aioa-adawidget"
          src="https://www.skynettechnologies.com/accessibility/js/all-in-one-accessibility-js-widget-minify.js?colorcode=#420083&token=null&position=bottom_right"
          strategy="lazyOnload"
        /> */}


        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K3WGVNK8"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
