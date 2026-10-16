import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentConfirmation from "@/app/(client)/my/confirmation/page";

const hook = vi.fn();
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => ({ dbUser: null, clerkUser: null }) }));
vi.mock("@/hooks/client/usePaymentConfirmation", () => ({ usePaymentConfirmation: () => hook() }));

const paid = (latest_proof: unknown) => ({
  isFailed: false, isConfirmed: true, awaitingSalon: true, appointment_id: "971",
  data: { service_name: "Gel Manicure", appointment_date: "2026-10-20", appointment_time: "13:00-15:00", status: "AWAITING_CONFIRMATION" },
  payment: { first_name: "Ana", payment_method: "QRPH", email: "a@x.test" },
  loading: false, timedOut: false, checkAgain: () => {},
  proofCard: { appointment: { id: 971, status: "AWAITING_CONFIRMATION", latest_proof }, tokenFetcher: async () => "t", clerkId: "user_a", onUploaded: () => {} },
});

describe("payment confirmation asks for the payment screenshot", () => {
  it("says it's important and offers the upload once the payment is in", () => {
    hook.mockReturnValue(paid(null));
    render(<PaymentConfirmation />);
    expect(screen.getByText(/Important: send a screenshot of your payment/)).toBeInTheDocument();
    expect(screen.getByText(/can't confirm your booking until it has it/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Send your payment screenshot" })).toBeInTheDocument();
  });

  it("shows the screenshot sent, without the warning", () => {
    hook.mockReturnValue(paid({ id: 1, status: "PENDING", image_url: "https://img/p.webp", created_at: "2026-10-16T10:00:00Z" }));
    render(<PaymentConfirmation />);
    expect(screen.getByRole("heading", { name: "Screenshot received" })).toBeInTheDocument();
    expect(screen.queryByText(/Important: send a screenshot/)).toBeNull();
  });
});
