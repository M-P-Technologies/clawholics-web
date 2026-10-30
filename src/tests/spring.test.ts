import { describe, expect, it } from "vitest";
import { project, rubberband } from "@/lib/spring";

describe("spring helpers", () => {
  it("projects a flick further the faster it is", () => {
    expect(project(0)).toBe(0);
    expect(project(1000)).toBeGreaterThan(project(500));
    expect(project(-1000)).toBeLessThan(0);
  });

  it("rubber-bands: follows less the further past the edge, never past the dimension", () => {
    expect(rubberband(0, 400)).toBe(0);
    expect(Math.abs(rubberband(-50, 400))).toBeLessThan(50);
    expect(Math.abs(rubberband(-500, 400))).toBeLessThan(400 * 0.55);
    expect(rubberband(-50, 400)).toBeLessThan(0);
  });
});
