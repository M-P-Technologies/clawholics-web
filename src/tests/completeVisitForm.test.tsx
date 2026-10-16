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
vi.mock("@/services/completionService", () => ({ saveCompletion: (...a: unknown[]) => saveCompletion(...a) }));

const ARTISTS = [{ id: 1, name: "Miss Max" }, { id: 2, name: "Miss Jean" }];
const visit = (over: Partial<VisitToComplete> = {}): VisitToComplete => ({
  id: 7, status: "CONFIRMED", appointment_date: "2026-01-10", nailist_id: 1, price: 1500, paid_downpayment: 500, completion: null, ...over,
});
const renderForm = (v: VisitToComplete, onSaved = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CompleteVisitForm visit={v} artists={ARTISTS} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return { onSaved, user: userEvent.setup() };
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
    const photo = new File(["x"], "nails.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(/Photos of the nails/), photo);
    await user.click(screen.getByRole("button", { name: "Complete visit" }));
    expect(saveCompletion).toHaveBeenCalledWith(7, { balance_amount: 1300, payment_method: "GCash", nailist_id: 2, photos: [photo] }, { token: "tok", clerkId: "admin_1" });
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

  it("isn't offered before the visit's day, or before the booking is confirmed", () => {
    renderForm(visit({ appointment_date: "2099-01-01" }));
    expect(screen.queryByRole("form", { name: "Complete visit" })).toBeNull();
  });

  it("shows what was recorded once completed, with Edit reopening the form", async () => {
    const { user } = renderForm(visit({ status: "COMPLETED", completion: { balance_amount: 1300, payment_method: "GCash", nailist_id: 2, nailist_name: "Miss Jean" } }));
    expect(screen.getByText("₱1,300 · GCash · Miss Jean")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Balance paid at the salon (₱)")).toHaveValue("1300");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});
