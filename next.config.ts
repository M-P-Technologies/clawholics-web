import type { NextConfig } from "next";

// The browser only talks to this origin's /api. Paths with a route file under app/api are
// answered by Next (see src/server/worker.ts); every other /api path falls back to the
// Cloudflare Worker, so no Worker CORS changes are needed for Vercel previews.
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    // Where uploaded photos live (R2, and the old Worker's uploads), so next/image can resize them
    remotePatterns: [
      { protocol: "https", hostname: "images.clawholicsbymax.com" },
      { protocol: "https", hostname: "clawholics-api-staging.clawholicsdev.workers.dev" },
    ],
  },
  turbopack: {
    rules: {
      // SVGs import as React components (replaces vite-plugin-svgr's `?react` imports).
      "*.svg": {
        loaders: [
          {
            loader: "@svgr/webpack",
            options: {
              // svgo's default strips the viewBox, so an icon can't scale to its CSS size
              // and gets cropped instead (e.g. the bow). Keep it.
              svgoConfig: {
                plugins: [{ name: "preset-default", params: { overrides: { removeViewBox: false } } }],
              },
            },
          },
        ],
        as: "*.js",
      },
    },
  },
  async redirects() {
    // Pages that moved; keep old links and bookmarks working
    return [
      // The client's pages moved into the client app (/my); the query (e.g. ?appointment_id=) is kept
      { source: "/profile", destination: "/my/profile", permanent: true },
      { source: "/booking", destination: "/my/book", permanent: true },
      { source: "/payment", destination: "/my/payment", permanent: true },
      { source: "/payment-confirmation", destination: "/my/confirmation", permanent: true },
      { source: "/reschedule", destination: "/my/reschedule", permanent: true },
      { source: "/team", destination: "/artists", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      // The service page used to live at /appointment/<id>
      { source: "/appointment/:id", destination: "/services/:id", permanent: true },
      // The Client Directory and Appointments screens became one: Clients & Appointments (the
      // query, e.g. ?status=PENDING or ?view=leads, is kept)
      { source: "/client-directory", destination: "/clients", permanent: true },
      { source: "/appointments", destination: "/clients", permanent: true },
      // Admin screens used to live at /AS_<Name>
      { source: "/AS_AboutUs", destination: "/about-us", permanent: true },
      { source: "/AS_AdminDirectory", destination: "/admin-directory", permanent: true },
      { source: "/AS_AdminScanner", destination: "/admin-scanner", permanent: true },
      { source: "/AS_Appointments", destination: "/clients", permanent: true },
      { source: "/AS_ClientDirectory", destination: "/clients", permanent: true },
      { source: "/AS_ContactUs", destination: "/contact-info", permanent: true },
      { source: "/AS_FAQs", destination: "/faqs", permanent: true },
      { source: "/AS_Homepage", destination: "/homepage", permanent: true },
      { source: "/AS_NailArtists", destination: "/nail-artists", permanent: true },
      { source: "/AS_NailServices", destination: "/nail-services", permanent: true },
      { source: "/AS_Schedule", destination: "/schedule", permanent: true },
      { source: "/AS_TermsAndConditions", destination: "/terms-and-conditions", permanent: true },
    ];
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    // `fallback` runs after all app routes (static and dynamic), so route handlers win.
    return { beforeFiles: [], afterFiles: [], fallback: [{ source: "/api/:path*", destination: `${apiProxyTarget}/:path*` }] };
  },
};

export default nextConfig;
