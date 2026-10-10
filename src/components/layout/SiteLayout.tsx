"use client";

import type { ReactNode } from "react";
import { useLocation } from "@/lib/router";
import Navbar from "./NavBar";
import Footer from "./Footer";

// Screens that end without the site footer.
const NO_FOOTER_PATHS = ["/login", "/signup", "/onboarding"];

// The top bar and footer are built once here and stay on screen while only the page in
// the middle changes, so moving between pages no longer rebuilds (and flashes) them.
export default function SiteLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const showFooter = !NO_FOOTER_PATHS.some((path) => pathname.startsWith(path));

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <a
        href="#main-content"
        className="sr-only z-9999 rounded bg-light-orange p-4 text-gray-red focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" className="relative flex-1">
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  );
}
