import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarPlus, Ellipsis, House, Sparkles, Users } from "lucide-react";
import { Show, useClerk } from "@clerk/nextjs";
import clsx from "clsx";
import { Link, useLocation } from "@/lib/router";
import { useScrolled } from "../../hooks/useScrolled";
import { Button } from "@/components/atoms";
import { CLIENT_PATHS } from "../../lib/client/clientNav";

// The phone's main navigation: a bar fixed to the bottom of the screen (hidden from `lg` up,
// where the top bar has the links). Four tabs go straight to a page and the middle one starts a
// booking; "More" opens a small sheet with the rest.
// How far the home page must be scrolled before the bar slides up. Until then the hero has the
// whole screen. (The floating Facebook button uses the same value to drop into the corner.)
export const TAB_BAR_REVEAL_PX = 40;

const MORE_PATHS = ["/about", "/faq", "/contact", "/login", "/signup"];

const tabClass = (active: boolean) =>
  clsx(
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium tracking-wide transition-colors",
    active ? "text-crimson-ink" : "text-gray-red hover:text-crimson-ink",
  );

const sheetLink = (active: boolean) =>
  clsx("block py-3 text-sm font-medium tracking-wide", active ? "text-crimson-ink" : "text-gray-red");

export default function MobileTabBar() {
  const { pathname } = useLocation();
  const clerk = useClerk();
  const [moreOpen, setMoreOpen] = useState(false);
  const scrolled = useScrolled(TAB_BAR_REVEAL_PX);
  // The footer has the links too, so the bar steps aside once the footer reaches it
  const [footerReached, setFooterReached] = useState(false);
  // Only the home page hides it, while its hero is still on screen; every other page shows it
  const visible = (pathname !== "/" || scrolled) && !footerReached;

  useEffect(() => {
    const footer = document.querySelector("footer");
    setFooterReached(false);
    if (!footer || typeof IntersectionObserver === "undefined") return;
    // The bottom margin is the bar's height: the footer counts as reached when it gets to the bar
    const observer = new IntersectionObserver(([entry]) => setFooterReached(entry.isIntersecting), {
      rootMargin: "0px 0px -64px 0px",
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, [pathname]);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);

  // Every move to another page closes the sheet, and so does the bar sliding out of view
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!visible) setMoreOpen(false);
  }, [visible]);

  useEffect(() => {
    if (!moreOpen) return;
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (sheetRef.current?.contains(target) || moreRef.current?.contains(target)) return;
      setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", outside);
    document.addEventListener("touchstart", outside, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("touchstart", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const tab = (to: string, label: string, icon: ReactNode) => (
    <Link to={to} aria-current={pathname === to ? "page" : undefined} className={tabClass(pathname === to)}>
      {icon}
      <span>{label}</span>
    </Link>
  );

  const moreActive = moreOpen || MORE_PATHS.includes(pathname);

  return (
    <div className="lg:hidden">
      {moreOpen && visible && (
        <div
          id="more-menu"
          ref={sheetRef}
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 max-h-[70vh] overflow-y-auto border-t border-crimson-light/70 bg-light-orange px-3 py-2 shadow-2xl shadow-crimson/20 drawer-panel"
        >
          <Link to="/about" className={sheetLink(pathname === "/about")}>About Us</Link>
          <Link to="/faq" className={sheetLink(pathname === "/faq")}>FAQ</Link>
          <Link to="/contact" className={sheetLink(pathname === "/contact")}>Contact Us</Link>

          <div className="my-2 border-t border-crimson-light/70" />

          <Show when="signed-out">
            {/* One entry: the page has a Login | Sign up switch at the top */}
            <Link to="/login" className={sheetLink(pathname === "/login" || pathname === "/signup")}>Account</Link>
          </Show>

          <Show when="signed-in">
            <Link to={CLIENT_PATHS.home} className={sheetLink(false)}>My account</Link>
            <Button
              variant="bare"
              type="button"
              className="block w-full py-3 text-left text-sm text-gray-red transition-colors hover:text-crimson-ink"
              onClick={() => {
                clerk.openUserProfile();
                setMoreOpen(false);
              }}
            >
              Manage account
            </Button>
            <Button
              variant="bare"
              type="button"
              className="block w-full py-3 text-left text-sm text-gray-red transition-colors hover:text-crimson-ink"
              onClick={async () => {
                await clerk.signOut();
                setMoreOpen(false);
                window.location.href = "/";
              }}
            >
              Log out
            </Button>
          </Show>
        </div>
      )}

      <nav
        aria-label="Mobile navigation"
        inert={!visible}
        className={clsx(
          "fixed inset-x-0 bottom-0 z-40 border-t border-crimson-light/70 bg-light-orange/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_-6px] shadow-crimson/20 backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none",
          // the extra 2rem also hides the Book button, which stands above the bar
          visible ? "translate-y-0" : "translate-y-[calc(100%+2rem)]",
        )}
      >
        <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
          {tab("/", "Home", <House size={22} aria-hidden="true" />)}
          {tab("/services", "Services", <Sparkles size={22} aria-hidden="true" />)}

          <Link
            to="/services"
            aria-label="Book an appointment"
            className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold tracking-wide text-crimson-ink"
          >
            <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-crimson text-on-crimson shadow-lg shadow-crimson/30">
              <CalendarPlus size={22} aria-hidden="true" />
            </span>
            <span>Book</span>
          </Link>

          {tab("/artists", "Artists", <Users size={22} aria-hidden="true" />)}

          <Button
            variant="bare"
            type="button"
            ref={moreRef}
            aria-label="More"
            aria-expanded={moreOpen}
            aria-controls="more-menu"
            onClick={() => setMoreOpen((open) => !open)}
            className={clsx(tabClass(moreActive), "!flex-col")}
          >
            <Ellipsis size={22} aria-hidden="true" />
            <span>More</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
