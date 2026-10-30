// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { isRebookNudgeDays } from "../lib/rebookNudge";

vi.mock("../server/db", () => ({ getSql: () => vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { sendRebookNudgeEmails } = await import("../server/email");
const { isValidUnsubscribe, unsubscribeUrl } = await import("../server/unsubscribe");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isRebookNudgeDays", () => {
  it("accepts 0 (off) or 7 to 60 whole days", () => {
    for (const days of [0, 7, 14, 60]) expect(isRebookNudgeDays(days)).toBe(true);
    for (const days of [-1, 1, 6, 61, 14.5, Number.NaN]) expect(isRebookNudgeDays(days)).toBe(false);
  });
});

describe("the unsubscribe link", () => {
  it("is signed for one client, so it can't be made for another", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const url = new URL(unsubscribeUrl(42)!);
    expect(url.pathname).toBe("/api/unsubscribe");
    expect(url.searchParams.get("u")).toBe("42");
    const token = url.searchParams.get("t")!;
    expect(isValidUnsubscribe(42, token)).toBe(true);
    expect(isValidUnsubscribe(43, token)).toBe(false);
    expect(isValidUnsubscribe(42, token.slice(0, -1) + (token.endsWith("0") ? "1" : "0"))).toBe(false);
    expect(isValidUnsubscribe(42, "")).toBe(false);
    expect(isValidUnsubscribe(42, "short")).toBe(false);
  });

  it("can't be made, or accepted, without the secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    const token = new URL(unsubscribeUrl(42)!).searchParams.get("t")!;
    vi.stubEnv("CRON_SECRET", "");
    expect(unsubscribeUrl(42)).toBeNull();
    expect(isValidUnsubscribe(42, token)).toBe(false);
  });

  it("is different under another secret", () => {
    vi.stubEnv("CRON_SECRET", "one");
    const one = new URL(unsubscribeUrl(42)!).searchParams.get("t")!;
    vi.stubEnv("CRON_SECRET", "two");
    expect(isValidUnsubscribe(42, one)).toBe(false);
  });
});

const visit = (over: object = {}) => ({
  user_id: 42, email: "ana@x.test", first_name: "Ana", service_id: 4, service_name: "Gel Manicure", nailist_name: "Maxine",
  appointment_date: "2026-10-06", daysSince: 14, unsubscribeUrl: "https://clawholicsbymax.com/api/unsubscribe?u=42&t=abc", ...over,
});

type Sent = { to: string; subject: string; html: string; headers?: Record<string, string> };

describe("the rebooking email", () => {
  it("goes out as one Resend batch, with a link to book the same service and one to unsubscribe", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn(async (..._args: unknown[]) => Response.json({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await sendRebookNudgeEmails([visit(), visit({ user_id: 43, email: "bea@x.test", first_name: "Bea", unsubscribeUrl: "https://clawholicsbymax.com/api/unsubscribe?u=43&t=def" })]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails/batch");
    const sent = JSON.parse(String(init.body)) as Sent[];
    expect(sent.map((e) => e.to)).toEqual(["ana@x.test", "bea@x.test"]);
    expect(sent[0].subject).toBe("Ready for your next set? | Clawholics by Max");
    expect(sent[0].html).toContain("Hi Ana!");
    expect(sent[0].html).toContain("It's been 14 days since your");
    expect(sent[0].html).toContain("Gel Manicure");
    expect(sent[0].html).toContain("https://clawholicsbymax.com/services/4");
    // The unsubscribe link is in the footer, and in the header mail apps show; each client has their own
    expect(sent[0].html).toContain("https://clawholicsbymax.com/api/unsubscribe?u=42&amp;t=abc");
    expect(sent[0].html).toContain("You'll still get emails about your bookings");
    expect(sent[0].headers).toEqual({
      "List-Unsubscribe": "<https://clawholicsbymax.com/api/unsubscribe?u=42&t=abc>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(sent[1].headers?.["List-Unsubscribe"]).toContain("u=43");
  });

  it("refuses to send a promotional email without an unsubscribe link", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendRebookNudgeEmails([visit(), visit({ unsubscribeUrl: null })])).rejects.toThrow(/unsubscribe/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when Resend refuses the batch, so the visits can be put back for the next run", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "Daily quota exceeded" }, { status: 429 })));
    await expect(sendRebookNudgeEmails([visit()])).rejects.toThrow("Daily quota exceeded");
  });
});
