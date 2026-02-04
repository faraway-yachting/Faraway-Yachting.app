import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,    // 30 seconds for dynamic content
      static: 3600,   // 1 hour for static content
    },
  },
  headers: async () => [
    {
      // Disable cache for API routes only
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Pragma', value: 'no-cache' },
        { key: 'Expires', value: '0' },
      ],
    },
    {
      // Allow private caching for app pages - browser can cache for 1 minute
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      headers: [
        { key: 'Cache-Control', value: 'private, max-age=60, stale-while-revalidate=30' },
      ],
    },
  ],
};

export default nextConfig;
