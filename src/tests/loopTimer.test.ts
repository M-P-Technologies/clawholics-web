// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workingTimeWait } from "../server/loopTimer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("working-time wait", () => {
  it("fires after the given working time", async () => {
    const fired = vi.fn();
    workingTimeWait(1000, "done").promise.then(fired);
    await vi.advanceTimersByTimeAsync(750);
    expect(fired).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(fired).toHaveBeenCalledWith("done");
  });

  it("counts a stretch when the event loop was blocked (a dev server compiling) as half a second at most", async () => {
    const fired = vi.fn();
    workingTimeWait(10_000, "late").promise.then(fired);
    await vi.advanceTimersByTimeAsync(1_000);
    // The loop is blocked for 20s: no ticks run, but the clock moves on
    vi.setSystemTime(Date.now() + 20_000);
    await vi.advanceTimersByTimeAsync(1_000);
    // A plain 10s timer would have fired by now; only about 2.5s of working time has passed
    expect(fired).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(8_000);
    expect(fired).toHaveBeenCalledWith("late");
  });

  it("can be cancelled", async () => {
    const fired = vi.fn();
    const wait = workingTimeWait(500, true);
    wait.promise.then(fired);
    wait.cancel();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fired).not.toHaveBeenCalled();
  });
});
