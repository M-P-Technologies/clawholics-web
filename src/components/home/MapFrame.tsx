"use client";

import { useEffect, useRef, useState } from "react";

// The salon's Google map. The embed brings about 400 KB of Google's scripts, and Chrome starts
// even a loading="lazy" iframe well before it reaches the screen, so the map is only put in once
// its box is actually on screen. The box keeps the map's size meanwhile, so nothing moves.
export default function MapFrame({ src, className }: { src: string; className: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    // Without IntersectionObserver (old browsers, tests) the map is simply shown
    if (!box || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShown(true);
        observer.disconnect();
      }
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={boxRef} className={className}>
      {shown && (
        <iframe
          title="Map showing Clawholics by Max location"
          src={src}
          className="h-full w-full rounded-sm"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      )}
    </div>
  );
}
