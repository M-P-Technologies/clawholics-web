import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Gloock, Luxurious_Script, Noto_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/ui/ToastProvider";
import ScrollToTop from "@/components/layout/ScrollToTop";
import "./globals.css";

// Brand fonts. Loaded here instead of a CSS @import, which Turbopack drops from the output,
// leaving the browser on its serif/sans fallbacks. globals.css maps these variables to
// Tailwind's font-display, font-script and font-sans.
const display = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-gloock", display: "swap" });
const script = Luxurious_Script({ subsets: ["latin"], weight: "400", variable: "--font-luxurious-script", display: "swap" });
const sans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-noto-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clawholics by Max",
  description:
    "Clawholics by Max is a nail art studio. Browse our services, meet our artists and book your appointment online.",
  icons: { icon: { url: "/bow.svg", type: "image/svg+xml" } },
};

export const viewport: Viewport = {
  themeColor: "#f6e9e1",
};

const localization = {
  signIn: {
    start: {
      title: "Sign in to Clawholics",
      subtitle: "Welcome back! Please sign in to continue.",
      actionButton: "CONTINUE",
    },
  },
  signUp: {
    start: {
      title: "Create your account",
      subtitle: "Please fill in the details to get started.",
      actionButton: "CONTINUE",
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${script.variable} ${sans.variable}`}>
      <body suppressHydrationWarning>
        <ClerkProvider localization={localization} signInUrl="/login" signUpUrl="/signup" afterSignOutUrl="/">
          <ToastProvider>
            <ScrollToTop />
            {children}
          </ToastProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
