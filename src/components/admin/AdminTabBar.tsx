import { useEffect, useRef, useState } from "react";
import { CalendarCheck, CalendarDays, Ellipsis, LayoutDashboard, QrCode, type LucideIcon } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import clsx from "clsx";
import { Link, useLocation } from "@/lib/router";
import Button from "../ui/Button";
import { MORE_GROUPS, MORE_ITEMS, TAB_ITEMS } from "./adminNav";

// The phone's admin navigation: a bar fixed to the bottom (hidden from `lg` up, where the
// sidebar has the links). Four tabs go straight to the screens used every day; "More" opens a
// sheet with the content screens, the admin directory and the account actions.
const TAB_ICONS: Record<string, LucideIcon> = {
  "/clients": CalendarCheck,
  "/schedule": CalendarDays,
  "/admin-scanner": QrCode,
  "/dashboard": LayoutDashboard,
};

const tabClass = (active: boolean) =>
  clsx(
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-medium tracking-wide transition-colors",
    active ? "bg-crimson-light/40 text-berry" : "text-gray-red hover:text-berry",
  );

const sheetLink = (active: boolean) =>
  clsx("block py-3 text-sm font-medium tracking-wide", active ? "text-crimson" : "text-gray-red");

export default function AdminTabBar() {
  const { pathname } = useLocation();
  const clerk = useClerk();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);

  // Every move to another screen closes the sheet
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

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

  const moreActive = moreOpen || MORE_ITEMS.some((item) => item.path === pathname);

  const logout = async () => {
    setMoreOpen(false);
    try {
      await clerk.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="lg:hidden">
      {moreOpen && (
        <div
          id="admin-more-menu"
          ref={sheetRef}
          className="drawer-panel fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-crimson-light/60 bg-milk px-5 py-3 shadow-2xl shadow-crimson/25"
        >
          {MORE_GROUPS.map((group) => (
            <section key={group.title} aria-label={group.title} className="pb-1">
              <h2 className="pb-1 pt-3 font-display text-lg font-normal text-gray-red/70">{group.title}</h2>
              {group.items.map((item) => (
                <Link key={item.path} to={item.path} className={sheetLink(pathname === item.path)}>
                  {item.label}
                </Link>
              ))}
            </section>
          ))}

          <div className="my-2 border-t border-crimson-light/70" />

          <Button
            variant="bare"
            type="button"
            className="block w-full py-3 text-left text-sm text-gray-red/80 transition-colors hover:text-crimson"
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
            className="block w-full py-3 text-left text-sm text-gray-red/80 transition-colors hover:text-crimson"
            onClick={logout}
          >
            Log out
          </Button>
        </div>
      )}

      <nav
        aria-label="Admin tabs"
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-crimson-light/60 bg-milk/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_-10px] shadow-crimson/35 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-md items-stretch gap-1 px-3 py-1.5">
          {TAB_ITEMS.map((item) => {
            const Icon = TAB_ICONS[item.path];
            const active = pathname === item.path;
            return (
              <Link key={item.path} to={item.path} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                <Icon size={22} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <Button
            variant="bare"
            type="button"
            ref={moreRef}
            aria-label="More"
            aria-expanded={moreOpen}
            aria-controls={moreOpen ? "admin-more-menu" : undefined}
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
