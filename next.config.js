/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => config, // keep existing Webpack config
  turbopack: false,           // disable Turbopack
};

module.exports = nextConfig;
