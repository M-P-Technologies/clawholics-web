import { Link, useLocation } from "@/lib/router";
import { User } from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
import { useNavIndicator } from "../../hooks/useNavIndicator";
import { useScrolled } from "../../hooks/useScrolled";

import Logo from "../../assets/logo/logo-primary.svg";
import { userButtonAppearance } from "@/lib/clerkAppearance";
import { Button } from "@/components/atoms";
import { CLIENT_PATHS } from "../../lib/client/clientNav";
import { BACK_SLOT_ID } from "./BackButton";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/artists", label: "Artists" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const activeLink = NAV_LINKS.find((link) => link.to === pathname)?.to;
  const { containerRef, setLinkRef, indicator } = useNavIndicator(activeLink);
  const scrolled = useScrolled();

  // On every page the bar is see-through at the top and turns solid once the page is scrolled
  const solid = scrolled;
  const desktopLink = (to: string) =>
    `group relative flex items-center gap-2 whitespace-nowrap py-4 text-sm font-medium tracking-wide transition-colors hover:text-crimson ${
      pathname === to ? "text-crimson" : "text-gray-red"
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
      <div className="mx-auto hidden h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-8 px-8 lg:grid">
        <Link to="/" aria-label="Go to Clawholics by Max homepage" className="w-fit">
          <Logo className="h-11 w-11 text-crimson" aria-hidden="true" focusable="false" />
        </Link>

        <div ref={containerRef} className="relative flex items-center gap-8">
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

        <div className="flex items-center justify-end gap-4">
          <Show when="signed-out">
            <Link
              aria-label="Log in"
              title="Log in"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-crimson text-crimson transition-colors hover:bg-crimson hover:text-light-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
              to="/login"
            >
              <User size={18} aria-hidden="true" />
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              className="whitespace-nowrap text-sm font-medium tracking-wide text-gray-red transition-colors hover:text-crimson"
              to={CLIENT_PATHS.home}
            >
              My account
            </Link>
            <div className="flex items-center justify-center rounded-full border border-crimson p-0.5">
              <UserButton appearance={userButtonAppearance} />
            </div>
          </Show>
          <Button to="/services" variant={solid ? "secondary" : "primary"}>
            Book now
          </Button>
        </div>
      </div>

      {/* MOBILE: the logo, and on the right the page's back button when it has one (BackButton
          portals into the slot). The links are in the tab bar at the bottom (MobileTabBar). */}
      <div className="flex h-16 items-center justify-between px-4 lg:hidden">
        <Link to="/" aria-label="Go to Clawholics by Max homepage">
          <Logo className="h-11 w-11 text-crimson" aria-hidden="true" focusable="false" />
        </Link>
        <div id={BACK_SLOT_ID} className="flex items-center" />
      </div>
    </nav>
  );
}
