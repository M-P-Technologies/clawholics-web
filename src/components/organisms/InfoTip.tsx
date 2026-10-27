"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { useTooltipLayout } from "../../hooks/useMinWidth";
import Dialog from "./Dialog";

interface InfoTipProps {
  /** What the note is about, e.g. a stat card's label: names the button ("About Sales") and the sheet */
  label: string;
  children: ReactNode;
}

// A small ⓘ button with a note. From `md` up the note is a tooltip, shown on hover or focus and kept
// open by a click (Escape or a click elsewhere closes it); below `md` a tap opens it in a bottom sheet.
export default function InfoTip({ label, children }: InfoTipProps) {
  const wide = useTooltipLayout();
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLSpanElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [sheet, setSheet] = useState(false);
  // How far the tooltip is moved left so it stays inside the window
  const [shift, setShift] = useState(0);
  const tipOpen = wide && (hovered || pinned);

  useLayoutEffect(() => {
    if (!tipOpen || !tipRef.current) return;
    const overflow = tipRef.current.getBoundingClientRect().right - (window.innerWidth - 12);
    setShift((current) => Math.max(0, current + overflow));
  }, [tipOpen]);

  useEffect(() => {
    if (!tipOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinned(false);
        setHovered(false);
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setPinned(false);
        setHovered(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [tipOpen]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={() => wide && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-describedby={tipOpen ? id : undefined}
        aria-expanded={wide ? undefined : sheet}
        onFocus={() => wide && setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={() => (wide ? setPinned((p) => !p) : setSheet(true))}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-red transition-colors hover:bg-crimson-light/40 hover:text-berry focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-crimson"
      >
        <Info size={16} aria-hidden="true" />
      </button>
      {tipOpen && (
        <span
          ref={tipRef}
          id={id}
          role="tooltip"
          style={{ transform: shift ? `translateX(-${shift}px)` : undefined }}
          className="absolute left-0 top-full z-40 mt-2 flex w-64 flex-col gap-3 rounded-xl border border-crimson-light/50 bg-milk p-3 text-left text-xs font-normal leading-snug text-gray-red shadow-lg shadow-crimson/15"
        >
          {children}
        </span>
      )}
      {!wide && (
        <Dialog open={sheet} onClose={() => setSheet(false)} title={label} size="sm">
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-gray-red">{children}</div>
        </Dialog>
      )}
    </span>
  );
}
