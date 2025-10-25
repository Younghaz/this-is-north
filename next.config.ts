import path from "path";
import { fileURLToPath } from "url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ Allow Vercel builds to pass even if there are lint warnings
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // ✅ Fix for @/* path aliases
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;
