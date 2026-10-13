import { afterEach, describe, expect, it, vi } from "vitest";
import { describeChange, describePoints, peso, percent } from "@/lib/dashboardFormat";
import { fetchDashboard } from "@/services/dashboardService";

afterEach(() => vi.unstubAllGlobals());

describe("dashboard formatting", () => {
  it("writes pesos and percentages", () => {
    expect(peso(0)).toBe("₱0");
    expect(peso(12345)).toBe("₱12,345");
    expect(percent(0.2222)).toBe("22%");
    expect(percent(0)).toBe("0%");
    expect(percent(null)).toBe("–");
  });

  it("describes a change against the previous period", () => {
    expect(describeChange(120, 100)).toEqual({ kind: "up", label: "+20%" });
    expect(describeChange(80, 100)).toEqual({ kind: "down", label: "-20%" });
    expect(describeChange(100, 100)).toEqual({ kind: "flat", label: "0%" });
    expect(describeChange(5, 0)).toEqual({ kind: "new", label: "new" });
    expect(describeChange(0, 0)).toEqual({ kind: "flat", label: "0%" });
    expect(describeChange(null, 5)).toEqual({ kind: "none", label: "–" });
    expect(describeChange(5, null)).toEqual({ kind: "none", label: "–" });
  });

  it("describes a change in a rate in percentage points", () => {
    expect(describePoints(0.5, 0.4)).toEqual({ kind: "up", label: "+10 pts" });
    expect(describePoints(0.2, 0.3)).toEqual({ kind: "down", label: "-10 pts" });
    expect(describePoints(0.25, 0.25)).toEqual({ kind: "flat", label: "0 pts" });
    expect(describePoints(null, 0.3)).toEqual({ kind: "none", label: "–" });
    expect(describePoints(0.3, null)).toEqual({ kind: "none", label: "–" });
  });
});

describe("fetchDashboard", () => {
  it("asks for the range with the admin's credentials and returns the document", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ range: "week" }) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchDashboard("week", "tok", "admin_1");
    expect(result).toEqual({ range: "week" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/dashboard?range=week");
    expect(init.headers).toMatchObject({ Authorization: "Bearer tok", clerk_id: "admin_1", "x-clawholics-origin": "frontend" });
  });

  it("throws when the server refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }));
    await expect(fetchDashboard("month", "tok", "admin_1")).rejects.toThrow();
  });
});
