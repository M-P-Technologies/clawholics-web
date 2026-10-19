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
const renderTracker = (a: ClientAppointment, onNoShow = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BookingTracker appointments={[a]} today="2026-01-10" artists={ARTISTS} onNoShow={onNoShow} onCancelLate={vi.fn()} />
    </QueryClientProvider>,
  );
  return { onNoShow, user: userEvent.setup() };
};
const step = (title: string) => screen.getAllByRole("listitem").find((li) => li.textContent?.includes(`${title}:`))!;

describe("the client page's booking tracker", () => {
  it("shows the payment screenshot on the Downpayment step", () => {
    renderTracker(appt());
    expect(within(step("Downpayment")).getByRole("button", { name: "View payment screenshot for appointment #7" })).toBeInTheDocument();
  });

  it("shows no payment proof when none was sent, and no confirm step", () => {
    renderTracker(appt({ proof_status: null, proof_image_url: null }));
    expect(within(step("Downpayment")).queryByText(/Payment proof/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirm booking" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Allow anyway" })).toBeNull();
  });

  it("marks a confirmed visit as a no-show, after a confirming click", async () => {
    const { user, onNoShow } = renderTracker(appt());
    await user.click(within(step("Completed")).getByRole("button", { name: "Didn't show up" }));
    await user.click(within(screen.getByRole("alertdialog", { name: "Mark as a no-show?" })).getByRole("button", { name: "Mark as no-show" }));
    expect(onNoShow).toHaveBeenCalledWith(7);
  });

  it("shows Complete visit and Didn't show up on the Completed step; Complete visit opens the form in a dialog", async () => {
    const { user } = renderTracker(appt());
    expect(within(step("Completed")).queryByRole("form")).toBeNull();
    expect(within(step("Completed")).getByRole("button", { name: "Didn't show up" })).toBeInTheDocument();
    await user.click(within(step("Completed")).getByRole("button", { name: "Complete visit" }));
    const dialog = screen.getByRole("dialog", { name: "Complete visit" });
    expect(within(dialog).getByLabelText("Balance paid at the salon (₱)")).toHaveValue("1100");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("before the visit's day, Complete visit is locked and there's no Didn't show up", () => {
    renderTracker(appt({ appointment_date: "2026-01-12" }));
    expect(within(step("Completed")).getByRole("button", { name: "Complete visit" })).toBeDisabled();
    expect(within(step("Completed")).getByText("You can complete this visit from Jan 12, 2026.")).toBeInTheDocument();
    expect(within(step("Completed")).queryByRole("button", { name: "Didn't show up" })).toBeNull();
  });

  it("shows what was recorded once completed, with Edit opening the dialog", async () => {
    const { user } = renderTracker(appt({ status: "COMPLETED", completion: { balance_amount: 1300, payment_method: "GCash", nailist_id: 2, nailist_name: "Miss Jean" } }));
    expect(within(step("Completed")).getByText("₱1,300 · GCash · Miss Jean")).toBeInTheDocument();
    await user.click(within(step("Completed")).getByRole("button", { name: "Edit" }));
    const dialog = screen.getByRole("dialog", { name: "Edit the completed visit" });
    expect(within(dialog).getByLabelText("Balance paid at the salon (₱)")).toHaveValue("1300");
    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});
