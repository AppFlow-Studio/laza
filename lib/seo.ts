import type { Metadata } from 'next'

// Get the base URL for metadata (works both locally and in production)
const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  return 'https://lazadessert.cafe';
};

const baseUrl = getBaseUrl();

export function getArticleSchema(article: {
  title: string
  description: string
  url: string
  image?: string
  author?: string
  publishedTime?: string
  modifiedTime?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "url": article.url,
    "image": article.image || `${baseUrl}/default_og.png`,
    "author": {
      "@type": "Organization",
      "name": article.author || "Laza Dessert Cafe"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Laza Dessert Cafe",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/lazabluelogo.png`
      }
    },
    "datePublished": article.publishedTime,
    "dateModified": article.modifiedTime || article.publishedTime,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": article.url
    }
  }
}

export function getCafeSchema(location: {
  name: string
  address: {
    streetAddress: string
    addressLocality: string
    addressRegion: string
    postalCode: string
    addressCountry: string
  }
  telephone: string
  openingHours: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    "name": location.name,
    "description": "Premium Middle Eastern desserts including kunafa, crepes, waffles, shakes, and more.",
    "url": baseUrl,
    "logo": `${baseUrl}/lazabluelogo.png`,
    "image": `${baseUrl}/default_og.png`,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": location.address.streetAddress,
      "addressLocality": location.address.addressLocality,
      "addressRegion": location.address.addressRegion,
      "postalCode": location.address.postalCode,
      "addressCountry": location.address.addressCountry
    },
    "telephone": location.telephone,
    "openingHours": location.openingHours,
    "priceRange": "$$",
    "servesCuisine": ["Middle Eastern", "Desserts", "Coffee", "Shakes"],
    "hasMenu": `${baseUrl}/menu`,
    "sameAs": [
      "https://www.instagram.com/lazacafe/?hl=en",
      "https://www.tiktok.com/@lazacafe"
    ]
  }
}

export function createMetadata(metadata: {
  title: string
  description: string
  canonical?: string
  openGraphImage?: string
}): Metadata {
  return {
    title: metadata.title,
    description: metadata.description,
    alternates: {
      canonical: metadata.canonical,
    },
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      url: metadata.canonical ? `${baseUrl}${metadata.canonical}` : baseUrl,
      images: [
        {
          url: metadata.openGraphImage || `${baseUrl}/default_og.png`,
          width: 1200,
          height: 630,
          alt: metadata.title,
        }
      ],
    },
    twitter: {
      title: metadata.title,
      description: metadata.description,
      images: [metadata.openGraphImage || `${baseUrl}/default_og.png`],
    },
  }
}
