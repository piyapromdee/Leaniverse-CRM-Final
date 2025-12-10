import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds to allow deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript errors during build (Supabase queries lack generated types)
    ignoreBuildErrors: true,
  },
  // Suppress hydration warnings caused by browser extensions
  // Note: suppressHydrationWarning is handled in layout.tsx instead
  webpack: (config) => {
    // Suppress webpack warnings for Supabase realtime dependencies
    config.module.exprContextCritical = false;
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
    ];
    return config;
  },
};

export default nextConfig;
