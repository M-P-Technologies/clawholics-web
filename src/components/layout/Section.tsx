import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

// Returns a ref and a flag that is true once the element may be shown. The server and the first
// render in the browser both start as shown, so they match (starting from what the browser
// supports would not: the server has no IntersectionObserver). After that, a section that is
// below the fold is hidden and shown again the first time its top edge scrolls into view; one
// already in view, or any browser without scroll observing, just stays shown.
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setRevealed(false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      // Fire as soon as the top edge is 10% up the screen, so tall sections
      // are not stuck waiting for a large share of themselves to be visible.
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}

interface SectionProps {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Classes for the inner content wrapper. */
  innerClassName?: string;
  /** Run edge to edge across the screen instead of inside the centered column. */
  bleed?: boolean;
}

// Shared page rhythm: one max width, one gutter and one vertical spacing for
// every landing section. `relative` lets Blush glows sit behind the content.
// The content rises into place the first time it scrolls into view; the blush
// glows stay still. Reduced-motion users get the content straight away.
export default function Section({ id, children, className, innerClassName, bleed = false }: SectionProps) {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <section id={id} className={clsx("relative flex flex-col overflow-x-clip", className)}>
      <div
        ref={ref}
        className={clsx(
          !/(^|\s)gap-/.test(innerClassName ?? "") && "gap-12 md:gap-24",
          "flex flex-col",
          bleed ? "w-full py-4 lg:py-8" : "mx-auto w-full max-w-6xl px-4 py-12 md:px-8 lg:py-24",
          "transition-[opacity,translate] duration-1000 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none",
          revealed ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0",
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
