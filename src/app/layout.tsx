import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/molecules";
import ScrollToTop from "@/components/layout/ScrollToTop";
import { clerkLocalization } from "@/lib/clerkAppearance";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clawholics by Max",
  description:
    "Clawholics by Max is a nail art studio. Browse our services, meet our artists and book your appointment online.",
  icons: { icon: { url: "/bow.svg", type: "image/svg+xml" } },
};

export const viewport: Viewport = {
  themeColor: "#f6e9e1",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body suppressHydrationWarning>
        <ClerkProvider localization={clerkLocalization} signInUrl="/login" signUpUrl="/signup" afterSignOutUrl="/">
          <ToastProvider>
            <ScrollToTop />
            {children}
          </ToastProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
