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
  /** A back control before the actions: a path to go to, or "history" to go back one step */
  back?: string | "history";
  children: ReactNode;
}

// The text link from `lg` up, where the top bar is one row; below it, a round icon before the title
const backClass = "hidden items-center gap-1.5 text-sm font-bold text-berry underline decoration-crimson-light underline-offset-4 lg:flex";
const backCircleClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-crimson-light bg-milk text-berry transition-colors hover:bg-crimson-light/30 lg:hidden";

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

  const backControl =
    back === "history" ? (
      <Button variant="bare" type="button" onClick={() => navigate(-1)} className={backClass}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </Button>
    ) : back ? (
      <Link to={back} className={backClass}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </Link>
    ) : null;

  const backCircle =
    back === "history" ? (
      <Button variant="bare" type="button" onClick={() => navigate(-1)} aria-label="Back" className={backCircleClass}>
        <ArrowLeft size={18} aria-hidden="true" />
      </Button>
    ) : back ? (
      <Link to={back} aria-label="Back" className={backCircleClass}>
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
        actions={backControl || actions ? <>{backControl}{actions}</> : undefined}
        greeting={`Welcome back${firstName ? `, ${firstName}` : ""}!`}
        account={{ name, email: dbUser?.email ?? "", imageUrl }}
        // On phones it stays at the top as the tab bar stays at the bottom
        className={PHONE_STICKY_TOP_BAR}
      />
      {children}
    </div>
  );
}
