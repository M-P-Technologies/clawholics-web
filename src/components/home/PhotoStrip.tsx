import { useEffect, useState, useRef, type CSSProperties } from "react";
import Image from "next/image";
import { canOptimizeImage } from "@/lib/imageHosts";
import { Link } from "@/lib/router";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { type StripItem } from "../../types/home";
import { servicePath } from "../../utils/slug";
import { Button } from "@/components/atoms";

interface PhotoStripProps {
  items: StripItem[];
}

// Three-up photo row (one on phones) that scrolls and snaps, with dots.
// How long the caption takes to fade out before the photos start to move.
const CAPTION_FADE_MS = 170;

const ARROW_BUTTON =
  "pointer-events-auto absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-crimson-light bg-light-orange text-crimson-ink shadow-md shadow-crimson/20 transition-colors hover:bg-crimson hover:text-on-crimson focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson";

// Service details shown along the bottom of the middle photo.
function StripCaption({ item, visible = true }: { item: StripItem; visible?: boolean }) {
  return (
    <div
      className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 rounded-b-sm bg-linear-to-t from-gray-red/80 via-gray-red/40 to-transparent p-3 pt-15 transition-opacity ease-in-out motion-reduce:transition-none md:p-9 md:pt-24 ${
        visible ? "opacity-100 duration-300" : "opacity-0 duration-150"
      }`}
    >
      <div className="min-w-0 text-light-orange flex flex-col gap-3">
        <h3 className="truncate font-display text-xl font-normal uppercase tracking-widest text-light-orange md:text-3xl">
          {item.name}
        </h3>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-light-orange md:text-base">
          <span>{item.price !== null ? `From ₱${item.price}` : "Price on request"}</span>
          {item.duration && (
            <span className="inline-flex items-center gap-3">
              <Clock size={16} aria-hidden="true" />
              {item.duration}
            </span>
          )}
        </p>
      </div>
      <Link
        to={servicePath(item)}
        aria-label={`Book ${item.name}`}
        tabIndex={visible ? 0 : -1}
        className={`${visible ? "pointer-events-auto" : "pointer-events-none"} shrink-0 rounded-md bg-crimson px-3 py-2 text-sm md:text-base font-semibold text-light-orange shadow-md shadow-crimson/30 transition-colors hover:bg-gray-red active:translate-y-px sm:px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-orange`}
      >
        Book
      </Link>
    </div>
  );
}

// The wide photo in the middle is the current one. Each arrow click pans the row by
// one photo: the wide photo narrows into a side slot while the next one widens into
// the middle. The photos loop, so the row is laid out three times over and quietly
// jumps back to the middle copy after each pan (it looks identical, so no flicker).
// On desktop three photos show (narrow, wide, narrow); below that only the current one.
export default function PhotoStrip({ items }: PhotoStripProps) {
  const count = items.length;
  const [pos, setPos] = useState(count);
  const [animate, setAnimate] = useState(true);
  const [settled, setSettled] = useState(true);
  const [shownIndex, setShownIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Turn the pan back on a moment after the silent jump back to the middle copy.
  useEffect(() => {
    if (animate) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  // A click fades the caption out, still showing the old service. Once the pan is over
  // the caption swaps to the new service while hidden and fades back in. Every click
  // restarts the wait, so clicking quickly keeps it hidden until the photos stop.
  useEffect(() => {
    if (settled || !count) return;
    const id = setTimeout(() => {
      setShownIndex(pos % count);
      setSettled(true);
    }, 550);
    return () => clearTimeout(id);
  }, [settled, pos, count]);

  if (!count) return null;

  if (count === 1) {
    return (
      <div className="relative aspect-square w-full overflow-hidden sm:rounded-sm lg:aspect-video">
        <Image
          src={items[0].image}
          alt={items[0].name}
          fill
          sizes="(min-width: 1024px) 72rem, 100vw"
          unoptimized={!canOptimizeImage(items[0].image)}
          className="object-cover"
          style={{ objectPosition: `50% ${items[0].focusY}%` }}
        />
        <StripCaption item={items[0]} />
      </div>
    );
  }

  const looped = [...items, ...items, ...items];
  const current = pos % count;
  const go = (step: number) => {
    setSettled(false);
    // Wait for the caption's quick fade-out to finish before the photos move, so its
    // edges are never visible sliding over them.
    setTimeout(() => setPos((p) => p + step), CAPTION_FADE_MS);
  };

  const settle = (e: React.TransitionEvent<HTMLUListElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (pos < count || pos >= count * 2) {
      setAnimate(false);
      setPos((p) => (p < count ? p + count : p - count));
    }
  };

  const handleTouchEnd = (x: number) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - x;
    touchStartX.current = null;
    if (Math.abs(diff) > 50) go(diff > 0 ? 1 : -1);
  };

  const noMotion = animate ? "" : "transition-none!";
  // The slot and the slide offset step by one narrow photo plus the gap between photos; both read
  // --gap, the same value the list's gap uses, so the caption always sits on its photo
  const slotStyle = {
    left: "calc(var(--lead) * (var(--narrow-w) + var(--gap)))",
    width: "var(--wide-w)",
    height: "calc(var(--wide-w) * var(--ratio))",
  };

  return (
    <div className="@container">
      {/* Slot sizes. Below desktop one photo fills the width; on desktop the middle
          one is wide and its neighbours are narrow, all the same height. --gap is the space
          between photos (12px); the three visible photos give up 8px each (3 x 8 = 2 gaps of 12),
          so narrow + gap + wide + gap + narrow is exactly the full width. */}
      <div
        className="[--gap:12px] [--lead:0] [--narrow-w:100cqw] [--wide-w:100cqw] [--ratio:1] lg:[--ratio:0.5625] lg:[--lead:1] lg:[--narrow-w:calc(25cqw-8px)] lg:[--wide-w:calc(50cqw-8px)] flex flex-col gap-3 sm:gap-9"
        style={{ "--pos": pos } as CSSProperties}
      >
        <div className="group/strip relative">
          {/* Soft glow around the middle slot, shown while the strip is hovered. It sits behind
              the photos (they are opaque), so it only shows past their edges and never over them. */}
          <div aria-hidden="true" className="absolute top-0 z-0" style={slotStyle}>
            <div className="absolute inset-0 sm:rounded-sm opacity-0 shadow-[0_0_48px_12px] shadow-crimson/40 transition-opacity duration-500 group-hover/strip:opacity-100 motion-reduce:transition-none" />
          </div>

          <div
            className="relative z-10 overflow-hidden"
            onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0].clientX)}
          >
            <ul
              aria-label="Our services"
              onTransitionEnd={settle}
              className={`flex transition-transform duration-500 ease-in-out motion-reduce:transition-none ${noMotion}`}
              style={{
                gap: "var(--gap)",
                transform: "translateX(calc(-1 * (var(--pos) - var(--lead)) * (var(--narrow-w) + var(--gap))))",
              }}
            >
              {looped.map((item, k) => (
                <li
                  key={k}
                  aria-hidden={k !== pos}
                  className={`relative shrink-0 overflow-hidden sm:rounded-sm transition-[width] duration-500 ease-in-out motion-reduce:transition-none ${noMotion}`}
                  style={{
                    width: k === pos ? "var(--wide-w)" : "var(--narrow-w)",
                    height: "calc(var(--wide-w) * var(--ratio))",
                  }}
                >
                  <Image
                    loading={Math.abs(k - pos) <= 3 ? "eager" : "lazy"}
                    src={item.image}
                    alt={k === pos ? item.name : ""}
                    fill
                    sizes="(min-width: 1024px) 50vw, 85vw"
                    unoptimized={!canOptimizeImage(item.image)}
                    className="object-cover"
                    style={{ objectPosition: `50% ${item.focusY}%` }}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Over the middle slot: the service details, and the arrows on its edges. Fixed in
              place, so keyboard focus is kept while the photos pan underneath. */}
          <div className="pointer-events-none absolute top-0 z-20" style={slotStyle}>
            <StripCaption item={items[shownIndex] ?? items[current]} visible={settled} />
            <Button variant="bare" type="button" aria-label="Previous photo" onClick={() => go(-1)} className={`${ARROW_BUTTON} left-4`}>
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <Button variant="bare" type="button" aria-label="Next photo" onClick={() => go(1)} className={`${ARROW_BUTTON} right-4`}>
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3" aria-hidden="true">
          {items.map((item, i) => (
            <span
              key={item.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-crimson" : "w-2 bg-crimson-light"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
