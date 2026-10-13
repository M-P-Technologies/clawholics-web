import type { ReactNode } from "react";
import Blush from "../ui/Blush";
import SideBar from "./SideBar";

interface AdminShellProps {
  title: string;
  /** Beside the title, for example a Create button */
  titleAside?: ReactNode;
  /** On the right of the title row (wraps under it on phones) */
  actions?: ReactNode;
  children: ReactNode;
}

// The page frame of the daily admin screens: the sidebar (desktop) and bottom tab bar (phone) via
// SideBar, a title row, and room at the bottom for the tab bar. Two soft blush glows sit behind
// the page so the milk-white cards have something to lift off.
export default function AdminShell({ title, titleAside, actions, children }: AdminShellProps) {
  return (
    <div className="relative isolate flex min-h-screen overflow-x-hidden bg-light-orange px-2 py-2 sm:px-4 sm:py-4 lg:h-screen lg:overflow-hidden">
      <Blush tone="crimson" className="-right-28 -top-28 h-96 w-96" />
      <Blush className="-bottom-40 left-1/3 h-[28rem] w-[28rem]" />
      <SideBar />

      <div className="flex min-w-0 flex-1 flex-col gap-5 pb-24 lg:pb-0">
        <header className="flex w-full flex-col gap-1">
          <p className="hidden font-display text-lg leading-none text-berry lg:block">Welcome, Admin!</p>

          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <h1 className="font-display text-3xl font-normal normal-case leading-tight tracking-normal text-gray-red sm:text-4xl">
                {title}
              </h1>
              {titleAside}
            </div>
            {actions}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
