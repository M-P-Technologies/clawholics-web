import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Payment from "@/views/client/Payment";
import { OFFERED_PAYMENT_METHODS, PAYMENT_METHOD_HINTS, PAYMENT_METHOD_LABELS } from "@/data/payment";

const hook = vi.fn();
vi.mock("@/hooks/client/usePayment", () => ({ usePayment: () => hook() }));
vi.mock("@/lib/router", () => ({ Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a> }));
vi.mock("@/components/features/client/shell/ClientPage", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

describe("payment methods", () => {
  it("QR Ph is the only way to pay, and what the screen falls back to", () => {
    expect(OFFERED_PAYMENT_METHODS).toEqual(["QRPH"]);
    expect(PAYMENT_METHOD_LABELS.QRPH).toBe("QR Ph");
    expect(PAYMENT_METHOD_HINTS.QRPH).toMatch(/bank or e-wallet/i);
  });

  it("shows one QR Ph choice, already selected, with its logo", () => {
    hook.mockReturnValue({
      methods: [{ code: "QRPH", label: "QR Ph", hint: PAYMENT_METHOD_HINTS.QRPH }],
      toggleAgree: () => {}, method: "QRPH", setMethod: () => {}, agree: false, loading: false, isInvalid: false,
      timeLeft: "10:00", modalOpen: false, modalTitle: "", modalMessage: "", modalAction: undefined, modalButtonText: "OK",
      appointment: { service_name: "Hard Gel", nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "9:00 AM - 11:00 AM" },
      handleProceed: () => {}, closeModal: () => {}, sectionLabel: "label-caps",
    });
    const { container } = render(<Payment />);
    const group = screen.getByRole("radiogroup", { name: "Payment method" });
    expect(group.querySelectorAll("[role=radio]")).toHaveLength(1);
    expect(group).toHaveTextContent("QR Ph");
    expect(group).toHaveTextContent("Scan with any bank or e-wallet app");
    expect(group.querySelector("[role=radio]")).toHaveAttribute("aria-checked", "true");
    expect(group.querySelector("img")).not.toBeNull();
    expect(container.textContent).not.toMatch(/GCash|Maya|GrabPay|ShopeePay|debit card/);
  });
});

describe("choice row alignment", () => {
  it("centres the radio on the payment method row, and keeps the top alignment elsewhere", async () => {
    const { ChoiceRow } = await import("@/components/molecules");
    const { rerender } = render(<ChoiceRow selected onClick={() => {}} align="center">x</ChoiceRow>);
    expect(screen.getByRole("radio")).toHaveClass("items-center");
    rerender(<ChoiceRow selected onClick={() => {}}>x</ChoiceRow>);
    expect(screen.getByRole("radio")).toHaveClass("items-start");
  });
});

describe("choice row text", () => {
  it("wraps long text instead of running out of the row", async () => {
    const { ChoiceRow } = await import("@/components/molecules");
    render(<ChoiceRow selected onClick={() => {}}><span>Scan with any bank or e-wallet app</span></ChoiceRow>);
    const row = screen.getByRole("radio");
    expect(row).toHaveClass("whitespace-normal");
    expect(row.querySelector(".min-w-0")).not.toBeNull(); // the text can shrink inside the row
  });
});
