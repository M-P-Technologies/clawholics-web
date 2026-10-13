import "server-only";

const TICK_MS = 250;
/** The most one tick may count, however long the event loop was blocked */
const MAX_TICK_MS = 2 * TICK_MS;

/**
 * Resolves with `value` once `ms` of *working* time has passed. A stretch when the event loop
 * was blocked (the dev server compiling a route or compacting its cache, sometimes for 20-50s)
 * counts as at most MAX_TICK_MS, and it resolves only after the I/O that was waiting has been
 * handled (setImmediate runs after the poll phase). A plain setTimeout would fire first, before
 * the database's answers that arrived meanwhile were read, and call a healthy request stuck.
 */
export function workingTimeWait<T>(ms: number, value: T) {
  let elapsed = 0;
  let last = Date.now();
  let timer: ReturnType<typeof setInterval> | undefined;
  let settled = false;
  const promise = new Promise<T>((resolve) => {
    timer = setInterval(() => {
      const now = Date.now();
      elapsed += Math.min(now - last, MAX_TICK_MS);
      last = now;
      if (elapsed >= ms && !settled) {
        settled = true;
        clearInterval(timer);
        setImmediate(() => resolve(value));
      }
    }, TICK_MS);
  });
  return {
    promise,
    cancel: () => {
      settled = true;
      clearInterval(timer);
    },
  };
}
