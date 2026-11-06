import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Politique de contenu sans risque de casser l'application : interdit l'intégration dans un
  // autre site (clickjacking), les plugins (<object>, <embed>), le détournement de <base> et
  // force le HTTPS des ressources. Les scripts restent gérés par Next.js.
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; upgrade-insecure-requests",
  },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [
    "@quercy/ui",
    "@quercy/core",
    "@quercy/db",
    "@quercy/storage",
    "@quercy/mailer",
    "@quercy/documents",
    "@quercy/reports",
  ],
  serverExternalPackages: ["@prisma/client", "ioredis"],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default config;
