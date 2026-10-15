import { describe, expect, it } from "vitest";
import { appointmentToTrack, manilaTime, trackerSteps } from "@/features/appointments/lib/bookingTracker";
import type { ClientAppointment } from "@/features/clients/api/clientNotesService";

const appt = (over: Partial<ClientAppointment> = {}): ClientAppointment => ({
  id: 1, appointment_date: "2026-10-20", appointment_time: "10:00-11:00", service_name: "Gel", nailist_name: "Maxine",
  status: "PENDING", price: 800, booked_at: "2026-10-10 05:55:29", ...over,
});
const states = (a: ClientAppointment) => trackerSteps(a).map((s) => s.state);

describe("booking tracker", () => {
  it("shows a new booking waiting for its downpayment", () => {
    const steps = trackerSteps(appt());
    expect(steps.map((s) => s.state)).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(steps[0].when).toBe("Oct 10, 2026, 1:55 PM"); // booked, in Manila time
    expect(steps[1].detail).toBe("Waiting for the downpayment");
  });

  it("follows a payment proof from sent to approved", () => {
    const sent = trackerSteps(appt({ status: "AWAITING_PROOF", proof_status: "PENDING", proof_sent_at: "2026-10-10 06:00:00" }));
    expect(sent[1]).toMatchObject({ state: "current", detail: "Payment proof sent, waiting for review", when: "Oct 10, 2026, 2:00 PM" });
    const approved = trackerSteps(appt({ status: "CONFIRMED", proof_status: "APPROVED", proof_reviewed_at: "2026-10-11 01:00:00" }));
    expect(approved.map((s) => s.state)).toEqual(["done", "done", "done", "current"]);
    expect(approved[1].detail).toBe("Payment proof approved");
  });

  it("counts a confirmed booking with no payment on record as settled with the salon", () => {
    expect(trackerSteps(appt({ status: "CONFIRMED" }))[1]).toMatchObject({ state: "done", detail: "Settled with the salon" });
  });

  it("is all done once the visit is completed", () => {
    expect(states(appt({ status: "COMPLETED", payment_status: "PAID" }))).toEqual(["done", "done", "done", "done"]);
  });

  it("stops a cancelled booking at the step it hadn't reached", () => {
    const steps = trackerSteps(appt({ status: "CANCELLED" }));
    expect(steps.map((s) => s.state)).toEqual(["done", "stopped", "upcoming", "upcoming"]);
    expect(steps[1].detail).toBe("Cancelled before this step");
    expect(states(appt({ status: "REFUNDED", payment_status: "PAID" }))).toEqual(["done", "done", "stopped", "upcoming"]);
  });

  it("tracks the soonest booking still under way, or else the latest", () => {
    const list = [
      appt({ id: 3, appointment_date: "2026-12-01", status: "CONFIRMED" }),
      appt({ id: 2, appointment_date: "2026-11-01", status: "PENDING" }),
      appt({ id: 1, appointment_date: "2026-09-01", status: "COMPLETED" }),
    ];
    expect(appointmentToTrack(list, "2026-10-15")?.id).toBe(2);
    expect(appointmentToTrack(list, "2026-12-15")?.id).toBe(3);
    expect(appointmentToTrack([], "2026-10-15")).toBeNull();
  });

  it("reads server times as UTC and shows them in Manila", () => {
    expect(manilaTime("2026-10-10 16:30:00")).toBe("Oct 11, 2026, 12:30 AM");
    expect(manilaTime(null)).toBeUndefined();
  });
});
