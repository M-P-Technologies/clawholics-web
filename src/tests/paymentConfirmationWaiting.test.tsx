import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentConfirmation from "@/views/client/PaymentConfirmation";

const hook = vi.fn();
vi.mock("@/hooks/client/usePaymentConfirmation", () => ({ usePaymentConfirmation: () => hook() }));

const waiting = {
  isFailed: false, isConfirmed: false, appointment_id: "971", data: null, payment: null,
  loading: false, timedOut: false, checkAgain: () => {},
};

describe("payment confirmation while waiting", () => {
  it("shows the full-screen loader, outside any Section", () => {
    hook.mockReturnValue(waiting);
    const { container } = render(<PaymentConfirmation />);
    const loader = screen.getByRole("status");
    expect(loader).toHaveTextContent("Confirming your payment");
    expect(loader).toHaveTextContent("don't pay again");
    // A Section animates with `translate`, which would box a fixed loader inside itself
    expect(loader.closest("section")).toBeNull();
    expect(container.querySelector("section")).toBeNull();
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
