import type { NextConfig } from "next";

// The browser only talks to this origin's /api. Paths with a route file under app/api are
// answered by Next (see src/server/worker.ts); every other /api path falls back to the
// Cloudflare Worker, so no Worker CORS changes are needed for Vercel previews.
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      // SVGs import as React components (replaces vite-plugin-svgr's `?react` imports).
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    // `fallback` runs after all app routes (static and dynamic), so route handlers win.
    return { beforeFiles: [], afterFiles: [], fallback: [{ source: "/api/:path*", destination: `${apiProxyTarget}/:path*` }] };
  },
};

export default nextConfig;
