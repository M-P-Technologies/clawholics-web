import { useId } from "react";
import { BOW_PATH } from "./bowPath";

// The brand bow (bow.svg) being tied, on a loop: the knot pops in the middle, then the two
// loops and the two tails grow outward from it. The final frame is exactly the bow artwork, because
// the animation only reveals it through a mask: thick strokes laid along the ribbon, in the
// order a ribbon is tied. The timeline lives in globals.css (.tie-*), and with reduced
// motion the finished bow just sits there.
//
// Coordinates are in the bow's own 564x658 viewBox. Every stroke starts at the knot and runs
// out to the end of its part of the ribbon, so it is drawn from the middle outward.
const TAIL_LEFT = "M286 149 C 242 201 216 266 220 322 C 200 368 121 399 60 451 C 12 520 12 580 32 637";
const TAIL_RIGHT = "M310 120 C 310 165 347 189 411 214 C 463 258 483 322 482 403 C 492 475 524 516 556 524";
const LOOP_LEFT = "M302 103 C 242 68 173 36 113 40 C 81 50 70 90 105 121 C 140 153 177 153 258 139 C 275 134 282 125 290 110";
const LOOP_RIGHT = "M322 100 C 379 56 435 20 483 10 C 520 12 528 40 528 60 C 520 100 504 109 451 143 C 395 157 346 149 322 129";

export const TyingBow = ({ className }: { className?: string }) => {
  // Several loaders can be on screen at once, so the mask id has to be unique per instance
  const maskId = `tie-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  return (
    <svg
      viewBox="0 0 564 658"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="564" height="658">
          <g fill="none" stroke="white" strokeWidth="72" strokeLinecap="round" strokeLinejoin="round">
            <path className="tie-stroke tie-tail-left" pathLength={1} d={TAIL_LEFT} />
            <path className="tie-stroke tie-tail-right" pathLength={1} d={TAIL_RIGHT} />
            <path className="tie-stroke tie-loop-left" pathLength={1} d={LOOP_LEFT} />
            <path className="tie-stroke tie-loop-right" pathLength={1} d={LOOP_RIGHT} />
          </g>
          <circle className="tie-knot" cx="310" cy="95" r="46" fill="white" />
        </mask>
      </defs>
      <g className="tie-bow" mask={`url(#${maskId})`}>
        <path d={BOW_PATH} />
      </g>
    </svg>
  );
};
