import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false // SECURITY FIX: Do not skip ESLint during builds,
  },
  typescript: {
    ignoreBuildErrors: false // SECURITY FIX: Do not ship broken TypeScript to production,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.devtool = false;
    }

    return config;
  },
  output: "standalone",
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "openai", "stripe", "zod"],
    webpackBuildWorker: false,
  },
};

export default nextConfig;
