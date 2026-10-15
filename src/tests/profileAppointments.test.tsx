import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentSheet from "@/components/features/client/appointments/AppointmentSheet";
import type { AppointmentView } from "@/types/profile";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/features/client/appointments/PaymentProofCard", () => ({
  default: ({ appointment }: { appointment: { id: number; status: string } }) =>
    appointment.status === "awaiting_proof" ? <div id={`proof-${appointment.id}`}>proof card</div> : null,
}));

const make = (id: number, over: Partial<AppointmentView> = {}, status = "confirmed"): AppointmentView => ({
  appt: { id, service_name: `Service ${id}`, nailist_id: 1, nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "09:00-11:00", status },
  displayStatus: status, remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true, statusLabel: status,
  dateLabel: "October 20, 2026", timeLabel: "9:00 AM - 11:00 AM", canPay: false, payLabel: "", isLocked: false, ...over,
});
const sheetProps = () => ({
  photo: "", now: 0, tokenFetcher: async () => "t", clerkId: "u",
  onClose: vi.fn(), onPay: vi.fn(), onReschedule: vi.fn(), onCancel: vi.fn(), onProofUploaded: vi.fn(), onSubmitReview: vi.fn(async () => undefined),
});

describe("AppointmentSheet", () => {
  it("is closed with no appointment, and shows details with the actions that apply", () => {
    const p = sheetProps();
    const { rerender } = render(<AppointmentSheet view={null} {...p} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<AppointmentSheet view={make(1)} {...p} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Service 1");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reschedule" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel appointment" }));
    expect(p.onReschedule).toHaveBeenCalled();
    expect(p.onCancel).toHaveBeenCalled();
  });

  it("offers payment while the hold runs, and shows the payment proof card for an appointment awaiting proof", () => {
    const p = sheetProps();
    const { rerender } = render(<AppointmentSheet view={make(1, { canPay: true, payLabel: "9:35", canReschedule: false })} {...p} />);
    fireEvent.click(screen.getByRole("button", { name: /Complete payment/ }));
    expect(p.onPay).toHaveBeenCalled();
    rerender(<AppointmentSheet view={make(2, { canReschedule: false }, "awaiting_proof")} {...p} />);
    expect(document.getElementById("proof-2")).not.toBeNull();
  });

  it("explains a locked reschedule instead of hiding it", () => {
    render(<AppointmentSheet view={make(1, { canReschedule: false, isLocked: true })} {...sheetProps()} />);
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeDisabled();
    expect(screen.getByText(/Changes close 3 days before/)).toBeInTheDocument();
  });

  it("asks for a review of a completed visit only, and sends the stars and words", async () => {
    const p = sheetProps();
    const { rerender } = render(<AppointmentSheet view={make(1)} {...p} />);
    expect(screen.queryByRole("region", { name: "Leave a review" })).toBeNull();
    rerender(<AppointmentSheet view={make(3, { canReschedule: false, canCancel: false }, "COMPLETED")} {...p} />);
    const form = within(screen.getByRole("region", { name: "Leave a review" }));
    expect(form.getByRole("button", { name: "Send review" })).toBeDisabled(); // no stars yet
    fireEvent.click(form.getByRole("radio", { name: "5 stars" }));
    fireEvent.change(form.getByLabelText("Your review"), { target: { value: "Loved it" } });
    fireEvent.click(form.getByRole("button", { name: "Send review" }));
    await waitFor(() => expect(p.onSubmitReview).toHaveBeenCalledWith(3, { rating: 5, comment: "Loved it", photo: null }));
  });

  it("shows the review already left instead of the form", () => {
    const review = { id: 1, appointment_id: 3, rating: 4, comment: "So pretty", photo_url: "https://images.test/reviews/a.webp", created_at: "2026-10-21 02:00:00" };
    render(<AppointmentSheet view={make(3, { canReschedule: false, canCancel: false }, "completed")} {...sheetProps()} review={review} />);
    const left = within(screen.getByRole("region", { name: "Your review" }));
    expect(left.getByRole("img", { name: "4 out of 5 stars" })).toBeInTheDocument();
    expect(left.getByText("So pretty")).toBeInTheDocument();
    expect(left.getByRole("img", { name: "Your review photo" })).toHaveAttribute("src", review.photo_url);
    expect(screen.queryByRole("button", { name: "Send review" })).toBeNull();
  });
});

