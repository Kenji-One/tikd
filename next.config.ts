// next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // your own host is same-origin, but we whitelist the external dicebear API too
    domains: ["api.dicebear.com", "localhost", "res.cloudinary.com"],
    // if you still use remotePatterns for DiceBear…
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        port: "",
        pathname: "/9.x/rings/svg",
      },
    ],

    // 🔓 allow Next/Image to proxy SVG content
    dangerouslyAllowSVG: true,
  },
};

export default nextConfig;
