import type { NextConfig } from 'next'
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.djs68.com' },
      { protocol: 'https', hostname: '**.djs-bousaada.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '192.168.1.250' },
      { protocol: 'https', hostname: '192.168.1.240' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
    unoptimized: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
