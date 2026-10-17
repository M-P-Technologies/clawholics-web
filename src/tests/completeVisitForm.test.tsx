import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompleteVisitForm from "@/components/features/admin/bookings/CompleteVisitForm";
import type { VisitToComplete } from "@/services/completionService";

vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok", userId: "admin_1" };
  return { useAuth: () => auth };
});
const show = vi.fn();
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
const saveCompletion = vi.fn();
const uploadVisitPhoto = vi.fn();
vi.mock("@/services/completionService", async (orig) => ({
  ...(await orig<object>()),
  saveCompletion: (...a: unknown[]) => saveCompletion(...a),
  uploadVisitPhoto: (...a: unknown[]) => uploadVisitPhoto(...a),
}));
const checkVoucherForVisit = vi.fn();
vi.mock("@/services/voucherService", async (orig) => ({
  ...(await orig<object>()),
  checkVoucherForVisit: (...a: unknown[]) => checkVoucherForVisit(...a),
}));

const ARTISTS = [{ id: 1, name: "Miss Max" }, { id: 2, name: "Miss Jean" }];
const visit = (over: Partial<VisitToComplete> = {}): VisitToComplete => ({
  id: 7, status: "CONFIRMED", appointment_date: "2026-01-10", appointment_time: "13:00-15:00", nailist_id: 1, price: 1500, paid_downpayment: 500, completion: null, ...over,
});
const renderForm = (v: VisitToComplete, onSaved = vi.fn(), onCancelLate = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CompleteVisitForm visit={v} artists={ARTISTS} onSaved={onSaved} onCancelLate={onCancelLate} />
    </QueryClientProvider>,
  );
  return { onSaved, onCancelLate, user: userEvent.setup() };
};

beforeEach(() => {
  saveCompletion.mockReset().mockResolvedValue({ completion: {}, photos: 0 });
  show.mockReset();
});

describe("the Complete visit form", () => {
  it("prefills the balance with the menu price less the downpayment, and lets the admin change it", async () => {
    const { user } = renderForm(visit());
    const balance = screen.getByLabelText("Balance paid at the salon (₱)");
    expect(balance).toHaveValue("1100");
    await user.clear(balance);
    await user.type(balance, "1300");
    expect(balance).toHaveValue("1300");
    await user.click(screen.getByRole("button", { name: "Use ₱1,100" }));
    expect(balance).toHaveValue("1100");
  });

  it("prefills the full menu price when no downpayment was paid", () => {
    renderForm(visit({ paid_downpayment: 0 }));
    expect(screen.getByLabelText("Balance paid at the salon (₱)")).toHaveValue("1500");
  });

  it("offers the six ways to pay and starts on the booked artist", async () => {
    const { user } = renderForm(visit());
    expect(screen.getByRole("button", { name: "Done by" })).toHaveTextContent("Miss Max");
    await user.click(screen.getByRole("button", { name: "Paid by" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Cash", "GCash", "Maya", "Bank transfer", "Card", "Other"]);
  });

  it("saves the balance, the method, who did it and the photos, then tells the page", async () => {
    const { user, onSaved } = renderForm(visit());
    const balance = screen.getByLabelText("Balance paid at the salon (₱)");
    await user.clear(balance);
    await user.type(balance, "1300");
    await user.click(screen.getByRole("button", { name: "Paid by" }));
    await user.click(screen.getByRole("option", { name: "GCash" }));
    await user.click(screen.getByRole("button", { name: "Done by" }));
    await user.click(screen.getByRole("option", { name: "Miss Jean" }));
    await user.click(screen.getByRole("button", { name: "Complete visit" }));
    expect(saveCompletion).toHaveBeenCalledWith(7, { balance_amount: 1300, payment_method: "GCash", nailist_id: 2, arrived_at: "", voucher_code: "", photos: [] }, { token: "tok", clerkId: "admin_1" });
    // The photo is added afterwards, from its own window
    expect(screen.queryByLabelText(/Photos of the nails/)).toBeNull();
    expect(onSaved).toHaveBeenCalled();
  });

  it("refuses a balance that isn't whole pesos", async () => {
    const { user } = renderForm(visit());
    const balance = screen.getByLabelText("Balance paid at the salon (₱)");
    await user.clear(balance);
    await user.type(balance, "12.5");
    await user.click(screen.getByRole("button", { name: "Complete visit" }));
    expect(screen.getByRole("alert")).toHaveTextContent("whole pesos");
    expect(saveCompletion).not.toHaveBeenCalled();
  });

  it("is shown locked before the visit's day", () => {
    renderForm(visit({ appointment_date: "2099-01-01" }));
    expect(screen.getByText(/You can complete this visit from Jan 1, 2099/)).toBeInTheDocument();
    expect(screen.getByLabelText("Balance paid at the salon (₱)")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Complete visit" })).toBeDisabled();
  });

  it("adds the late fee for the time the client came in, by the terms", async () => {
    const { user } = renderForm(visit());
    await user.type(screen.getByLabelText("Time they came in"), "13:17");
    expect(screen.getByText("Late fee (17 min late): ₱100")).toBeInTheDocument();
    expect(screen.getByLabelText("Balance paid at the salon (₱)")).toHaveValue("1200");
    await user.click(screen.getByRole("button", { name: "Complete visit" }));
    expect(saveCompletion).toHaveBeenCalledWith(7, expect.objectContaining({ balance_amount: 1200, arrived_at: "13:17" }), expect.anything());
  });

  it("suggests cancelling from 25 minutes late, keeping the downpayment, but still lets the admin serve them", async () => {
    const { user, onCancelLate } = renderForm(visit());
    await user.type(screen.getByLabelText("Time they came in"), "13:30");
    expect(screen.getByText(/25 minutes or more late/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete visit" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Cancel the visit (late)" }));
    expect(onCancelLate).toHaveBeenCalled();
  });

  it("asks for the visit's photo when it was completed without one, with a link that opens the upload window", async () => {
    const { user } = renderForm(visit({ status: "COMPLETED", completion: { balance_amount: 1000, payment_method: "Cash", nailist_id: 1, nailist_name: "Miss Max", photos_added: 0 } }));
    expect(screen.getByText(/Nail photo still to add/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add photo" }));
    expect(screen.getByRole("dialog", { name: "Add a visit photo" })).toBeInTheDocument();
  });

  it("shows what was recorded once completed, with Edit reopening the form", async () => {
    const { user } = renderForm(visit({ status: "COMPLETED", completion: { balance_amount: 1300, payment_method: "GCash", nailist_id: 2, nailist_name: "Miss Jean" } }));
    expect(screen.getByText("₱1,300 · GCash · Miss Jean")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Balance paid at the salon (₱)")).toHaveValue("1300");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("applies a birthday voucher: checked with the server, its discount comes off the balance, and it's sent with the visit", async () => {
    checkVoucherForVisit.mockResolvedValue({ id: 3, code: "BDAY-ABC", discount_pct: 20, valid_until: "2026-01-31", discount: 300 });
    const { user } = renderForm(visit());
    await user.type(screen.getByLabelText("Birthday voucher (optional)"), "bday-abc");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(checkVoucherForVisit).toHaveBeenCalledWith("bday-abc", 7, expect.anything());
    expect(screen.getByText("BDAY-ABC applied: −₱300 off the service price")).toBeInTheDocument();
    // ₱1,500 less ₱300, less the ₱400 credited from the downpayment
    expect(screen.getByLabelText("Balance paid at the salon (₱)")).toHaveValue("800");
    await user.click(screen.getByRole("button", { name: "Complete visit" }));
    expect(saveCompletion).toHaveBeenCalledWith(7, expect.objectContaining({ balance_amount: 800, voucher_code: "BDAY-ABC" }), expect.anything());

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByLabelText("Balance paid at the salon (₱)")).toHaveValue("1100");
  });

  it("shows why a code was refused, and won't save with a code typed but not applied", async () => {
    checkVoucherForVisit.mockRejectedValue(new Error("This voucher was already used on another visit."));
    const { user } = renderForm(visit());
    await user.type(screen.getByLabelText("Birthday voucher (optional)"), "BDAY-USED");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("This voucher was already used on another visit.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete visit" }));
    expect(screen.getByText("Apply the voucher code first, or clear it.")).toBeInTheDocument();
    expect(saveCompletion).not.toHaveBeenCalled();
  });
});
