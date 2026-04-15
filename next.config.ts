import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Disabled typedRoutes — generates type unions for 78+ routes at build time, causing OOM
  // typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // Reduce webpack memory usage during build
  webpack: (config, { isServer }) => {
    // Limit parallelism to reduce peak memory
    config.parallelism = 5;

    config.optimization = {
      ...config.optimization,
      moduleIds: "deterministic",
      splitChunks: isServer
        ? false
        : {
            ...config.optimization?.splitChunks,
            maxAsyncRequests: 5,
            maxInitialRequests: 3,
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

    // Reduce memory from source maps during build
    if (!isServer) {
      config.devtool = false;
    }

    return config;
  },
  // Reduce build output to save memory
  output: "standalone",
  // Disable source map generation in production build to save memory
  productionBrowserSourceMaps: false,
  // Limit concurrent page builds
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

// Skip Sentry webpack plugin entirely in build to save ~500MB memory
// Sentry still captures runtime errors via sentry.client/server.config.ts
const sentryConfig = withSentryConfig(nextConfig, {
  org: "build-money-system-iq",
  project: "httpsbuild-money-system-omd8vercelapp",
  silent: true,
  widenClientFileUpload: true,
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: true,
  sourcemaps: {
    disable: true,
  },
  tunnelRoute: "/monitoring",
});

export default sentryConfig;
