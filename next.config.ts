import type { NextConfig } from "next";

const config: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        parallelism: 1,
        minimize: true,
        usedExports: true,
        sideEffects: false,
        concatenateModules: true,
      };
    }

    config.resolve = {
      ...config.resolve,
      alias: {
        "@": "/src",
      },
    };

    return config;
  },
  experimental: {
    optimizePackageImports: ["@icons-pack/react-simple-icons"],
    turbopack: false,
  },
  compress: true,
  swcMinify: true,
};

export default config;
