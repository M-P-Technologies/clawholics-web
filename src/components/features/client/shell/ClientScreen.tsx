"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "@/lib/router";
import { Button } from "@/components/atoms";
import { PHONE_STICKY_TOP_BAR, TopBar } from "@/components/organisms";
import { useMyAccount } from "@/hooks/client/useMyAccount";

interface ClientScreenProps {
  title: string;
  /** The screen's own controls (wrap under the title on phones) */
  actions?: ReactNode;
  /** A round back button before the title: a path to go to, or "history" to go back one step */
  back?: string | "history";
  children: ReactNode;
}

// A round icon before the title at every width, like the settings and bell buttons (and the admin's
// client page)
const backCircleClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-crimson-light text-berry transition-colors hover:bg-crimson-light/30 focus-visible:outline-2 focus-visible:outline-crimson";

// The page frame of every client screen, shaped like the admin's AdminShell: the top bar (a welcome,
// the title, a link to the site and who is signed in) and the content below it with
// the admin's spacing.
export default function ClientScreen({ title, actions, back, children }: ClientScreenProps) {
  const account = useMyAccount();
  const navigate = useNavigate();
  const dbUser = account?.dbUser;
  const clerkUser = account?.clerkUser;
  const firstName = dbUser?.first_name || clerkUser?.firstName || "";
  const name = [dbUser?.first_name, dbUser?.last_name].filter(Boolean).join(" ") || firstName || "You";
  const imageUrl = clerkUser?.hasImage ? clerkUser.imageUrl : "";

  const backCircle =
    back === "history" ? (
      <Button variant="bare" type="button" onClick={() => navigate(-1)} aria-label="Back" title="Back" className={backCircleClass}>
        <ArrowLeft size={18} aria-hidden="true" />
      </Button>
    ) : back ? (
      <Link to={back} aria-label="Back" title="Back" className={backCircleClass}>
        <ArrowLeft size={18} aria-hidden="true" />
      </Link>
    ) : null;

  return (
    // From `sm` the scroller around this already has the sidebar's top and bottom inset, so only
    // the sides are padded there
    <div className="flex min-w-0 flex-col gap-3 p-3 sm:py-0 md:gap-6 md:px-6">
      <TopBar
        title={title}
        leading={backCircle}
        actionsOnPhone={Boolean(actions)}
        actions={actions}
        greeting={`Welcome back${firstName ? `, ${firstName}` : ""}!`}
        account={{ name, email: dbUser?.email ?? "", imageUrl }}
        // On phones it stays at the top as the tab bar stays at the bottom
        className={PHONE_STICKY_TOP_BAR}
      />
      {children}
    </div>
  );
}
