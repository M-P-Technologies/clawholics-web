"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useLocation } from "@/lib/router";
import { useSiteTheme } from "../../hooks/useSiteTheme";
import MobileTabBar from "./MobileTabBar";
import Navbar from "./NavBar";
import Footer from "./Footer";

// Screens that end without the site footer.
const NO_FOOTER_PATHS = ["/login", "/signup", "/onboarding", "/profile"];

// On phones the footer is only for the main pages; on every other page (a service, an artist, booking,
// payment, profile, the legal pages...) it is hidden, since the bottom bar has the navigation.
// An exact match, so /artists/3 is not the artists page.
const MOBILE_FOOTER_PATHS = ["/", "/services", "/artists", "/about", "/faq", "/contact"];

// The top bar and footer are built once here and stay on screen while only the page in
// the middle changes, so moving between pages no longer rebuilds (and flashes) them.
export default function SiteLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // The colour set and fonts chosen in Admin > Homepage
  useSiteTheme();
  const showFooter = !NO_FOOTER_PATHS.some((path) => pathname.startsWith(path));
  // On phones the bottom bar covers the foot of the page, so pages without a footer keep room
  // for it. Pages with one don't: the bar slides away when the footer reaches it.
  const footerOnPhones = showFooter && MOBILE_FOOTER_PATHS.includes(pathname);

  return (
    <div
      className={clsx(
        "relative flex min-h-screen flex-col overflow-x-clip",
        !footerOnPhones && "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0",
      )}
    >
      <a
        href="#main-content"
        className="sr-only z-9999 rounded bg-light-orange p-4 text-gray-red focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>

      <Navbar />
      <MobileTabBar />

      <main id="main-content" className="relative flex-1">
        {children}
      </main>

      {showFooter && (
        <div className={footerOnPhones ? undefined : "hidden lg:block"}>
          <Footer />
        </div>
      )}
    </div>
  );
}
