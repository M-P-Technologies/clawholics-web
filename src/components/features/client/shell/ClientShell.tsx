"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft, LogOut } from "lucide-react";
import { useLocation } from "@/lib/router";
import { Button } from "@/components/atoms";
import { AppShell, SideBar, TabBar } from "@/components/organisms";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import { useClientWideLayout } from "@/hooks/useMinWidth";
import { CLIENT_PHONE_TABS, CLIENT_TABS, isInnerScreen, isTabActive } from "@/lib/client/clientNav";


// The client app's frame: the library's shell with the four tabs, back to the site and log out.
// The site's colours and fonts apply here (not in the admin). Phones get the tab bar; from `sm` the
// sidebar shows instead, kept to its icon rail below `lg` (a tablet has no room for the full one).
export default function ClientShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { signOut } = useClerk();
  useSiteTheme();
  const wide = useClientWideLayout();
  const active = (path: string, current: string) => isTabActive(CLIENT_TABS.find((t) => t.path === path)!, current);

  return (
    <AppShell
      variant="client"
      sideBar={
        <div className="sticky top-0 hidden h-screen shrink-0 pl-3 py-3 md:pl-6 md:py-6 sm:block">
          <SideBar
            label="App menu"
            groups={[{ items: CLIENT_TABS }]}
            isActive={active}
            storageKey="clawholics-client-sidebar-collapsed"
            forceCollapsed={!wide}
            footer={(collapsed) => (
              <div className="flex flex-col gap-3">
                <Button variant="secondary" href="/" aria-label={collapsed ? "Back to site (opens in a new tab)" : undefined} className={clsx("w-full gap-3", collapsed && "px-0!")}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  {!collapsed && "Back to site"}
                </Button>
                <Button type="button" onClick={() => signOut({ redirectUrl: "/" })} aria-label="Log out" className={clsx("w-full gap-3", collapsed && "px-0!")}>
                  <LogOut size={16} aria-hidden="true" />
                  {!collapsed && "Log out"}
                </Button>
              </div>
            )}
          />
        </div>
      }
      tabBar={isInnerScreen(pathname) ? undefined : (
        <div className="sm:hidden">
          <TabBar label="App tabs" items={CLIENT_PHONE_TABS} isActive={active} />
        </div>
      )}
    >
      {children}
    </AppShell>
  );
}
