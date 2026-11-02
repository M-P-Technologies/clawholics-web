import { Link, useLocation } from "@/lib/router";
import { User } from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import { useNavIndicator } from "../../hooks/useNavIndicator";
import { useScrolled } from "../../hooks/useScrolled";

import SiteLogo from "./SiteLogo";
import { useSiteNav } from "../../hooks/useSiteNav";
import { userButtonAppearance } from "@/lib/clerkAppearance";
import { Button } from "@/components/atoms";
import { CLIENT_PATHS } from "../../lib/client/clientNav";
import { BACK_SLOT_ID } from "./BackButton";

// The round account button: Log in when signed out, My account (phones) when signed in
const ACCOUNT_ICON =
  "flex h-9 w-9 items-center justify-center rounded-full border border-crimson text-crimson-ink transition-colors hover:bg-crimson hover:text-on-crimson focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson";

export default function Navbar() {
  const { pathname } = useLocation();
  const { links: NAV_LINKS, navLogo, book } = useSiteNav();
  const activeLink = NAV_LINKS.find((link) => link.to === pathname)?.to;
  const { containerRef, setLinkRef, indicator } = useNavIndicator(activeLink);
  const scrolled = useScrolled();

  // On every page the bar is see-through at the top and turns solid once the page is scrolled
  const solid = scrolled;
  const desktopLink = (to: string) =>
    `group relative flex items-center gap-3 whitespace-nowrap py-3 text-sm font-medium tracking-wide transition-colors hover:text-crimson-ink ${
      pathname === to ? "text-crimson-ink" : "text-gray-red"
    }`;

  return (
    <nav
      aria-label="Main navigation"
      className={`fixed left-0 top-0 z-50 w-full border-b transition-colors duration-300 motion-reduce:transition-none ${
        solid
          ? "border-crimson-light/70 bg-light-orange/85 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      {/* DESKTOP */}
      <div className="mx-auto hidden h-16 w-full max-w-6xl items-center justify-between gap-9 px-9 lg:flex">
        <Link to="/" aria-label="Go to Clawholics by Max homepage" className="w-fit shrink-0">
          <SiteLogo src={navLogo} />
        </Link>

        <div ref={containerRef} className="relative flex items-center gap-9">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              ref={setLinkRef(to)}
              to={to}
              className={desktopLink(to)}
              aria-current={pathname === to ? "page" : undefined}
            >
              {label}
            </Link>
          ))}

          {/* One underline that slides to whichever link is active */}
          {indicator && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 h-0.5 bg-crimson transition-[left,width] duration-300 ease-out motion-reduce:transition-none"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Show when="signed-out">
            <Link aria-label="Log in" title="Log in" className={ACCOUNT_ICON} to="/login">
              <User size={18} aria-hidden="true" />
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              className="whitespace-nowrap text-sm font-medium tracking-wide text-gray-red transition-colors hover:text-crimson-ink"
              to={CLIENT_PATHS.home}
            >
              My account
            </Link>
            <div className="flex items-center justify-center rounded-full border border-crimson p-0.5">
              <UserButton appearance={userButtonAppearance} />
            </div>
          </Show>
          <Button to="/services" variant={solid ? "secondary" : "primary"}>
            {book}
          </Button>
        </div>
      </div>

      {/* MOBILE: the logo on the left; on the right the page's back button when it has one (BackButton
          portals into the slot) and the account button. The links are in the tab bar at the bottom
          (MobileTabBar). */}
      <div className="flex h-16 items-center justify-between gap-3 px-3 lg:hidden">
        <Link to="/" aria-label="Go to Clawholics by Max homepage">
          <SiteLogo src={navLogo} />
        </Link>
        <div className="flex items-center gap-3">
          <div id={BACK_SLOT_ID} className="flex items-center" />
          <Show when="signed-out">
            <Link aria-label="Log in" title="Log in" className={ACCOUNT_ICON} to="/login">
              <User size={18} aria-hidden="true" />
            </Link>
          </Show>
          <Show when="signed-in">
            <Link aria-label="My account" title="My account" className={ACCOUNT_ICON} to={CLIENT_PATHS.home}>
              <User size={18} aria-hidden="true" />
            </Link>
          </Show>
        </div>
      </div>
    </nav>
  );
}
