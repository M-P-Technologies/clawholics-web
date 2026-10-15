import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RewardsSheet from "@/components/features/client/profile/RewardsSheet";

describe("RewardsSheet", () => {
  it("shows the card number, the stamps and the QR code", () => {
    const { container } = render(<RewardsSheet open onClose={() => {}} stamps={4} cardNumber="CLAWHOLICS-2026-0007" clerkId="user_1" onRedeem={() => {}} />);
    expect(screen.getByText("CLAWHOLICS-2026-0007")).toBeInTheDocument();
    expect(screen.getByText(/Stamp card: 4\/10/)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("redeems only when the card is full", () => {
    const onRedeem = vi.fn();
    const { rerender } = render(<RewardsSheet open onClose={() => {}} stamps={9} cardNumber="X" clerkId="u" onRedeem={onRedeem} />);
    fireEvent.click(screen.getByText(/Stamp card/));
    expect(onRedeem).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /redeem/i })).toBeNull();
    rerender(<RewardsSheet open onClose={() => {}} stamps={10} cardNumber="X" clerkId="u" onRedeem={onRedeem} />);
    fireEvent.click(screen.getByRole("button", { name: /redeem/i }));
    expect(onRedeem).toHaveBeenCalledTimes(1);
  });

  it("lets a card be redeemed once it has the salon's number of stamps", () => {
    render(<RewardsSheet open onClose={() => {}} stamps={5} target={5} cardNumber="X" clerkId="u" onRedeem={() => {}} />);
    expect(screen.getByText(/Stamp card: 5\/5/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redeem/i })).toBeInTheDocument();
  });
});
