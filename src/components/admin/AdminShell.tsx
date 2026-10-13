import type { ReactNode } from "react";
import Blush from "../ui/Blush";
import AdminTopBar from "./AdminTopBar";
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
// SideBar, the top bar (AdminTopBar), and room at the bottom for the tab bar. Two soft blush glows sit behind
// the page so the milk-white cards have something to lift off.
// On a computer the frame is clipped, not hidden: a hidden box can still be scrolled by script, and
// the content editors' preview scrolling to a section used to drag the whole page up with it.
export default function AdminShell({ title, titleAside, actions, children }: AdminShellProps) {
  return (
    <div className="relative isolate flex min-h-screen bg-light-orange px-2 py-2 max-lg:overflow-x-hidden sm:px-4 sm:py-4 lg:h-screen lg:overflow-clip">
      <Blush tone="crimson" className="-right-28 -top-28 h-96 w-96" />
      <Blush className="-bottom-40 left-1/3 h-[28rem] w-[28rem]" />
      <SideBar />

      <div className="flex min-w-0 flex-1 flex-col gap-5 pb-24 lg:pb-0">
        <AdminTopBar title={title} titleAside={titleAside} actions={actions} />

        {children}
      </div>
    </div>
  );
}
