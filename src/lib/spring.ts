// A spring that starts from where the value is now, with the velocity it already has, so a
// drag handed to it carries on without a seam and can be grabbed again mid-flight.
// `response` is how quickly it gets there (seconds), `damping` 1 settles without overshoot,
// below 1 it bounces.

interface SpringOptions {
  from: number;
  to: number;
  /** px per second */
  velocity?: number;
  response?: number;
  damping?: number;
  onUpdate: (value: number) => void;
  onDone?: () => void;
}

const STEP = 1 / 240;

export function springTo({ from, to, velocity = 0, response = 0.35, damping = 1, onUpdate, onDone }: SpringOptions): () => void {
  const stiffness = (2 * Math.PI / response) ** 2;
  const friction = (4 * Math.PI * damping) / response;
  let x = from;
  let v = velocity;
  let last = performance.now();
  let frame = 0;
  let stopped = false;

  const tick = (now: number) => {
    if (stopped) return;
    let left = Math.min((now - last) / 1000, 0.064);
    last = now;
    while (left > 0) {
      const dt = Math.min(left, STEP);
      v += (-stiffness * (x - to) - friction * v) * dt;
      x += v * dt;
      left -= dt;
    }
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 5) {
      onUpdate(to);
      onDone?.();
      return;
    }
    onUpdate(x);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
  };
}

// The further past the edge, the less it follows
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (overshoot === 0) return 0;
  const sign = Math.sign(overshoot);
  const d = Math.abs(overshoot);
  return (sign * (d * dimension * constant)) / (dimension + constant * d);
}

// Where a flick would come to rest: exponential deceleration, like scrolling
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}
