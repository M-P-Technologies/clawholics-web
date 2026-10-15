"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft, LogOut } from "lucide-react";
import { useLocation } from "@/lib/router";
import { Button } from "@/components/atoms";
import { AppShell, SideBar, TabBar } from "@/components/organisms";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import { CLIENT_TABS, isInnerScreen, isTabActive } from "@/lib/client/clientNav";


// The client app's frame: the library's shell with the four tabs, back to the site and log out.
// The site's colours and fonts apply here (not in the admin).
export default function ClientShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { signOut } = useClerk();
  useSiteTheme();
  const active = (path: string, current: string) => isTabActive(CLIENT_TABS.find((t) => t.path === path)!, current);

  return (
    <AppShell
      variant="client"
      sideBar={
        <div className="sticky top-0 hidden h-screen shrink-0 p-3 lg:block">
          <SideBar
            label="App menu"
            className="lg:flex"
            groups={[{ items: CLIENT_TABS }]}
            isActive={active}
            storageKey="clawholics-client-sidebar-collapsed"
            footer={(collapsed) => (
              <div className="flex flex-col gap-2">
                <Button variant="secondary" to="/" aria-label={collapsed ? "Back to site" : undefined} className={clsx("w-full gap-2", collapsed && "!px-0")}>
                  <ArrowLeft size={16} aria-hidden="true" />
                  {!collapsed && "Back to site"}
                </Button>
                <Button type="button" onClick={() => signOut({ redirectUrl: "/" })} aria-label="Log out" className={clsx("w-full gap-2", collapsed && "!px-0")}>
                  <LogOut size={16} aria-hidden="true" />
                  {!collapsed && "Log out"}
                </Button>
              </div>
            )}
          />
        </div>
      }
      tabBar={isInnerScreen(pathname) ? undefined : (
        <div className="lg:hidden">
          <TabBar label="App tabs" items={CLIENT_TABS} isActive={active} />
        </div>
      )}
    >
      {children}
    </AppShell>
  );
}
