import { describe, expect, it } from "vitest";
import type { Appointment } from "../services/appointmentService";
import { matchesAppointmentFilter } from "../services/appointmentFilters";

const NOW = Date.parse("2026-10-09T12:00:00Z");
const HOUR = 3_600_000;

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 1, user_id: 5, service_name: "Gel", nailist_name: "Ana",
  appointment_date: "2026-10-12", appointment_time: "10:00-11:00",
  status: "AWAITING_PROOF", proof_due_at: new Date(NOW + HOUR).toISOString(), latest_proof: null,
  ...over,
});


const pendingProof = {
  id: 1, status: "PENDING" as const, image_url: "https://img/p.webp", created_at: "2026-10-09T11:00:00Z",
};

describe("matchesAppointmentFilter", () => {
  it("ALL matches everything", () => {
    expect(matchesAppointmentFilter(appt({ status: "CANCELLED" }), "ALL", NOW)).toBe(true);
  });

  it("matches a plain status case-insensitively", () => {
    expect(matchesAppointmentFilter(appt({ status: "awaiting_proof" }), "AWAITING_PROOF", NOW)).toBe(true);
    expect(matchesAppointmentFilter(appt({ status: "CONFIRMED" }), "AWAITING_PROOF", NOW)).toBe(false);
  });

  it("PROOF_PENDING matches proofs waiting for review only", () => {
    expect(matchesAppointmentFilter(appt({ latest_proof: pendingProof }), "PROOF_PENDING", NOW)).toBe(true);
    expect(matchesAppointmentFilter(appt(), "PROOF_PENDING", NOW)).toBe(false);
    expect(
      matchesAppointmentFilter(appt({ latest_proof: { ...pendingProof, status: "REJECTED" } }), "PROOF_PENDING", NOW),
    ).toBe(false);
  });

  it("PROOF_OVERDUE matches past-deadline appointments with no proof", () => {
    const overdue = appt({ proof_due_at: new Date(NOW - HOUR).toISOString() });
    expect(matchesAppointmentFilter(overdue, "PROOF_OVERDUE", NOW)).toBe(true);
    expect(matchesAppointmentFilter(appt(), "PROOF_OVERDUE", NOW)).toBe(false);
    expect(
      matchesAppointmentFilter({ ...overdue, latest_proof: pendingProof }, "PROOF_OVERDUE", NOW),
    ).toBe(false);
  });

  it("old confirmed appointments never match a proof filter", () => {
    const old = appt({ status: "CONFIRMED", proof_due_at: null });
    expect(matchesAppointmentFilter(old, "PROOF_PENDING", NOW)).toBe(false);
    expect(matchesAppointmentFilter(old, "PROOF_OVERDUE", NOW)).toBe(false);
  });
});
