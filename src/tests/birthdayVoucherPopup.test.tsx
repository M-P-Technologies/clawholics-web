import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BirthdayVoucherPopup from "@/components/birthday/BirthdayVoucherPopup";

let pathname = "/";
vi.mock("@/lib/router", () => ({ useLocation: () => ({ pathname }) }));

const ISSUED = { id: 7, code: "BDAY-1A2B3C4D", discount_pct: 20, valid_from: "2026-10-01", valid_until: "2026-10-31", status: "ISSUED", claimed_at: null };
let birthday: Record<string, unknown>;
vi.mock("@/hooks/useBirthdayVoucher", () => ({ useBirthdayVoucher: () => birthday }));

beforeEach(() => {
  sessionStorage.clear();
  pathname = "/";
  birthday = { voucher: ISSUED, claim: vi.fn(async () => ({})), isClaiming: false, claimError: null };
});

describe("Birthday voucher pop-up", () => {
  it("offers an unclaimed voucher once a session", () => {
    const { unmount } = render(<BirthdayVoucherPopup />);
    expect(screen.getByRole("dialog", { name: "Happy birthday!" })).toHaveTextContent("20% off");
    fireEvent.click(screen.getByRole("button", { name: "Maybe later" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();

    render(<BirthdayVoucherPopup />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("claims it and shows the code", async () => {
    const { rerender } = render(<BirthdayVoucherPopup />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Claim 20% off" })));
    expect(birthday.claim).toHaveBeenCalled();

    birthday = { ...birthday, voucher: { ...ISSUED, status: "CLAIMED" } };
    rerender(<BirthdayVoucherPopup />);
    expect(screen.getByRole("dialog")).toHaveTextContent("BDAY-1A2B3C4D");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays away from booking and payment, and when there's nothing to claim", () => {
    pathname = "/booking/3";
    const { unmount } = render(<BirthdayVoucherPopup />);
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();

    pathname = "/";
    birthday = { ...birthday, voucher: { ...ISSUED, status: "CLAIMED" } };
    render(<BirthdayVoucherPopup />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
