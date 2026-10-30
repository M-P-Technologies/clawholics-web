// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({ getSql: () => vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { sendConfirmationEmail, sendRescheduleEmails, sendAppointmentReminderEmails } = await import("../server/email");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type Sent = { to: string; subject: string; html: string; attachments?: { filename: string; content: string; content_type: string }[] };

/** Fakes Resend and returns what was sent to it */
function fakeResend() {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.spyOn(console, "error").mockImplementation(() => {});
  const calls: { url: string; body: Sent | Sent[] }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return Response.json({ id: "email_1", data: [] });
  }));
  return calls;
}

const decode = (content: string) => Buffer.from(content, "base64").toString("utf8");

const appt = {
  id: 7, email: "ana@x.test", client_name: "Ana Cruz", service_name: "Gel Manicure", nailist_name: "Maxine",
  appointment_date: "2026-10-21", appointment_time: "13:00-15:00", payment_status: "PAID", payment_amount: 500, payment_method: "QRPH",
  duration: "2 hrs", service_price: 800,
} as never;

describe("the confirmation email's calendar", () => {
  it("attaches the visit as a calendar file and links Google Calendar", async () => {
    const calls = fakeResend();
    await sendConfirmationEmail(appt);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    const sent = calls[0].body as Sent;
    expect(sent.attachments).toHaveLength(1);
    expect(sent.attachments![0]).toMatchObject({ filename: "clawholics-appointment-7.ics", content_type: "text/calendar" });
    const ics = decode(sent.attachments![0].content);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:appointment-7@clawholicsbymax.com");
    expect(ics).toContain("DTSTART:20261021T050000Z");
    expect(sent.html).toContain("Add to Google Calendar");
    expect(sent.html).toContain("https://calendar.google.com/calendar/render");
    expect(sent.html).toContain("attached calendar file");
  });

  it("is still sent, without a calendar, when the visit's time can't be read", async () => {
    const calls = fakeResend();
    await sendConfirmationEmail({ ...(appt as object), appointment_time: "sometime" } as never);
    const sent = calls[0].body as Sent;
    expect(sent.attachments).toBeUndefined();
    expect(sent.html).not.toContain("Add to Google Calendar");
  });
});

describe("the reschedule email's calendar", () => {
  it("attaches the new time under the same event id, so the old one moves", async () => {
    const calls = fakeResend();
    await sendRescheduleEmails({
      email: "ana@x.test", name: "Ana Cruz", service: "Gel Manicure", oldDate: "2026-10-21", oldTime: "13:00-15:00",
      newDate: "2026-10-28", newTime: "10:00-12:00", artist: "Maxine", appointmentId: 7, byClient: false,
    });
    expect(calls).toHaveLength(1);
    const sent = calls[0].body as Sent;
    const ics = decode(sent.attachments![0].content);
    expect(ics).toContain("UID:appointment-7@clawholicsbymax.com");
    expect(ics).toContain("DTSTART:20261028T020000Z");
    expect(ics).not.toContain("20261021");
  });
});

describe("the reminder's calendar", () => {
  it("links Google Calendar but attaches nothing, since Resend's batch endpoint takes no attachments", async () => {
    const calls = fakeResend();
    await sendAppointmentReminderEmails([
      { id: 7, email: "ana@x.test", first_name: "Ana", service_name: "Gel Manicure", nailist_name: "Maxine", appointment_date: "2026-10-21", appointment_time: "13:00-15:00" },
    ]);
    expect(calls[0].url).toBe("https://api.resend.com/emails/batch");
    const [email] = calls[0].body as Sent[];
    expect(email.attachments).toBeUndefined();
    expect(email.html).toContain("Add to Google Calendar");
    expect(email.html).not.toContain("attached calendar file");
  });
});
