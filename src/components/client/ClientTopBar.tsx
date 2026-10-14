"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "@/components/atoms";
import { useIsClient } from "../../hooks/useIsClient";
import { useMyAccount } from "../../hooks/client/useMyAccount";

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

  return (
    <header className="flex w-full flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk/80 px-4 py-3 shadow-petal backdrop-blur-sm sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      <div className="flex min-w-0 items-center justify-between gap-3 lg:shrink-0">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="hidden font-display text-base leading-none text-berry lg:block">Welcome back{firstName ? `, ${firstName}` : ""}!</p>
          <h1 className="font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red sm:text-3xl">{title}</h1>
        </div>
        {/* On a phone the account sits beside the title */}
        <Avatar name={name} imageUrl={imageUrl} className="lg:hidden" />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-3 lg:flex-1 lg:flex-nowrap lg:justify-end">
        {actions}

        {today && (
          <p className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-gray-red/80 xl:flex">
            <CalendarDays size={15} aria-hidden="true" className="text-berry" />
            {today}
          </p>
        )}

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-crimson-light px-3 py-1.5 text-[13px] font-bold text-berry transition-colors hover:bg-crimson-light/30 lg:flex"
        >
          View site
          <ExternalLink size={14} aria-hidden="true" />
        </a>

        <div className="hidden shrink-0 items-center gap-2.5 border-l border-crimson-light/60 pl-3 lg:flex">
          <Avatar name={name} imageUrl={imageUrl} />
          <div className="hidden min-w-0 flex-col leading-tight 2xl:flex">
            <span className="max-w-40 truncate text-[13px] font-bold text-gray-red">{name}</span>
            <span className="max-w-40 truncate text-[11px] text-gray-red/60">{email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
