import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The dev badge covers the phone bottom navigation; build errors still show as an overlay.
  devIndicators: false,
  transpilePackages: ['@restaurant-saas/shared'],
};

export default nextConfig;
