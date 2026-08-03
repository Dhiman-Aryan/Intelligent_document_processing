import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the dev-only route/bundler indicator overlay — a Next.js
  // development aid, not something end users see (it doesn't appear
  // in production builds either way).
  devIndicators: false,
  // Next.js blocks cross-origin requests to its own dev assets
  // (webpack-hmr, etc.) by default — without this, the page's JS
  // never fully loads when opened through a different host than
  // localhost (e.g. the Cloudflare tunnel used to view this on a
  // phone), so nothing on the page responds to clicks at all, even
  // though the HTML renders fine. Only matters in development —
  // there's no dev server (or this restriction) in a production build.
  allowedDevOrigins: [
    "192.168.1.40",
    "occasions-replied-kenny-trips.trycloudflare.com",
  ],
};

export default nextConfig;
