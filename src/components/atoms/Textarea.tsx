"use client";

import { useRef } from "react";
import type { PointerEvent, Ref, TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import { field } from "../tokens";

const MIN_HEIGHT = 40;

/**
 * A text box whose height can be dragged from the grip in its corner. The grip uses pointer events, so it works
 * with a finger as well as a mouse (the browser's own resize handle doesn't show on phones).
 */
export default function Textarea({ className, ref, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  const area = useRef<HTMLTextAreaElement | null>(null);
  const drag = useRef<{ startY: number; startHeight: number } | null>(null);

  const setRef = (node: HTMLTextAreaElement | null) => {
    area.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  const resizeTo = (clientY: number) => {
    const el = area.current;
    if (!el || !drag.current) return;
    el.style.height = `${Math.max(MIN_HEIGHT, drag.current.startHeight + clientY - drag.current.startY)}px`;
  };

  const start = (e: PointerEvent<HTMLDivElement>) => {
    const el = area.current;
    if (!el) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startHeight: el.getBoundingClientRect().height };
  };

  return (
    <div className="relative">
      <textarea ref={setRef} className={clsx(field.input, "min-h-20", className)} style={{ resize: "none" }} {...rest} />
      {!rest.disabled && (
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Drag to change the height"
        data-testid="textarea-grip"
        onPointerDown={start}
        onPointerMove={(e) => resizeTo(e.clientY)}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        style={{ touchAction: "none" }}
        className="absolute bottom-0 right-0 flex h-7 w-7 cursor-ns-resize items-end justify-end p-1.5"
      >
        <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-crimson" aria-hidden="true">
          <path d="M9 1 1 9M9 5 5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      )}
    </div>
  );
}
