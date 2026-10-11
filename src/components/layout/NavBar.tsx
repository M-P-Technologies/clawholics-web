import { Link, useLocation } from "@/lib/router";
import { useRef, useEffect, useState } from "react";
import { Menu, User, X } from "lucide-react";
import { Show, UserButton, useClerk } from "@clerk/nextjs";
import { useNavIndicator } from "../../hooks/useNavIndicator";
import { useScrolled } from "../../hooks/useScrolled";

import Logo from "../../assets/logo/logo-primary.svg";
import { userButtonAppearance } from "../ui/clerkAppearance";
import Button from "../ui/Button";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/artists", label: "Artists" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeLink = NAV_LINKS.find((link) => link.to === pathname)?.to;
  const { containerRef, setLinkRef, indicator } = useNavIndicator(activeLink);
  const scrolled = useScrolled();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // On every page the bar is see-through at the top and turns solid once the page is
  // scrolled, or while the phone menu is open so its links stay readable.
  const solid = scrolled || menuOpen;
  const clerk = useClerk();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (!menuOpen || !dropdownRef.current) return;
      const target = event.target as Node;
      if (dropdownRef.current.contains(target) || hamburgerRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [menuOpen, setMenuOpen]);

  const desktopLink = (to: string) =>
    `group relative flex items-center gap-2 whitespace-nowrap py-4 text-sm font-medium tracking-wide transition-colors hover:text-crimson ${
      pathname === to ? "text-crimson" : "text-gray-red"
    }`;

  const mobileLink = (to: string) =>
    `py-2 text-sm font-medium tracking-wide ${
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
              to="/profile"
            >
              My profile
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

      {/* MOBILE */}
      <div id="mobile-navigation" className="flex h-16 items-center justify-between px-4 lg:hidden">
        <Link to="/" aria-label="Go to Clawholics by Max homepage">
          <Logo className="h-11 w-11 text-crimson" aria-hidden="true" focusable="false" />
        </Link>

        <Button
          variant="bare"
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          ref={hamburgerRef}
          className="p-2 text-gray-red"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </Button>
      </div>

      {/* MOBILE DROPDOWN */}
      <div
        id="mobile-menu"
        ref={dropdownRef}
        className={`overflow-hidden bg-light-orange transition-all duration-300 ease-in-out lg:hidden ${
          menuOpen ? "max-h-screen border-t border-crimson-light/70 px-4 py-4" : "max-h-0"
        }`}
      >
        <div className="flex flex-col">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className={mobileLink(to)} onClick={() => setMenuOpen(false)}>
              {label}
            </Link>
          ))}

          <div className="my-4 border-t border-crimson-light/70" />

          <Show when="signed-out">
            <Link className={mobileLink("/login")} to="/login" onClick={() => setMenuOpen(false)}>
              Log in
            </Link>
            <Link className={mobileLink("/signup")} to="/signup" onClick={() => setMenuOpen(false)}>
              Sign up
            </Link>
          </Show>

          <Show when="signed-in">
            <Link className={mobileLink("/profile")} to="/profile" onClick={() => setMenuOpen(false)}>
              My profile
            </Link>
            <Button
              variant="bare"
              type="button"
              className="py-2 text-left text-sm text-gray-red/80 transition-colors hover:text-crimson"
              onClick={() => {
                clerk.openUserProfile();
                setMenuOpen(false);
              }}
            >
              Manage account
            </Button>
            <Button
              variant="bare"
              type="button"
              className="py-2 text-left text-sm text-gray-red/80 transition-colors hover:text-crimson"
              onClick={async () => {
                await clerk.signOut();
                setMenuOpen(false);
                window.location.href = "/";
              }}
            >
              Log out
            </Button>
          </Show>

          <Link
            to="/services"
            onClick={() => setMenuOpen(false)}
            className="mt-4 rounded-md bg-crimson px-4 py-2 text-center text-sm font-medium tracking-wide text-light-orange"
          >
            Book an appointment
          </Link>
        </div>
      </div>
    </nav>
  );
}
