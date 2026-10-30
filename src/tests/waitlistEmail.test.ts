// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({ getSql: () => vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { sendWaitlistOpenedEmails } = await import("../server/email");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type Sent = { to: string; subject: string; html: string };

describe("the waitlist email", () => {
  it("goes out as one Resend batch, saying what opened up and linking to book it", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn(async (..._args: unknown[]) => Response.json({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await sendWaitlistOpenedEmails([
      { email: "ana@x.test", first_name: "Ana", service_id: 4, service_name: "Gel Manicure", nailist_name: "Maxine", date: "2026-10-21" },
      { email: "bea@x.test", first_name: null, service_id: 5, service_name: "Soft Gel", nailist_name: null, date: "2026-10-21" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails/batch");
    const [ana, bea] = JSON.parse(String(init.body)) as Sent[];
    expect(ana.to).toBe("ana@x.test");
    expect(ana.subject).toBe("A time opened up | Clawholics by Max");
    for (const text of ["Hi Ana!", "Wednesday, October 21, 2026", "Gel Manicure", "with Maxine", "https://clawholicsbymax.com/services/4"]) {
      expect(ana.html).toContain(text);
    }
    // Asked for any artist: it says so, and doesn't name one; no first name reads "there"
    expect(bea.html).toContain("Hi there!");
    expect(bea.html).toContain("Any available artist");
    expect(bea.html).not.toContain(" with ");
  });

  it("throws when Resend refuses the batch, so the entries can be kept", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "Daily quota exceeded" }, { status: 429 })));
    await expect(
      sendWaitlistOpenedEmails([{ email: "ana@x.test", first_name: "Ana", service_id: 4, service_name: "Gel", nailist_name: null, date: "2026-10-21" }]),
    ).rejects.toThrow("Daily quota exceeded");
  });
});
