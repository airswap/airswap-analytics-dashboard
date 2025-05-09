/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable webpack caching during development to prevent ENOENT errors
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig; 