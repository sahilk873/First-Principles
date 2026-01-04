import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
  },
  // Ensure proper output for Vercel
  output: undefined, // Let Vercel handle this automatically
  // Fix workspace root warning (if needed)
  // This is optional - only needed if you have multiple lockfiles at different levels
};

export default nextConfig;
