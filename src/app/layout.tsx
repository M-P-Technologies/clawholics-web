import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/molecules";
import QueryProvider from "@/components/providers/QueryProvider";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { clerkLocalization } from "@/lib/clerkAppearance";
import { fontVariables } from "@/lib/fonts";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

// The defaults every page starts from; each public page sets its own title, description and
// canonical address (lib/seo.ts, through its segment's layout.tsx). The link preview image is
// public/og_image.png cropped to 1200x630 as a small JPEG, since WhatsApp skips large ones.
export const metadata: Metadata = {
  // Link previews and canonical links need full addresses; NEXT_PUBLIC_SITE_URL overrides it on
  // a preview deployment
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // The bow: SVG for browsers that take it, favicon.ico (16/32/48 px) for the rest and for search
  // results, and a 180px PNG on cream for a phone's home screen
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/bow.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION, locale: "en_PH", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION, images: [OG_IMAGE] },
  // Google Search Console's HTML-tag check: the code from its "HTML tag" option
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#f6e9e1",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body suppressHydrationWarning>
        <ClerkProvider localization={clerkLocalization} signInUrl="/login" signUpUrl="/signup" afterSignOutUrl="/">
          <QueryProvider>
            <ToastProvider>
              <ScrollToTop />
              {children}
            </ToastProvider>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
