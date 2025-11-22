import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'laza-dessert-cafe.b-cdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      }
    ],
  },
  async redirects() {
    return [
      // Location stubs (until pages exist)
      { source: '/brooklyn', destination: '/', permanent: true },
      { source: '/queens', destination: '/', permanent: true },

      // Category stubs (normalize to /menu) - but NOT /menu itself
      { source: '/menu/:slug+', destination: '/menu', permanent: true },

      // Checkout redirect until Toast is ready
      { source: '/checkout', destination: '/menu', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
};

export default nextConfig;
