import { useCallback, useEffect, useRef, useState } from "react";

interface Indicator {
  left: number;
  width: number;
}

// Where the underline was last drawn. Every page mounts its own nav, so this has to
// live outside the component for the underline to slide from the previous link.
let lastIndicator: Indicator | null = null;

// Keeps one underline under the active nav link and moves it to the new link when the
// page changes. It starts where it was on the previous page, then moves in the next frame.
export function useNavIndicator(activePath: string | undefined) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [indicator, setIndicator] = useState<Indicator | null>(lastIndicator);

  const setLinkRef = useCallback(
    (path: string) => (el: HTMLAnchorElement | null) => {
      if (el) linkRefs.current.set(path, el);
      else linkRefs.current.delete(path);
    },
    [],
  );

  useEffect(() => {
    const measure = () => {
      const link = activePath ? linkRefs.current.get(activePath) : undefined;
      if (!link) {
        setIndicator(null);
        return;
      }
      const next = { left: link.offsetLeft, width: link.offsetWidth };
      lastIndicator = next;
      setIndicator(next);
    };

    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [activePath]);

  return { containerRef, setLinkRef, indicator };
}
