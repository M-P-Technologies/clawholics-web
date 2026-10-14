"use client";

import clsx from "clsx";
import { Link, useLocation } from "@/lib/router";
import { CLIENT_TABS, isTabActive } from "../../lib/client/clientNav";

// The phone's bottom tabs (hidden from `lg` up, where the sidebar has them)
export default function ClientTabBar() {
  const { pathname } = useLocation();
  return (
    <div className="lg:hidden">
      <nav
        aria-label="App tabs"
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-crimson-light/60 bg-milk/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_-10px] shadow-crimson/35 backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 max-w-md items-stretch gap-1 px-3 py-1.5">
          {CLIENT_TABS.map((tab) => {
            const active = isTabActive(tab, pathname);
            return (
              <Link
                key={tab.href}
                to={tab.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-medium tracking-wide transition-colors",
                  active ? "text-crimson" : "text-gray-red/70 hover:text-berry",
                )}
              >
                <tab.Icon size={22} aria-hidden="true" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
