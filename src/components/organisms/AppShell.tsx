import type { ReactNode } from "react";
import clsx from "clsx";
import { Blush } from "../atoms";

interface AppShellProps {
  variant: "admin" | "client";
  sideBar: ReactNode;
  /** The phone's bottom bar; leave out on screens with a back arrow instead */
  tabBar?: ReactNode;
  children: ReactNode;
}

// The frame of a signed-in area: the sidebar (computers), the bottom tab bar (phones) and the content.
// The admin's frame is clipped on computers (only its content scrolls) and has two blush glows;
// the client app's is the page itself, with room at the bottom for the tab bar.
export default function AppShell({ variant, sideBar, tabBar, children }: AppShellProps) {
  if (variant === "admin") {
    return (
      <div className="relative isolate flex min-h-screen bg-light-orange px-2 py-2 max-lg:overflow-x-hidden sm:px-4 sm:py-4 lg:h-screen lg:overflow-clip">
        <Blush tone="crimson" className="-right-28 -top-28 h-96 w-96" />
        <Blush className="-bottom-40 left-1/3 h-[28rem] w-[28rem]" />
        {sideBar}
        {tabBar}
        <div className="flex min-w-0 flex-1 flex-col gap-5 pb-24 lg:pb-0">{children}</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-light-orange text-gray-red lg:flex">
      {sideBar}
      <main id="main-content" className={clsx("min-w-0 flex-1", tabBar && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0")}>
        {children}
      </main>
      {tabBar}
    </div>
  );
}
