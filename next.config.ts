import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // @ts-expect-error: nodeMiddleware exists at runtime but not yet in ExperimentalConfig types
    nodeMiddleware: true,
  },
  webpack: (config) => {
    // pdf-parse uses fs module
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
