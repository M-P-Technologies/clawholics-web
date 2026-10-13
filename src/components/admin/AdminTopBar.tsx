"use client";

import { CalendarDays, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useAdminAccount } from "../../hooks/admin/useAdminAccount";
import { initialsOf } from "./DirectoryProfileCard";

interface AdminTopBarProps {
  title: string;
  /** Beside the title, for example a Create button */
  titleAside?: ReactNode;
  /** The screen's own controls (wrap under the title on phones) */
  actions?: ReactNode;
}

// The bar across the top of every admin screen: the greeting and the screen's title and controls
// on the left; today's date, a link to the public site and who is signed in on the right.
export default function AdminTopBar({ title, titleAside, actions }: AdminTopBarProps) {
  const account = useAdminAccount();

  return (
    <header className="flex w-full flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk/80 px-4 py-3 shadow-petal backdrop-blur-sm sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      <div className="flex min-w-0 items-center justify-between gap-3 lg:shrink-0">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="hidden font-display text-base leading-none text-berry lg:block">Welcome, {account.firstName}!</p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red sm:text-3xl">{title}</h1>
            {titleAside}
          </div>
        </div>
        {/* On a phone the account sits beside the title */}
        <Avatar name={account.name} imageUrl={account.imageUrl} className="lg:hidden" />
      </div>

      {/* One row on a computer: the screen's controls give way (and scroll sideways) before anything wraps */}
      <div className="flex min-w-0 flex-wrap items-center gap-3 lg:flex-1 lg:flex-nowrap lg:justify-end">
        {actions}

        {account.today && (
          <p className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-gray-red/80 xl:flex">
            <CalendarDays size={15} aria-hidden="true" className="text-berry" />
            {account.today}
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
          <Avatar name={account.name} imageUrl={account.imageUrl} />
          <div className="hidden min-w-0 flex-col leading-tight 2xl:flex">
            <span className="max-w-40 truncate text-[13px] font-bold text-gray-red">{account.name}</span>
            <span className="max-w-40 truncate text-[11px] text-gray-red/60">{account.email || "Admin"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// The signed-in admin's photo, or their initials
function Avatar({ name, imageUrl, className = "" }: { name: string; imageUrl: string; className?: string }) {
  return imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- Clerk's image, sized by CSS like the rest of the admin
    <img src={imageUrl} alt={name} title={name} className={`h-9 w-9 shrink-0 rounded-full border border-crimson-light object-cover ${className}`} />
  ) : (
    <span role="img" aria-label={name} title={name} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-sm text-berry ${className}`}>
      {initialsOf(name)}
    </span>
  );
}
