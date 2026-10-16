"use client";

import { Settings } from "lucide-react";
import clsx from "clsx";
import { Link, useLocation } from "@/lib/router";

// The salon's settings, as a gear beside the bell in the top bar (it has no place in the menus)
export default function SettingsLink() {
  const { pathname } = useLocation();
  const active = pathname === "/settings";
  return (
    <Link
      to="/settings"
      aria-label="Settings"
      title="Settings"
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-crimson-light text-berry transition-colors hover:bg-crimson-light/30 focus-visible:outline-2 focus-visible:outline-crimson",
        active && "bg-crimson-light/45",
      )}
    >
      <Settings size={17} aria-hidden="true" />
    </Link>
  );
}
