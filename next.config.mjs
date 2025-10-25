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

  // ✅ Skip ESLint completely during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Skip TypeScript type errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Optional: disable specific ESLint rules
  eslintConfig: {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@next/next/no-img-element': 'off',
    },
  },

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
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com https://cdn.onesignal.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https: data: blob:",
              "media-src 'self' https://*.supabase.co data: blob:",
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
              "font-src 'self' https: data:",
              process.env.NODE_ENV === 'production'
                ? "script-src 'self' 'unsafe-inline' https://*.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://cdn.onesignal.com"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://cdn.onesignal.com",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // ✅ Keep your custom alias working
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(process.cwd());
    return config;
  },
};

export default nextConfig;
