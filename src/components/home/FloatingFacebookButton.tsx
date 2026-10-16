import { useEffect, useState } from "react";
import { useScrolled } from "../../hooks/useScrolled";
import { TAB_BAR_REVEAL_PX } from "../layout/MobileTabBar";
import { FacebookIcon } from "@/components/atoms";

// Stays in the bottom-right corner while the page scrolls and opens the studio's
// Facebook page in a new tab. It slides away once the footer comes into view, because
// the footer has its own chat button.
export default function FloatingFacebookButton({ href }: { href: string }) {
  const [footerInView, setFooterInView] = useState(false);
  // On phones the button comes and goes with the bottom bar: hidden while the hero shows, then
  // sliding up above the bar. From `lg` up (no bottom bar) it is always there.
  const scrolled = useScrolled(TAB_BAR_REVEAL_PX);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setFooterInView(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message Clawholics by Max on Facebook"
      aria-hidden={footerInView}
      tabIndex={footerInView ? -1 : 0}
      className={`fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex items-center gap-3 rounded-md bg-crimson px-3 py-3 text-base font-semibold text-light-orange shadow-xl shadow-crimson/30 transition-all duration-300 hover:bg-gray-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson motion-reduce:transition-none lg:bottom-8 lg:right-8 ${
        footerInView ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      } ${scrolled ? "" : "max-lg:pointer-events-none max-lg:invisible max-lg:translate-y-[calc(100%+6rem)] max-lg:opacity-0"}`}
    >
      <FacebookIcon className="h-5 w-5 shrink-0" />
      <span className="hidden md:inline">Chat on Facebook</span>
    </a>
  );
}
