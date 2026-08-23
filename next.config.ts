import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * Kept as a single source of truth here rather than in middleware, because it
 * needs to reference the same image/media hosts as `images.remotePatterns`.
 *
 * `'unsafe-inline'` on style-src is required by Next's inlined critical CSS,
 * and `'unsafe-eval'` is only enabled in development (React Refresh needs it) —
 * production runs without it.
 */
function contentSecurityPolicy(isDev: boolean): string {
  return [
    "default-src 'self'",
    // GA4 / Meta Pixel are loaded via next/script only when their env ids are set.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://www.google-analytics.com https://www.facebook.com",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://connect.facebook.net",
    // The site is never framed, and never frames anything.
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework version to scanners.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["zustand"],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Order data must never be cached by a proxy or a shared browser.
        source: "/api/orders/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, private" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
