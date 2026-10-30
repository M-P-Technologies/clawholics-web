"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { project, rubberband, springTo } from "@/lib/spring";

interface Options {
  /** y: a bottom sheet dragged down · x: a drawer from the right dragged right */
  axis: "x" | "y";
  enabled: boolean;
  /** Read when a drag starts or moves, never during render */
  getPanel: () => HTMLElement | null;
  getBackdrop: () => HTMLElement | null;
  onDismiss: () => void;
}

const MOVE_THRESHOLD = 4;
// How fast a flick dies away when deciding where it would land (0.998 is a long scroll; 0.99 a short throw)
const FLICK_DECELERATION = 0.99;
const VELOCITY_WINDOW_MS = 100;
// jsdom and very old browsers have no matchMedia: there, dialogs just close without animating
const media = (query: string) => typeof window.matchMedia === "function" && window.matchMedia(query).matches;
const INTERACTIVE = "button, a, input, select, textarea, [data-no-drag]";

// Drag a sheet or drawer by its header: it follows the pointer 1:1 (from wherever it was grabbed),
// resists past its open edge, and on release a spring takes over with the pointer's velocity,
// either closing it or settling it back. Grabbing it again mid-flight picks up from where it is.
export function useSheetDrag({ axis, enabled, getPanel, getBackdrop, onDismiss }: Options) {
  const dismissRef = useRef(onDismiss);
  const live = useRef({
    pointerId: -1,
    grabbed: false,
    dragging: false,
    startPointer: 0,
    offset: 0,
    history: [] as { t: number; p: number }[],
    stop: null as (() => void) | null,
  });

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  // A dialog that opens again starts at rest, and a spring never outlives the dialog
  useEffect(() => {
    const state = live.current;
    state.offset = 0;
    state.grabbed = false;
    state.dragging = false;
    return () => state.stop?.();
  }, [enabled]);

  const size = () => (axis === "y" ? getPanel()?.offsetHeight : getPanel()?.offsetWidth) ?? 0;

  const place = (offset: number) => {
    live.current.offset = offset;
    const el = getPanel();
    if (el) el.style.transform = axis === "y" ? `translateY(${offset}px)` : `translateX(${offset}px)`;
    const total = size();
    const shade = getBackdrop();
    if (shade && total > 0) shade.style.opacity = String(1 - Math.min(Math.max(offset / total, 0), 1) * 0.9);
  };

  // Hand the panel over from its CSS entrance to the pointer
  const lift = () => {
    const el = getPanel();
    if (!el) return;
    el.style.animation = "none";
    el.style.willChange = "transform";
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!enabled || e.button !== 0 || typeof window.matchMedia !== "function") return;
    // A second finger is ignored while the first holds the sheet
    if (live.current.grabbed) return;
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
    // A bottom sheet is only a sheet below lg
    if (axis === "y" && media("(min-width: 1024px)")) return;
    const state = live.current;
    state.stop?.();
    state.stop = null;
    const pointer = axis === "y" ? e.clientY : e.clientX;
    state.pointerId = e.pointerId;
    state.grabbed = true;
    // Mid-flight, the offset is wherever the panel is right now, so it stays under the finger
    state.startPointer = pointer - state.offset;
    state.dragging = state.offset !== 0;
    state.history = [{ t: e.timeStamp, p: pointer }];
    // Mid-flight it is already moving; otherwise it is lifted once the pointer has really moved
    if (state.dragging) lift();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // the pointer is already gone; the moves that follow just won't be captured
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const state = live.current;
    if (!state.grabbed || e.pointerId !== state.pointerId) return;
    const pointer = axis === "y" ? e.clientY : e.clientX;
    if (!state.dragging) {
      if (Math.abs(pointer - state.startPointer - state.offset) < MOVE_THRESHOLD) return;
      state.dragging = true;
      lift();
    }
    state.history.push({ t: e.timeStamp, p: pointer });
    const cutoff = e.timeStamp - VELOCITY_WINDOW_MS;
    while (state.history.length > 2 && state.history[0].t < cutoff) state.history.shift();
    const raw = pointer - state.startPointer;
    place(raw < 0 ? rubberband(raw, size()) : raw);
  };

  const finish = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const state = live.current;
    if (!state.grabbed || e.pointerId !== state.pointerId) return;
    state.grabbed = false;
    if (!state.dragging) return;
    state.dragging = false;

    const first = state.history[0];
    const last = state.history[state.history.length - 1];
    const span = last.t - first.t;
    const velocity = cancelled || span <= 0 ? 0 : ((last.p - first.p) / span) * 1000;
    // Decide from where a flick would land, not from where the finger let go
    const dismiss = !cancelled && state.offset + project(velocity, FLICK_DECELERATION) > size() * 0.5;
    settle(dismiss, velocity);
  };

  // Spring to closed or back to open from wherever the panel is, carrying `velocity`
  const settle = (dismiss: boolean, velocity: number) => {
    const state = live.current;
    const target = dismiss ? size() : 0;
    const done = () => {
      state.stop = null;
      if (dismiss) {
        dismissRef.current();
        // If the caller kept it open (a guard, a save still running), bring it back instead of leaving it off-screen
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (getPanel()?.isConnected && live.current.offset > 0) settle(false, 0);
          }),
        );
      } else {
        const el = getPanel();
        if (el) el.style.willChange = "";
      }
    };

    if (media("(prefers-reduced-motion: reduce)")) {
      place(target);
      done();
      return;
    }
    state.stop?.();
    state.stop = springTo({
      from: state.offset,
      to: target,
      velocity,
      // Bounce only when the pointer was flung; a plain release settles without overshoot
      damping: Math.abs(velocity) > 600 ? 0.85 : 1,
      response: 0.32,
      onUpdate: place,
      onDone: done,
    });
  };

  // Closing by button, backdrop or Escape leaves the way a drag would: back along the path it came
  const close = () => {
    const state = live.current;
    const atDesktopWidth = axis === "y" && media("(min-width: 1024px)");
    if (!enabled || atDesktopWidth || !getPanel() || typeof window.matchMedia !== "function") {
      dismissRef.current();
      return;
    }
    lift();
    state.grabbed = false;
    state.dragging = false;
    settle(true, 0);
  };

  return {
    close,
    onPointerDown,
    onPointerMove,
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => finish(e, false),
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => finish(e, true),
  };
}
