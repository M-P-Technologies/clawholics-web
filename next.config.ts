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
  // No "X-Powered-By: Next.js" header telling visitors what the site runs on
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // HTTPS only: browsers that have seen the site go straight to https:// for the next two
          // years (Vercel already redirects http to https). Not includeSubDomains: that would
          // also lock out any subdomain still served over http. Ignored on http://localhost.
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          // Only this site may show its pages in a frame (the admin's live preview does), so
          // another site can't overlay it to trick clicks; no plugins; no <base> hijacking.
          // Scripts, styles and images aren't restricted here: Clerk, Xendit, Google Maps and
          // Fonts load from their own domains, and Next's inline scripts would need nonces.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Files are used as the type the server says, never guessed (an upload can't turn into a page)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Other sites see only that a visitor came from clawholicsbymax.com, not which page
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The camera only for this site (the stamp scanner); no microphone or location
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    // Pages that moved; keep old links and bookmarks working
    return [
      // The client's pages moved into the client app (/my); the query (e.g. ?appointment_id=) is kept
      { source: "/profile", destination: "/my/profile", permanent: true },
      // The client app's service page is gone: Explore opens the service in its panel (or phone sheet)
      { source: "/my/explore/:id", destination: "/my/explore?service=:id", permanent: true },
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
