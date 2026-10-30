import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentConfirmation from "@/app/(client)/my/confirmation/page";

const hook = vi.fn();
// The screens draw ClientScreen, which reads the account the client app provides
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => ({ dbUser: null, clerkUser: null }) }));
vi.mock("@/hooks/client/usePaymentConfirmation", () => ({ usePaymentConfirmation: () => hook() }));

const waiting = {
  isFailed: false, isConfirmed: false, appointment_id: "971", data: null, payment: null,
  loading: false, timedOut: false, checkAgain: () => {},
};

describe("payment confirmation while waiting", () => {
  it("waits inside the same frame the confirmation appears in, with the words that matter", () => {
    hook.mockReturnValue(waiting);
    render(<PaymentConfirmation />);
    const loader = screen.getByRole("status");
    expect(loader).toHaveTextContent("Confirming your payment");
    expect(loader).toHaveTextContent("don't pay again");
    // In the frame (the top bar and its back button), not a full-screen cover over it
    expect(screen.getByRole("heading", { level: 1, name: "Payment" })).toBeInTheDocument();
    expect(loader).not.toHaveClass("fixed");
  });

  it("shows placeholders in the same frame while the payment loads", () => {
    hook.mockReturnValue({ ...waiting, loading: true });
    render(<PaymentConfirmation />);
    expect(screen.getByRole("heading", { level: 1, name: "Payment" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading your payment" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(5);
  });

  it("explains what to do once it has waited too long", () => {
    hook.mockReturnValue({ ...waiting, timedOut: true });
    render(<PaymentConfirmation />);
    expect(screen.getByText("Still confirming your payment")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
  });
});

describe("payment confirmation inside the client app", () => {
  it("names each state for what it is, and goes back to the appointments", () => {
    hook.mockReturnValue({ ...waiting, isFailed: true });
    const { unmount } = render(<PaymentConfirmation />);
    expect(screen.getByRole("heading", { level: 1, name: "Payment" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Booking confirmed" })).toBeNull();
    unmount();

    hook.mockReturnValue({ ...waiting, timedOut: true });
    render(<PaymentConfirmation />);
    expect(screen.getByRole("heading", { level: 1, name: "Payment" })).toBeInTheDocument();
  });
});

describe("payment confirmation when paid", () => {
  it("thanks the client and lists the booking", () => {
    hook.mockReturnValue({
      ...waiting, isConfirmed: true,
      payment: { first_name: "Ana", payment_method: "QR Ph", email: "ana@example.com" },
      data: { service_name: "Hard Gel", appointment_date: "2026-10-20", appointment_time: "9:00 AM - 11:00 AM" },
      dateLabel: "October 20, 2026",
      timeLabel: "9:00 AM - 11:00 AM",
    });
    render(<PaymentConfirmation />);
    expect(screen.getByRole("heading", { name: "Booking confirmed" })).toBeInTheDocument();
    expect(screen.getByText(/Thank you, Ana!/)).toBeInTheDocument();
    expect(screen.getByText(/ana@example.com/)).toBeInTheDocument();
    for (const v of ["Hard Gel", "October 20, 2026", "9:00 AM - 11:00 AM"]) expect(screen.getByText(v)).toBeInTheDocument();
    expect(screen.getByText("Amount paid", { selector: "dt" })).toBeInTheDocument();
  });

  it("says so when the booking details didn't load", () => {
    hook.mockReturnValue({ ...waiting, isConfirmed: true, payment: { first_name: "Ana" }, data: null });
    render(<PaymentConfirmation />);
    expect(screen.getByText("Failed to load appointment details.")).toBeInTheDocument();
  });

  it("explains a failed payment and offers home and contact", () => {
    hook.mockReturnValue({ ...waiting, isFailed: true });
    render(<PaymentConfirmation />);
    expect(screen.getByRole("heading", { name: "Payment failed" })).toBeInTheDocument();
    expect(screen.getByText(/not completed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact us" })).toHaveAttribute("href", "/contact");
  });
});
