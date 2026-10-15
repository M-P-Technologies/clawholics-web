import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfileHeader from "@/features/profile/components/ProfileHeader";
import RewardsStrip from "@/features/profile/components/RewardsStrip";
import RewardsSheet from "@/features/profile/components/RewardsSheet";

describe("ProfileHeader", () => {
  it("greets by first name and says since when", () => {
    render(<ProfileHeader firstName="Precious" imageUrl="" memberSince="October 2026" />);
    expect(screen.getByRole("heading", { level: 1, name: "Hi, Precious" })).toBeInTheDocument();
    expect(screen.getByText("Member since October 2026")).toBeInTheDocument();
  });

  it("uses initials when there is no photo, and a safe greeting with no name", () => {
    const { rerender } = render(<ProfileHeader firstName="precious hope" imageUrl="" memberSince="" />);
    expect(screen.getByText("P")).toBeInTheDocument();
    rerender(<ProfileHeader firstName="" imageUrl="" memberSince="" />);
    expect(screen.getByRole("heading", { level: 1, name: "Hi there" })).toBeInTheDocument();
  });
});

describe("RewardsStrip", () => {
  it.each([[0, "10 more visits"], [9, "1 more visit"]])("with %i stamps says '%s' to a reward", (stamps, text) => {
    render(<RewardsStrip stamps={stamps} onOpen={() => {}} />);
    expect(screen.getByText(new RegExp(text))).toBeInTheDocument();
    const dots = screen.getAllByTestId("stamp-dot");
    expect(dots).toHaveLength(10);
    expect(dots.filter((d) => d.dataset.earned === "true")).toHaveLength(stamps);
  });

  it("invites a redeem at 10 stamps, and opens the card when tapped", () => {
    const onOpen = vi.fn();
    render(<RewardsStrip stamps={10} onOpen={onOpen} />);
    expect(screen.getByText(/reward is ready/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /loyalty card/i }));
    expect(onOpen).toHaveBeenCalled();
  });

  it("draws the salon's own number of stamps", () => {
    render(<RewardsStrip stamps={5} target={6} onOpen={() => {}} />);
    expect(screen.getAllByTestId("stamp-dot")).toHaveLength(6);
    expect(screen.getByText(/1 more visit to a reward/)).toBeInTheDocument();
  });
});

describe("RewardsSheet", () => {
  it("shows the card number, the stamps and the QR code", () => {
    const { container } = render(<RewardsSheet open onClose={() => {}} stamps={4} cardNumber="CLAWHOLICS-2026-0007" clerkId="user_1" onRedeem={() => {}} />);
    expect(screen.getByText("CLAWHOLICS-2026-0007")).toBeInTheDocument();
    expect(screen.getByText(/Stamp Card — 4\/10/)).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("redeems only when the card is full", () => {
    const onRedeem = vi.fn();
    const { rerender } = render(<RewardsSheet open onClose={() => {}} stamps={9} cardNumber="X" clerkId="u" onRedeem={onRedeem} />);
    fireEvent.click(screen.getByText(/Stamp Card/));
    expect(onRedeem).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /redeem/i })).toBeNull();
    rerender(<RewardsSheet open onClose={() => {}} stamps={10} cardNumber="X" clerkId="u" onRedeem={onRedeem} />);
    fireEvent.click(screen.getByRole("button", { name: /redeem/i }));
    expect(onRedeem).toHaveBeenCalledTimes(1);
  });

  it("lets a card be redeemed once it has the salon's number of stamps", () => {
    render(<RewardsSheet open onClose={() => {}} stamps={5} target={5} cardNumber="X" clerkId="u" onRedeem={() => {}} />);
    expect(screen.getByText(/Stamp Card — 5\/5/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redeem/i })).toBeInTheDocument();
  });
});
