"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import clsx from "clsx";
import { Link, useLocation } from "@/lib/router";
import { Button } from "../atoms";
import { nav } from "../tokens";
import type { NavItem } from "./SideBar";

interface TabBarProps {
  /** The navigation's accessible name */
  label: string;
  items: NavItem[];
  /** Whether a tab is the current screen; the default is an exact match of the path */
  isActive?: (path: string, pathname: string) => boolean;
  /** A "More" tab that opens a sheet above the bar; `content` gets a function that closes it */
  more?: { id: string; isActive: boolean; content: (close: () => void) => ReactNode };
}

// The phone's navigation: a bar fixed to the bottom (hidden from `lg` up, where the sidebar has the
// links). Each tab goes straight to a screen; "More" opens a sheet with the rest.
export default function TabBar({ label, items, isActive = (path, current) => path === current, more }: TabBarProps) {
  const { pathname } = useLocation();
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

  const moreActive = moreOpen || Boolean(more?.isActive);

  return (
    <div className="lg:hidden">
      {more && moreOpen && (
        <div
          id={more.id}
          ref={sheetRef}
          className="drawer-panel fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-crimson-light/60 bg-milk px-6 py-3 shadow-2xl shadow-crimson/25"
        >
          {more.content(() => setMoreOpen(false))}
        </div>
      )}

      <nav
        aria-label={label}
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-crimson-light/60 bg-milk/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_-10px] shadow-crimson/35 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-md items-stretch gap-1 px-3 py-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, pathname);
            return (
              <Link key={item.path} to={item.path} aria-current={active ? "page" : undefined} className={nav.tab(active)}>
                <Icon size={22} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {more && (
            <Button
              variant="bare"
              type="button"
              ref={moreRef}
              aria-label="More"
              aria-expanded={moreOpen}
              aria-controls={moreOpen ? more.id : undefined}
              onClick={() => setMoreOpen((open) => !open)}
              className={clsx(nav.tab(moreActive), "flex-col!")}
            >
              <Ellipsis size={22} aria-hidden="true" />
              <span>More</span>
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}
