// next.config.ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // This disables ESLint blocking the build on Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Also allow TypeScript builds to proceed even if there are errors
  typescript: {
    ignoreBuildErrors: true,
  },

  // Add the @ alias for cleaner imports
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;
