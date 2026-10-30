// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({ getSql: () => vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { reminderDay } = await import("../server/reminders");
const { sendAppointmentReminderEmails } = await import("../server/email");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("reminderDay", () => {
  it("is tomorrow in Manila, at the 09:00 run", () => {
    // 09:00 on 20 Oct in Manila is 01:00 UTC
    expect(reminderDay(new Date(Date.UTC(2026, 9, 20, 1, 0)))).toBe("2026-10-21");
  });

  it("follows Manila's calendar, not UTC's", () => {
    // 17:00 UTC on the 20th is already 01:00 on the 21st in Manila
    expect(reminderDay(new Date(Date.UTC(2026, 9, 20, 17, 0)))).toBe("2026-10-22");
  });

  it("rolls over the end of a month and a year", () => {
    expect(reminderDay(new Date(Date.UTC(2026, 9, 31, 1, 0)))).toBe("2026-11-01");
    expect(reminderDay(new Date(Date.UTC(2026, 11, 31, 1, 0)))).toBe("2027-01-01");
  });
});

const booking = (id: number, over: object = {}) => ({
  id, email: `client${id}@x.test`, first_name: "Ana", service_name: "Gel Manicure", nailist_name: "Maxine",
  appointment_date: "2026-10-21", appointment_time: "13:00-15:00", ...over,
});

describe("the reminder email", () => {
  it("goes out as one Resend batch with the visit's details and the day-before words", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn(async (..._args: unknown[]) => Response.json({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await sendAppointmentReminderEmails([booking(7), booking(8, { first_name: "Bea" })]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails/batch");
    const sent = JSON.parse(String(init.body)) as { to: string; subject: string; html: string }[];
    expect(sent.map((e) => e.to)).toEqual(["client7@x.test", "client8@x.test"]);
    expect(sent[0].subject).toBe("Reminder: your appointment is tomorrow | Clawholics by Max");
    expect(sent[0].html).toContain("Hi Ana!");
    expect(sent[1].html).toContain("Hi Bea!");
    for (const text of ["Wednesday, October 21, 2026", "1:00 PM – 3:00 PM", "#7", "Gel Manicure", "Maxine", "tomorrow"]) {
      expect(sent[0].html).toContain(text);
    }
    // The visit is tomorrow, so changes are no longer made in the account: it points to the salon
    expect(sent[0].html).toContain("Plans changed?");
    expect(sent[0].html).not.toContain("Reschedule from your account");
  });

  it("throws when Resend refuses the batch, so the bookings can be put back for the next run", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "Daily quota exceeded" }, { status: 429 })));
    await expect(sendAppointmentReminderEmails([booking(7)])).rejects.toThrow("Daily quota exceeded");
  });

  it("throws without a Resend key, rather than marking the reminders as sent", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendAppointmentReminderEmails([booking(7)])).rejects.toThrow(/RESEND_API_KEY/);
  });
});
