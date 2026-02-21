import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "staticmap.openstreetmap.de",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "staticmap.openstreetmap.fr",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
