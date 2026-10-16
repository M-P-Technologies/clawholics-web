import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import BookingTracker from "@/components/features/admin/clients/BookingTracker";
import type { ClientAppointment } from "@/services/clientNotesService";

vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok", userId: "admin_1" };
  return { useAuth: () => auth };
});

const ARTISTS = [{ id: 1, name: "Miss Max" }, { id: 2, name: "Miss Jean" }];
const appt = (over: Partial<ClientAppointment> = {}): ClientAppointment => ({
  id: 7, appointment_date: "2026-01-10", appointment_time: "13:00-15:00", service_name: "Gel Pedicure", nailist_name: "Miss Jean",
  nailist_id: 2, status: "CONFIRMED", price: 1500, paid_downpayment: 500, expected_balance: 1100, completion: null,
  payment_status: "PAID", proof_status: "APPROVED", proof_image_url: "https://img/s.webp", ...over,
});
const renderTracker = (a: ClientAppointment, onConfirm = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BookingTracker appointments={[a]} today="2026-01-10" artists={ARTISTS} onConfirm={onConfirm} />
    </QueryClientProvider>,
  );
  return { onConfirm, user: userEvent.setup() };
};
const step = (title: string) => screen.getAllByRole("listitem").find((li) => li.textContent?.includes(`${title}:`))!;

describe("the client page's booking tracker", () => {
  it("shows the payment screenshot on the Downpayment step", () => {
    renderTracker(appt());
    expect(within(step("Downpayment")).getByRole("button", { name: "View payment screenshot for appointment #7" })).toBeInTheDocument();
  });

  it("confirms a booking awaiting confirmation once the screenshot is in", async () => {
    const { user, onConfirm } = renderTracker(appt({ status: "AWAITING_CONFIRMATION", proof_status: "PENDING" }));
    await user.click(within(step("Confirmed")).getByRole("button", { name: "Confirm booking" }));
    expect(onConfirm).toHaveBeenCalledWith(7);
  });

  it("waits for the client's screenshot before it can confirm", () => {
    renderTracker(appt({ status: "AWAITING_CONFIRMATION", proof_status: null, proof_image_url: null }));
    const confirmed = step("Confirmed");
    expect(within(confirmed).getByRole("button", { name: "Confirm booking" })).toBeDisabled();
    expect(within(confirmed).getByText("Waiting for the client's payment screenshot.")).toBeInTheDocument();
    expect(within(step("Downpayment")).getByText("None yet")).toBeInTheDocument();
  });

  it("offers the Complete visit form on the Completed step of a confirmed visit", () => {
    renderTracker(appt());
    expect(within(step("Completed")).getByRole("form", { name: "Complete visit" })).toBeInTheDocument();
    expect(within(step("Completed")).getByLabelText("Balance paid at the salon (₱)")).toHaveValue("1100");
  });

  it("shows what was recorded once completed", () => {
    renderTracker(appt({ status: "COMPLETED", completion: { balance_amount: 1300, payment_method: "GCash", nailist_id: 2, nailist_name: "Miss Jean" } }));
    expect(within(step("Completed")).getByText("₱1,300 · GCash · Miss Jean")).toBeInTheDocument();
    expect(within(step("Completed")).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });
});
