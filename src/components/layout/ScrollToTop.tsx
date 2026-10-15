"use client";

import { useEffect, useEffectEvent } from "react";
import { inCmsPreview } from "@/features/cms/lib/cmsPreview";
import { useLocation } from "@/lib/router";

export default function ScrollToTop() {
  const { pathname, state } = useLocation();
  // Read as an effect event so a state-only change (e.g. clearLocationState after the FAQ
  // scroll) doesn't trigger a jump to the top; only a page change does.
  const isIntentionalScroll = useEffectEvent(() => Boolean(state?.scrollTo));

  useEffect(() => {
    // 🔥 if we are intentionally scrolling (like FAQ), DO NOTHING
    if (isIntentionalScroll()) return;

    // usePathname() has no hash, so read it from the address bar.
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (!element) return;
        // In the admin's preview frame, scroll this page only: scrollIntoView would also scroll
        // the editor around the frame
        if (inCmsPreview()) window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY, behavior: "smooth" });
        else element.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      window.scrollTo({
        top: 0,
        behavior: "instant",
      });
    }
  }, [pathname]);

  return null;
}
