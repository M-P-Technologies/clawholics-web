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

  it("lets the admin tap the phone number, and shows how the client prefers to be reached", () => {
    render(<AppointmentDetailsModal appointment={appt({ preferred_contact_method: "sms" })} onClose={vi.fn()} onStatusChange={vi.fn()} />);
    const drawer = within(screen.getByRole("dialog", { name: "Cherie Estrera" }));
    expect(drawer.getByRole("link", { name: "09755222061" })).toHaveAttribute("href", "tel:09755222061");
    const prefers = drawer.getByRole("link", { name: /Text message/ });
    expect(prefers).toHaveAttribute("href", "sms:09755222061");
    expect(prefers).toHaveTextContent("09755222061");
  });

  it("opens the client's Instagram when that's how they prefer to be reached, in a new tab", () => {
    render(<AppointmentDetailsModal appointment={appt({ preferred_contact_method: "instagram", instagram_handle: "cherie" })} onClose={vi.fn()} onStatusChange={vi.fn()} />);
    const link = screen.getByRole("link", { name: /Instagram/ });
    expect(link).toHaveAttribute("href", "https://www.instagram.com/cherie/");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("says what's missing when they prefer a way they gave no details for, and has no row without a preference or for a walk-in", () => {
    const { rerender } = render(<AppointmentDetailsModal appointment={appt({ preferred_contact_method: "messenger" })} onClose={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.getByText("Messenger · No Facebook name saved")).toBeInTheDocument();
    rerender(<AppointmentDetailsModal appointment={appt({ preferred_contact_method: "" })} onClose={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.queryByText("Prefers")).toBeNull();
    rerender(<AppointmentDetailsModal appointment={appt({ preferred_contact_method: "sms", is_walkin: 1 })} onClose={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.queryByText("Prefers")).toBeNull();
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

describe("a booking paid online", () => {
  it("has no confirm step: the payment confirms it", () => {
    render(<AppointmentDetailsModal appointment={appt({ status: "CONFIRMED", latest_proof: null })} onClose={vi.fn()} onStatusChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Confirm booking" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Allow anyway" })).toBeNull();
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

describe("the drawer's status menu", () => {
  it("doesn't offer Completed: a visit is completed with its form", async () => {
    render(<AppointmentDetailsModal appointment={appt({ status: "CONFIRMED" })} onClose={vi.fn()} onStatusChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Appointment status" }));
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options.some((o) => /Confirmed/i.test(o ?? ""))).toBe(true);
    expect(options.some((o) => /Completed/i.test(o ?? ""))).toBe(false);
  });
});
