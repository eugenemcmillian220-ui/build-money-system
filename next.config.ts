import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Lint runs in CI separately; skip during build to reduce peak memory on Vercel Hobby (8 GB)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Typecheck runs in CI separately; skip during build to reduce peak memory on Vercel Hobby (8 GB)
    ignoreBuildErrors: true,
  },
  
  // CRITICAL: Memory optimization for Vercel OOM prevention
  // Strategy: Aggressive webpack tuning + lazy prompt loading
  webpack: (config, { isServer }) => {
    // Minimal parallelism to avoid memory spike
    config.parallelism = 1;

    config.resolve = {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        punycode: require.resolve("punycode/"),
      },
    };

    config.optimization = {
      ...config.optimization,
      moduleIds: "deterministic",
      
      // AGGRESSIVE chunk splitting to reduce peak memory
      splitChunks: isServer ? false : {
        maxAsyncRequests: 2,
        maxInitialRequests: 1,
        minSize: 20000,
        minRemainingSize: 0,
        cacheGroups: {
          // Keep vendors small and separate
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all" as const,
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Isolate AI/LLM dependencies to prevent bundling bloat
          ai: {
            test: /[\\/]node_modules[\\/](@openai|openai|stripe|zod)[\\/]/,
            name: "ai-vendors",
            chunks: "all" as const,
            priority: 20,
            reuseExistingChunk: true,
          },
          // Default group
          default: {
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // Disable source maps entirely (major memory saver)
    config.devtool = false;

    // Disable persistent cache to reduce peak memory on constrained build machines
    config.cache = false;

    return config;
  },
  
  output: "standalone",
  productionBrowserSourceMaps: false,
  
  // Externalize heavy server packages to prevent webpack from bundling them.
  // @sentry/node bundles OpenTelemetry instrumentations for prisma, redis, mysql2,
  // mongoose, knex, lru-memoizer — none used here.
  // NOTE: @sentry/nextjs and @opentelemetry/api are auto-transpiled and CANNOT be listed here.
  serverExternalPackages: [
    "@sentry/node",
    "@opentelemetry/instrumentation",
    "@vercel/otel",
  ],
  
  // Experimental memory optimizations
  experimental: {
    webpackMemoryOptimizations: true,
    workerThreads: false,
    cpus: 1,
    optimizePackageImports: [
      "@supabase/supabase-js",
      "stripe",
      "zod",
      "axios",
      "lucide-react",
      "@sentry/nextjs",
      "@opentelemetry/api",
      "highlight.js",
    ],
  },
  
  // Reduce build cache memory footprint
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
