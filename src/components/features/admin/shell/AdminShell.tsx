"use client";

import type { ReactNode } from "react";
import { AppShell, PHONE_STICKY_TOP_BAR, TopBar } from "@/components/organisms";
import { useAdminAccount } from "@/hooks/admin/useAdminAccount";
import { useAdminWideLayout } from "@/hooks/useMinWidth";
import NotificationBell from "@/components/features/admin/shell/NotificationBell";
import SettingsLink from "@/components/features/admin/shell/SettingsLink";
import SideBar from "@/components/features/admin/shell/SideBar";

interface AdminShellProps {
  title: string;
  /** Keeps the title for screen readers only, for a screen with a back button and no visible title */
  hideTitle?: boolean;
  /** Beside the title, for example a Create button */
  titleAside?: ReactNode;
  /** Before the title, in the same row, for example a round back button */
  leading?: ReactNode;
  /** On the right of the title row (wraps under it on phones) */
  actions?: ReactNode;
  children: ReactNode;
}

// The page frame of the daily admin screens: the sidebar (desktop) and bottom tab bar (phone) via
// SideBar, the top bar (TopBar), and room at the bottom for the tab bar. Two soft blush glows sit behind
// the page so the milk-white cards have something to lift off.
// On a computer the frame is clipped, not hidden: a hidden box can still be scrolled by script, and
// the content editors' preview scrolling to a section used to drag the whole page up with it.
export default function AdminShell({ title, hideTitle, titleAside, leading, actions, children }: AdminShellProps) {
  const account = useAdminAccount();
  // The new-bookings bell is drawn once, in the place for the screen's width: two (one hidden by
  // CSS) would each ask for the notifications and each announce a new one
  const wide = useAdminWideLayout();

  return (
    <AppShell variant="admin" sideBar={<SideBar />}>
      <TopBar
        title={title}
        hideTitle={hideTitle}
        titleAside={titleAside}
        leading={leading}
        actions={actions}
        greeting={`Welcome, ${account.firstName}!`}
        account={{ name: account.name, email: account.email || "Admin", imageUrl: account.imageUrl }}
        bell={
          <div className="flex items-center gap-3">
            <SettingsLink />
            <NotificationBell />
          </div>
        }
        wide={wide}
        // On phones it stays at the top as the tab bar stays at the bottom (as in the client app)
        className={PHONE_STICKY_TOP_BAR}
      />

      {children}
    </AppShell>
  );
}
