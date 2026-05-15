import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false // SECURITY FIX: Do not skip ESLint during builds,
  },
  typescript: {
    ignoreBuildErrors: false // SECURITY FIX: Do not ship broken TypeScript to production,
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
    if (!isServer) {
      config.devtool = false;
    }

    return config;
  },
  
  output: "standalone",
  productionBrowserSourceMaps: false,
  
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
    ],
  },
  
  // Reduce build cache memory footprint
  onDemandEntries: {
    maxInactiveAge: 15 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
