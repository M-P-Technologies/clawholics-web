import { describe, expect, it } from "vitest";
import { parseServerTime } from "../services/serverTime";
import {
  formatDuration,
  getProofState,
  isActiveAppointmentStatus,
  isProofOverdue,
  type ProofAppointment,
} from "../services/proofState";

const NOW = Date.parse("2026-10-09T12:00:00Z");
const HOUR = 3_600_000;

const proof = (status: "PENDING" | "APPROVED" | "REJECTED", admin_note: string | null = null) => ({
  id: 1,
  status,
  image_url: "https://img/p.webp",
  admin_note,
  created_at: "2026-10-09T11:00:00Z",
});

const appt = (over: Partial<ProofAppointment> = {}): ProofAppointment => ({
  status: "AWAITING_PROOF",
  proof_due_at: new Date(NOW + 23 * HOUR).toISOString(),
  latest_proof: null,
  ...over,
});

describe("parseServerTime", () => {
  it("reads ISO with Z as UTC", () => {
    expect(parseServerTime("2026-10-09T12:00:00Z")).toBe(NOW);
  });
  it("reads SQLite's 'YYYY-MM-DD HH:MM:SS' as UTC, not local time", () => {
    expect(parseServerTime("2026-10-09 12:00:00")).toBe(NOW);
  });
  it("reads ISO without a zone as UTC", () => {
    expect(parseServerTime("2026-10-09T12:00:00")).toBe(NOW);
  });
  it("returns NaN for empty or garbage input", () => {
    expect(parseServerTime(null)).toBeNaN();
    expect(parseServerTime("")).toBeNaN();
    expect(parseServerTime("soon")).toBeNaN();
  });
});

describe("getProofState", () => {
  it("shows nothing for old confirmed appointments that never had a proof", () => {
    expect(getProofState(appt({ status: "CONFIRMED", proof_due_at: null }), NOW)).toEqual({ kind: "none" });
  });

  it("shows nothing for pending, cancelled, completed and refunded", () => {
    for (const status of ["PENDING", "CANCELLED", "COMPLETED", "REFUNDED", ""]) {
      expect(getProofState(appt({ status }), NOW)).toEqual({ kind: "none" });
    }
  });

  it("is case and whitespace insensitive about the status", () => {
    expect(getProofState(appt({ status: " awaiting_proof " }), NOW).kind).toBe("needs_proof");
  });

  it("needs a proof before the deadline, with the time left", () => {
    expect(getProofState(appt(), NOW)).toEqual({ kind: "needs_proof", msLeft: 23 * HOUR });
  });

  it("is overdue exactly at the deadline", () => {
    expect(getProofState(appt({ proof_due_at: new Date(NOW).toISOString() }), NOW)).toEqual({
      kind: "overdue",
      msOver: 0,
    });
  });

  it("is overdue after the deadline", () => {
    const state = getProofState(appt({ proof_due_at: new Date(NOW - 2 * HOUR).toISOString() }), NOW);
    expect(state).toEqual({ kind: "overdue", msOver: 2 * HOUR });
  });

  it("does not crash when the deadline is missing or unreadable", () => {
    expect(getProofState(appt({ proof_due_at: null }), NOW)).toEqual({ kind: "needs_proof", msLeft: null });
    expect(getProofState(appt({ proof_due_at: "later" }), NOW)).toEqual({ kind: "needs_proof", msLeft: null });
  });

  it("uses a SQLite-format deadline as UTC", () => {
    const state = getProofState(appt({ proof_due_at: "2026-10-09 13:00:00" }), NOW);
    expect(state).toEqual({ kind: "needs_proof", msLeft: HOUR });
  });

  it("is in review when the latest proof is pending", () => {
    const p = proof("PENDING");
    expect(getProofState(appt({ latest_proof: p }), NOW)).toEqual({ kind: "in_review", proof: p });
  });

  it("is rejected with the admin note when the latest proof was rejected", () => {
    const p = proof("REJECTED", "  Blurry  ");
    expect(getProofState(appt({ latest_proof: p }), NOW)).toEqual({ kind: "rejected", proof: p, note: "Blurry" });
  });

  it("stays rejected even after the deadline, so the client can re-upload", () => {
    const p = proof("REJECTED");
    const state = getProofState(
      appt({ latest_proof: p, proof_due_at: new Date(NOW - HOUR).toISOString() }),
      NOW,
    );
    expect(state.kind).toBe("rejected");
  });

  it("isProofOverdue flags a rejected proof past the deadline, but not before it or when pending/approved", () => {
    const past = new Date(NOW - HOUR).toISOString();
    const future = new Date(NOW + HOUR).toISOString();
    expect(isProofOverdue(appt({ latest_proof: proof("REJECTED"), proof_due_at: past }), NOW)).toBe(true);
    expect(isProofOverdue(appt({ latest_proof: proof("REJECTED"), proof_due_at: future }), NOW)).toBe(false);
    expect(isProofOverdue(appt({ latest_proof: proof("PENDING"), proof_due_at: past }), NOW)).toBe(false);
    expect(isProofOverdue(appt({ latest_proof: proof("APPROVED"), proof_due_at: past }), NOW)).toBe(false);
    expect(isProofOverdue(appt({ proof_due_at: past }), NOW)).toBe(true);
  });

  it("is approved for an approved proof, and for a confirmed appointment with an approved proof", () => {
    const p = proof("APPROVED");
    expect(getProofState(appt({ latest_proof: p }), NOW).kind).toBe("approved");
    expect(getProofState(appt({ status: "CONFIRMED", latest_proof: p }), NOW).kind).toBe("approved");
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(0)).toBe("less than a minute");
    expect(formatDuration(59_000)).toBe("less than a minute");
    expect(formatDuration(60_000)).toBe("1m");
    expect(formatDuration(45 * 60_000)).toBe("45m");
    expect(formatDuration(HOUR)).toBe("1h 0m");
    expect(formatDuration(23 * HOUR + 59 * 60_000 + 59_000)).toBe("23h 59m");
  });
  it("never goes negative", () => {
    expect(formatDuration(-5000)).toBe("less than a minute");
  });
});

describe("isActiveAppointmentStatus", () => {
  it("is true only for pending, awaiting_proof and confirmed", () => {
    for (const s of ["PENDING", "awaiting_proof", " Confirmed "]) expect(isActiveAppointmentStatus(s)).toBe(true);
    for (const s of ["COMPLETED", "CANCELLED", "REFUNDED", "", null, undefined]) {
      expect(isActiveAppointmentStatus(s)).toBe(false);
    }
  });
});

describe("getProofState for a booking paid online", () => {
  it("waits for no screenshot once the payment confirmed it, or while it's still pending", () => {
    expect(getProofState(appt({ status: "CONFIRMED", proof_due_at: null }), NOW)).toEqual({ kind: "none" });
    expect(getProofState(appt({ status: "PENDING", proof_due_at: null, latest_proof: proof("PENDING") }), NOW)).toEqual({ kind: "none" });
  });
});
