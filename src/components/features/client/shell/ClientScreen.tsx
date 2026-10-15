"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "@/lib/router";
import { Button } from "@/components/atoms";
import { TopBar } from "@/components/organisms";
import { useIsClient } from "@/hooks/useIsClient";
import { useMyAccount } from "@/hooks/client/useMyAccount";

interface ClientScreenProps {
  title: string;
  /** The screen's own controls (wrap under the title on phones) */
  actions?: ReactNode;
  /** A back control before the actions: a path to go to, or "history" to go back one step */
  back?: string | "history";
  children: ReactNode;
}

const backClass = "flex items-center gap-1.5 text-sm font-bold text-berry underline decoration-crimson-light underline-offset-4";

// The page frame of every client screen, shaped like the admin's AdminShell: the top bar (a welcome,
// the title, today's date, a link to the site and who is signed in) and the content below it with
// the admin's spacing.
export default function ClientScreen({ title, actions, back, children }: ClientScreenProps) {
  const account = useMyAccount();
  const navigate = useNavigate();
  const isClient = useIsClient();
  const dbUser = account?.dbUser;
  const clerkUser = account?.clerkUser;
  const firstName = dbUser?.first_name || clerkUser?.firstName || "";
  const name = [dbUser?.first_name, dbUser?.last_name].filter(Boolean).join(" ") || firstName || "You";
  const imageUrl = clerkUser?.hasImage ? clerkUser.imageUrl : "";
  // The server's day must not show in place of the client's own
  const today = isClient ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "";

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

  return (
    <div className="flex min-w-0 flex-col gap-5 px-2 py-2 sm:px-4 sm:py-4 lg:pl-0">
      <TopBar
        title={title}
        actions={backControl || actions ? <>{backControl}{actions}</> : undefined}
        greeting={`Welcome back${firstName ? `, ${firstName}` : ""}!`}
        today={today}
        account={{ name, email: dbUser?.email ?? "", imageUrl }}
      />
      {children}
    </div>
  );
}
