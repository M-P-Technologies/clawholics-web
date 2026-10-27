import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentConfirmation from "@/app/(client)/my/confirmation/page";
import { DEFAULT_INSTAGRAM_URL, instagramUrl } from "@/lib/socialLinkData";

const hook = vi.fn();
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => ({ dbUser: null, clerkUser: null }) }));
vi.mock("@/hooks/client/usePaymentConfirmation", () => ({ usePaymentConfirmation: () => hook() }));

const paid = (instagram: string) => ({
  isFailed: false, isConfirmed: true, appointment_id: "971",
  data: { service_name: "Gel Manicure", appointment_date: "2026-10-20", appointment_time: "13:00-15:00", status: "CONFIRMED" },
  payment: { first_name: "Ana", payment_method: "QRPH", email: "a@x.test" },
  loading: false, timedOut: false, checkAgain: () => {}, instagram,
});

describe("payment confirmation sends the screenshot to Instagram", () => {
  it("confirms the booking and links to the salon's Instagram for the payment screenshot, with no upload", () => {
    hook.mockReturnValue(paid("https://www.instagram.com/salon_test/"));
    render(<PaymentConfirmation />);
    expect(screen.getByRole("heading", { name: "Booking confirmed" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(/send a screenshot of your payment to us on Instagram/);
    const link = screen.getByRole("link", { name: "Instagram" });
    expect(link).toHaveAttribute("href", "https://www.instagram.com/salon_test/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("heading", { name: "Send your payment screenshot" })).toBeNull();
    expect(screen.queryByText(/can't confirm your booking until/)).toBeNull();
  });
});

describe("instagramUrl", () => {
  it("is the saved Instagram link, or the salon's own until one is saved", () => {
    expect(instagramUrl(null)).toBe(DEFAULT_INSTAGRAM_URL);
    expect(DEFAULT_INSTAGRAM_URL).toBe("https://www.instagram.com/claw_holics/");
    const saved = { social_links: JSON.stringify([{ platform: "facebook", name: "", url: "https://fb.test/x" }, { platform: "instagram", name: "", url: " https://instagram.com/other/ " }]) };
    expect(instagramUrl(saved)).toBe("https://instagram.com/other/");
    expect(instagramUrl({ social_links: JSON.stringify([{ platform: "facebook", name: "", url: "https://fb.test/x" }]) })).toBe(DEFAULT_INSTAGRAM_URL);
  });
});
