"use client";

import type { ReactNode } from "react";
import { AppShell, TopBar } from "@/components/organisms";
import { useAdminAccount } from "../../hooks/admin/useAdminAccount";
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
// SideBar, the top bar (TopBar), and room at the bottom for the tab bar. Two soft blush glows sit behind
// the page so the milk-white cards have something to lift off.
// On a computer the frame is clipped, not hidden: a hidden box can still be scrolled by script, and
// the content editors' preview scrolling to a section used to drag the whole page up with it.
export default function AdminShell({ title, titleAside, actions, children }: AdminShellProps) {
  const account = useAdminAccount();

  return (
    <AppShell variant="admin" sideBar={<SideBar />}>
      <TopBar
        title={title}
        titleAside={titleAside}
        actions={actions}
        greeting={`Welcome, ${account.firstName}!`}
        today={account.today}
        account={{ name: account.name, email: account.email || "Admin", imageUrl: account.imageUrl }}
      />

      {children}
    </AppShell>
  );
}
