import { describe, expect, it } from "vitest";
import type { Appointment } from "../services/appointmentService";
import { matchesAppointmentFilter } from "../services/appointmentFilters";

const NOW = Date.parse("2026-10-09T12:00:00Z");

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 1, user_id: 5, service_name: "Gel", nailist_name: "Ana",
  appointment_date: "2026-10-12", appointment_time: "10:00-11:00",
  status: "CONFIRMED", ...over,
});

describe("matchesAppointmentFilter", () => {
  it("ALL matches everything", () => {
    expect(matchesAppointmentFilter(appt({ status: "CANCELLED" }), "ALL", NOW)).toBe(true);
  });

  it("matches a plain status case-insensitively", () => {
    expect(matchesAppointmentFilter(appt({ status: "confirmed" }), "CONFIRMED", NOW)).toBe(true);
    expect(matchesAppointmentFilter(appt({ status: "CANCELLED" }), "CONFIRMED", NOW)).toBe(false);
  });

  it("TO_COMPLETE matches a confirmed visit that is over, and nothing else", () => {
    const over = appt({ appointment_date: "2026-10-08" });
    expect(matchesAppointmentFilter(over, "TO_COMPLETE", NOW)).toBe(true);
    expect(matchesAppointmentFilter(appt(), "TO_COMPLETE", NOW)).toBe(false);
    expect(matchesAppointmentFilter({ ...over, status: "COMPLETED" }, "TO_COMPLETE", NOW)).toBe(false);
  });
});
