import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentDetailsModal from "@/features/appointments/components/AppointmentDetailsModal";
import type { Appointment } from "@/features/appointments/api/appointmentService";

vi.mock("@/features/clients/components/ClientNotesPanel", () => ({ default: () => <div>Private notes</div> }));
vi.mock("@/features/appointments/components/ProofReviewPanel", () => ({ default: () => <div>Proof review</div> }));

const appt = (over: Partial<Appointment> = {}): Appointment => ({
  id: 24, user_id: 73, first_name: "Cherie", last_name: "Estrera", email: "cherie@x.test", phone: "09755222061",
  service_name: "Softgel Extensions", nailist_name: "Miss Pring", appointment_date: "2026-06-10", appointment_time: "09:00-11:00",
  status: "CANCELLED", payment_status: "PAID", payment_amount: 500, payment_method: "GCASH", payment_reference: "appt-24", ...over,
});

describe("appointment details drawer", () => {
  it("shows the client, the appointment and the payment, with a link to the client page", () => {
    render(<AppointmentDetailsModal appointment={appt()} onClose={vi.fn()} onStatusChange={vi.fn()} tokenFetcher={async () => "tok"} />);
    const drawer = within(screen.getByRole("dialog", { name: "Cherie Estrera" }));
    expect(drawer.getByText("Appointment #24")).toBeInTheDocument();
    expect(drawer.getByText("Jun 10, 2026")).toBeInTheDocument();
    expect(drawer.getByText("₱500")).toBeInTheDocument();
    expect(drawer.getByRole("link", { name: /Client page/ })).toHaveAttribute("href", "/clients/73");
    expect(drawer.getByText("Private notes")).toBeInTheDocument();
    expect(drawer.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("changes the status", async () => {
    const onStatusChange = vi.fn();
    render(<AppointmentDetailsModal appointment={appt()} onClose={vi.fn()} onStatusChange={onStatusChange} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Appointment status/ }));
    await user.click(screen.getByRole("option", { name: "Confirmed" }));
    expect(onStatusChange).toHaveBeenCalledWith(24, "CONFIRMED");
  });

  it("closes on Escape and on a click outside", () => {
    const onClose = vi.fn();
    const { container } = render(<AppointmentDetailsModal appointment={appt()} onClose={onClose} onStatusChange={vi.fn()} />);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("has no client page or notes for a walk-in", () => {
    render(<AppointmentDetailsModal appointment={appt({ is_walkin: 1 })} onClose={vi.fn()} onStatusChange={vi.fn()} tokenFetcher={async () => "tok"} />);
    expect(screen.queryByRole("link", { name: /Client page/ })).toBeNull();
    expect(screen.queryByText("Private notes")).toBeNull();
  });
});
