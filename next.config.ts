// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // ✅ Next 15+ prefers remotePatterns over domains
    remotePatterns: [
      // DiceBear (SVG)
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/9.x/**",
      },

      // Cloudinary
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],

    // 🔓 allow SVG (only if you truly need it)
    dangerouslyAllowSVG: true,

    // ✅ recommended when allowing SVG (prevents script execution inside SVGs)
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
