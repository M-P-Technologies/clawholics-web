import { useEffect, useRef } from "react";

interface PollingOptions {
  intervalMs: number;
  /** Give up after this long. Without it, polling only ends when the task says so. */
  maxMs?: number;
  /** Run the task right away. Turn off when the caller has already loaded the data once. */
  immediate?: boolean;
  /** Called once if the polling gave up because `maxMs` passed */
  onTimeout?: () => void;
}

// Runs `task` every `intervalMs`, but only while the tab is visible. Every call reads rows
// from the database, so a page left open in a background tab must not keep asking.
// - the task returns true when there is nothing left to wait for, which stops the polling
// - coming back to the tab refreshes right away instead of waiting for the next tick
// - a slow request is never overlapped by the next one
// Returns a function that stops the polling.
export function startPolling(task: () => Promise<boolean | void>, { intervalMs, maxMs, immediate = true, onTimeout }: PollingOptions) {
  const startedAt = Date.now();
  let stopped = false;
  let running = false;
  let lastRun = immediate ? 0 : Date.now();

  const stop = () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };

  const run = async () => {
    if (stopped || running) return;
    if (maxMs !== undefined && Date.now() - startedAt > maxMs) {
      stop();
      onTimeout?.();
      return;
    }

    running = true;
    lastRun = Date.now();
    try {
      if ((await task()) === true) stop();
    } finally {
      running = false;
    }
  };

  const onVisible = () => {
    if (document.visibilityState === "visible" && Date.now() - lastRun >= intervalMs) void run();
  };

  const timer = setInterval(() => {
    if (document.visibilityState === "visible") void run();
  }, intervalMs);
  document.addEventListener("visibilitychange", onVisible);
  if (immediate) void run();

  return stop;
}

export function usePolling(
  task: () => Promise<boolean | void>,
  options: PollingOptions & { enabled?: boolean; /** Change this to start polling again */ restartKey?: number },
) {
  const taskRef = useRef(task);
  const timeoutRef = useRef(options.onTimeout);
  const { enabled = true, intervalMs, maxMs, immediate, restartKey } = options;

  useEffect(() => {
    taskRef.current = task;
    timeoutRef.current = options.onTimeout;
  });

  useEffect(() => {
    if (!enabled) return;
    return startPolling(() => taskRef.current(), {
      intervalMs,
      maxMs,
      immediate,
      onTimeout: () => timeoutRef.current?.(),
    });
  }, [enabled, intervalMs, maxMs, immediate, restartKey]);
}
