"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useLocation } from "@/lib/router";
import { useSiteTheme } from "../../hooks/useSiteTheme";
import { isInnerScreen } from "../../lib/client/clientNav";
import ClientSideBar from "./ClientSideBar";
import ClientTabBar from "./ClientTabBar";

// The client app's frame: the sidebar on a computer, the bottom tabs on a phone (not on a service's
// page or the booking steps, which have a back arrow instead). The site's colours and fonts apply.
export default function ClientShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useSiteTheme();
  const inner = isInnerScreen(pathname);

  return (
    <div className="min-h-screen bg-light-orange text-gray-red lg:flex">
      <ClientSideBar />
      <main id="main-content" className={clsx("min-w-0 flex-1", !inner && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0")}>
        {children}
      </main>
      {!inner && <ClientTabBar />}
    </div>
  );
}
