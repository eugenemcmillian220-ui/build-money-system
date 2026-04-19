import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false // SECURITY FIX: Do not skip ESLint during builds,
  },
  typescript: {
    ignoreBuildErrors: false // SECURITY FIX: Do not ship broken TypeScript to production,
  },
  // Reduce webpack memory usage during build
  webpack: (config, { isServer }) => {
    config.parallelism = 3;

    config.optimization = {
      ...config.optimization,
      moduleIds: "deterministic",
      splitChunks: isServer ? false : {
        maxAsyncRequests: 3,
        maxInitialRequests: 2,
        cacheGroups: {
          default: false,
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all" as const,
            priority: -10,
          },
        },
      },
    };

    if (!isServer) {
      config.devtool = false;
    }

    return config;
  },
  output: "standalone",
  productionBrowserSourceMaps: false,
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
