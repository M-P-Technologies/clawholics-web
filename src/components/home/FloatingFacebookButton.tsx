import { useEffect, useState } from "react";
import { FacebookIcon } from "../ui/SocialIcons";

// Stays in the bottom-right corner while the page scrolls and opens the studio's
// Facebook page in a new tab. It slides away once the footer comes into view, because
// the footer has its own chat button.
export default function FloatingFacebookButton({ href }: { href: string }) {
  const [footerInView, setFooterInView] = useState(false);

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
      className={`fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-md bg-crimson px-4 py-4 text-sm font-bold uppercase tracking-extrawide text-light-orange shadow-xl shadow-crimson/30 transition-all duration-300 hover:bg-gray-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson motion-reduce:transition-none md:bottom-8 md:right-8 ${
        footerInView ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <FacebookIcon className="h-5 w-5 shrink-0" />
      <span className="hidden md:inline">Chat on Facebook</span>
    </a>
  );
}
