"use client";

import { Link } from "@/lib/router";
import { Button } from "@/components/atoms";
import { useCookieNotice } from "@/hooks/useCookieNotice";

// A plain notice about the cookies the site sets: only the ones sign-in and security need, no
// tracking or ads. On a phone it sits at the bottom of the screen, over the tab bar until it is
// dismissed; on a computer, in the bottom-left corner. It's fixed in place, so it never pushes the
// page around.
export default function CookieNotice() {
  const { open, close } = useCookieNotice();
  if (!open) return null;

  return (
    <section
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-light-orange p-3 shadow-xl shadow-crimson/20 sm:flex-row sm:items-center lg:inset-x-auto lg:bottom-6 lg:left-6 lg:max-w-md"
    >
      <p className="text-sm text-gray-red">
        We only use the cookies needed to keep you signed in and the site secure. No tracking or ads.{" "}
        <Link to="/privacy#cookies" className="font-bold text-crimson-ink underline underline-offset-2">
          Privacy policy
        </Link>
      </p>
      <Button type="button" onClick={close} className="shrink-0 self-end sm:self-auto">
        Got it
      </Button>
    </section>
  );
}
