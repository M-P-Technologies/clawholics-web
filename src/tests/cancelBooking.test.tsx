import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentDetailsModal from "@/components/features/admin/bookings/AppointmentDetailsModal";
import { canCancelBooking, cancelOutcome, cancelToast, manualStatusChoices, refundWindowOpen } from "@/lib/admin/cancelBooking";
import type { Appointment } from "@/services/appointmentService";

vi.mock("@/components/features/admin/clients/ClientNotesPanel", () => ({ default: () => <div>Private notes</div> }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken: async () => "tok", userId: "admin_1" }) }));
vi.mock("@/components/features/admin/bookings/ProofReviewPanel", () => ({ default: () => <div>Proof review</div> }));

// 2026-10-30 12:00 in Manila (04:00 UTC)
const NOW = Date.UTC(2026, 9, 30, 4, 0);

describe("the refund window (72 hours, Manila time)", () => {
  it("is open from exactly 72 hours before the visit", () => {
    expect(refundWindowOpen("2026-11-02", "12:00-14:00", NOW)).toBe(true);
    expect(refundWindowOpen("2026-11-02", "11:59", NOW)).toBe(false);
    expect(refundWindowOpen("2026-11-02", "12:00 PM", NOW)).toBe(true);
  });

  it("is closed for a date or time it can't read", () => {
    expect(refundWindowOpen("soon", "12:00", NOW)).toBe(false);
    expect(refundWindowOpen("2026-11-20", "noon", NOW)).toBe(false);
  });
});

describe("what cancelling does to the downpayment", () => {
  const far = { appointment_date: "2026-11-20", appointment_time: "10:00-12:00" };
  const near = { appointment_date: "2026-10-31", appointment_time: "10:00-12:00" };

  it("refunds a paid booking 72+ hours ahead, by hand when it was paid by proof", () => {
    expect(cancelOutcome({ ...far, paid_downpayment: 400, payment_status: "PAID", payment_method: "GCASH" }, NOW)).toBe("refund");
    expect(cancelOutcome({ ...far, paid_downpayment: 400, payment_status: "PAID", payment_method: "MANUAL" }, NOW)).toBe("manual-refund");
  });

  it("keeps the downpayment inside 72 hours", () => {
    expect(cancelOutcome({ ...near, paid_downpayment: 400, payment_status: "PAID" }, NOW)).toBe("keep");
  });

  it("has nothing to refund when nothing was paid", () => {
    expect(cancelOutcome({ ...far, payment_status: "PENDING" }, NOW)).toBe("unpaid");
    expect(cancelOutcome({ ...near }, NOW)).toBe("unpaid");
  });

  it("only bookings still to happen can be cancelled", () => {
    expect(["PENDING", "AWAITING_PROOF", "confirmed"].every(canCancelBooking)).toBe(true);
    expect(["COMPLETED", "CANCELLED", "REFUNDED", "NO_SHOW", ""].some(canCancelBooking)).toBe(false);
  });
});

describe("the message after cancelling", () => {
  it("says plainly when the admin still has money to send back", () => {
    const sent = cancelToast({ status: "REFUNDED" }, "Appointment #7");
    expect(sent).toEqual({ title: "Cancelled and refunded", message: "Appointment #7 is now refunded." });
    const byHand = cancelToast({ status: "REFUNDED", refundByHand: true, refundAmount: 500 }, "Appointment #7");
    expect(byHand.title).toBe("Cancelled: send the refund");
    expect(byHand.message).toMatch(/Send the ₱500 downpayment back/);
    expect(byHand.message).toMatch(/Refund to send/);
    expect(cancelToast({ status: "CANCELLED" }, "Appointment #7").title).toBe("Appointment cancelled");
  });
});

describe("the statuses an admin can pick by hand", () => {
  const ALL = ["PENDING", "AWAITING_PROOF", "CONFIRMED", "COMPLETED", "CANCELLED", "REFUNDED", "NO_SHOW"] as const;

  it("is the current status plus Confirmed, and No-show only from a confirmed visit", () => {
    expect(manualStatusChoices("PENDING", ALL)).toEqual(["PENDING", "CONFIRMED"]);
    expect(manualStatusChoices("CONFIRMED", ALL)).toEqual(["CONFIRMED", "NO_SHOW"]);
    expect(manualStatusChoices("NO_SHOW", ALL)).toEqual(["CONFIRMED", "NO_SHOW"]);
  });

  it("can re-activate a cancelled or refunded booking, and shows a completed one", () => {
    expect(manualStatusChoices("CANCELLED", ALL)).toEqual(["CONFIRMED", "CANCELLED"]);
    expect(manualStatusChoices("REFUNDED", ALL)).toEqual(["CONFIRMED", "REFUNDED"]);
    expect(manualStatusChoices("COMPLETED", ALL)).toEqual(["CONFIRMED", "COMPLETED"]);
  });
});

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 24, user_id: 73, first_name: "Cherie", last_name: "Estrera", email: "cherie@x.test", phone: "09755222061",
  service_name: "Softgel Extensions", nailist_name: "Miss Pring", appointment_date: "2099-06-10", appointment_time: "09:00-11:00",
  status: "CONFIRMED", payment_status: "PAID", payment_amount: 500, payment_method: "GCASH", payment_reference: "appt-24", paid_downpayment: 400, ...over,
});

describe("Cancel appointment in the details drawer", () => {
  it("asks first, says what happens to the downpayment, then cancels", async () => {
    const onCancelBooking = vi.fn().mockResolvedValue(undefined);
    render(<AppointmentDetailsModal appointment={appt()} onClose={vi.fn()} onStatusChange={vi.fn()} onCancelBooking={onCancelBooking} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Cancel appointment" }));
    const ask = within(screen.getByRole("alertdialog", { name: "Cancel this appointment?" }));
    expect(ask.getByText(/₱400 downpayment is refunded/)).toBeInTheDocument();
    expect(onCancelBooking).not.toHaveBeenCalled();
    await user.click(ask.getByRole("button", { name: "Cancel & refund" }));
    expect(onCancelBooking).toHaveBeenCalledWith(24);
  });

  it("Keep it closes the question without cancelling", async () => {
    const onCancelBooking = vi.fn();
    render(<AppointmentDetailsModal appointment={appt()} onClose={vi.fn()} onStatusChange={vi.fn()} onCancelBooking={onCancelBooking} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Cancel appointment" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onCancelBooking).not.toHaveBeenCalled();
  });

  it("is left out for a finished booking, and without a handler", () => {
    const { rerender } = render(<AppointmentDetailsModal appointment={appt({ status: "COMPLETED" })} onClose={vi.fn()} onStatusChange={vi.fn()} onCancelBooking={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cancel appointment" })).not.toBeInTheDocument();
    rerender(<AppointmentDetailsModal appointment={appt()} onClose={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cancel appointment" })).not.toBeInTheDocument();
  });
});
