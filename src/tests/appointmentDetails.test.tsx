import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentDetailsModal from "@/components/features/admin/bookings/AppointmentDetailsModal";
import type { Appointment } from "@/services/appointmentService";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/components/features/admin/clients/ClientNotesPanel", () => ({ default: () => <div>Private notes</div> }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken: async () => "tok", userId: "admin_1" }) }));
vi.mock("@/components/features/admin/bookings/ProofReviewPanel", () => ({ default: () => <div>Proof review</div> }));

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

describe("confirming a booking paid online", () => {
  it("waits for the client's screenshot", () => {
    render(<AppointmentDetailsModal appointment={appt({ status: "AWAITING_CONFIRMATION", latest_proof: null })} onClose={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Confirm booking" })).toBeDisabled();
    expect(screen.getByText("Waiting for the client's payment screenshot.")).toBeInTheDocument();
  });

  it("confirms once the screenshot is in", async () => {
    const onStatusChange = vi.fn();
    render(
      <AppointmentDetailsModal
        appointment={appt({ status: "AWAITING_CONFIRMATION", latest_proof: { id: 9, status: "PENDING", image_url: "https://img/s.webp", created_at: "2026-10-16T10:00:00Z" } })}
        onClose={vi.fn()}
        onStatusChange={onStatusChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm booking" }));
    expect(onStatusChange).toHaveBeenCalledWith(24, "CONFIRMED");
  });
});

describe("completing a visit from the drawer", () => {
  const withQueries = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
  const artists = [{ id: 1, name: "Miss Pring" }];

  it("offers the Complete visit form for a confirmed visit, a walk-in's too", () => {
    withQueries(
      <AppointmentDetailsModal
        appointment={appt({ status: "CONFIRMED", nailist_id: 1, service_price: 1500, paid_downpayment: 0, completion: null, is_walkin: 1 })}
        artists={artists}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("form", { name: "Complete visit" })).toBeInTheDocument();
    expect(screen.getByLabelText("Balance paid at the salon (₱)")).toHaveValue("1500");
  });

  it("shows what was recorded for a completed visit", () => {
    withQueries(
      <AppointmentDetailsModal
        appointment={appt({ status: "COMPLETED", completion: { balance_amount: 1000, payment_method: "Cash", nailist_id: 1, nailist_name: "Miss Pring" } })}
        artists={artists}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );
    expect(screen.getByText("₱1,000 · Cash · Miss Pring")).toBeInTheDocument();
  });
});
