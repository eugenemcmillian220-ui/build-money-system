import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  typedRoutes: true,
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
    // Prevent webpack from creating too many chunks in parallel
    config.optimization = {
      ...config.optimization,
      moduleIds: "deterministic",
      splitChunks: isServer
        ? false
        : {
            ...config.optimization?.splitChunks,
            maxAsyncRequests: 5,
            maxInitialRequests: 3,
          },
    };
    return config;
  },
  // Reduce build output to save memory
  output: "standalone",
};

export default withSentryConfig(nextConfig, {
  org: "build-money-system-iq",
  project: "httpsbuild-money-system-omd8vercelapp",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    reactComponentAnnotation: {
      enabled: true,
    },
    automaticVercelMonitors: true,
  },
  tunnelRoute: "/monitoring",
});
