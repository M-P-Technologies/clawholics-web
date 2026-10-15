"use client";

import type { ReactNode } from "react";
import { TopBar } from "@/components/organisms";
import { useIsClient } from "@/hooks/useIsClient";
import { useMyAccount } from "@/hooks/client/useMyAccount";

interface ClientTopBarProps {
  title: string;
  /** The screen's own controls (wrap under the title on phones) */
  actions?: ReactNode;
}

// The bar across the top of every tab of the client app, drawn like the admin's: a welcome and the
// screen's title on the left; today's date, a link to the public site and who is signed in on the right.
export default function ClientTopBar({ title, actions }: ClientTopBarProps) {
  const { dbUser, clerkUser } = useMyAccount();
  const isClient = useIsClient();
  const firstName = dbUser?.first_name || clerkUser?.firstName || "";
  const name = [dbUser?.first_name, dbUser?.last_name].filter(Boolean).join(" ") || firstName || "You";
  const email = dbUser?.email ?? "";
  const imageUrl = clerkUser?.hasImage ? clerkUser.imageUrl : "";
  // The server's day must not show in place of the client's own
  const today = isClient ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "";

  return <TopBar title={title} actions={actions} greeting={`Welcome back${firstName ? `, ${firstName}` : ""}!`} today={today} account={{ name, email, imageUrl }} />;
}
