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
// the client app's is the page itself on phones, with room at the bottom for the tab bar. From `sm`
// (ClientShell shows the sidebar and hides the tab bar there) it's fitted to the screen like the
// admin's: only the content scrolls, inside the same top and bottom inset as the sidebar, so cards
// never run into the window's edges. That scroller is the page's [data-scroll-root] (ScrollToTop).
// It's `relative` so absolutely placed pieces inside it (screen-reader-only text, `sr-only`) are
// placed in it and scroll with it: otherwise they sit against the page, stretch it past the
// screen and give the window a second scrollbar.
export default function AppShell({ variant, sideBar, tabBar, children }: AppShellProps) {
  if (variant === "admin") {
    return (
      // Laid out like the client app's: the tab bar on phones, the sidebar from `sm` (an icon rail
      // until `lg`) in the same inset, and the content with the same gaps. From `lg` the frame is
      // fitted to the screen and each screen scrolls its own content.
      <div className="relative isolate flex min-h-screen bg-light-orange text-gray-red max-lg:overflow-x-hidden lg:h-screen lg:overflow-clip">
        <Blush tone="crimson" className="-right-28 -top-28 h-96 w-96" />
        <Blush className="-bottom-40 left-1/3 h-112 w-md" />
        {sideBar}
        {tabBar}
        <div
          id="main-content"
          className="flex min-w-0 flex-1 flex-col gap-3 p-3 max-sm:pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:gap-6 md:p-6"
        >
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-light-orange text-gray-red sm:flex sm:h-screen sm:overflow-clip">
      {sideBar}
      <main
        id="main-content"
        data-scroll-root
        className={clsx("relative min-w-0 flex-1 sm:my-3 sm:overflow-y-auto md:my-6", tabBar && "pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0")}
      >
        {children}
      </main>
      {tabBar}
    </div>
  );
}
