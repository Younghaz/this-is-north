import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },

  // ✅ Keep your custom allowed dev origins
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://192.168.62.127:3000',
    'http://192.168.62.127:3001',
  ],

  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),

  // ✅ Add CSP and security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Allow Supabase APIs and websockets
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com",
              // Allow inline styles (for rich text blocks)
              "style-src 'self' 'unsafe-inline'",
              // Allow images and media from Supabase/public, data, and blob
              "img-src 'self' https: data: blob:",
              "media-src 'self' https://*.supabase.co data: blob:",
              // ✅ Allow YouTube embeds
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
              // Fonts
              "font-src 'self' https: data:",
              // ✅ Scripts (safe baseline + analytics/ads)
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
