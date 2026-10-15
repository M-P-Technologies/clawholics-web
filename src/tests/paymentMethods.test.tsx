import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Payment from "@/views/client/Payment";
import { OFFERED_PAYMENT_METHODS, PAYMENT_METHOD_HINTS, PAYMENT_METHOD_LABELS } from "@/data/payment";

const hook = vi.fn();
vi.mock("@/hooks/client/usePayment", () => ({ usePayment: () => hook() }));
vi.mock("@/lib/router", () => ({ Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a> }));
vi.mock("@/components/features/client/shell/ClientScreen", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

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

describe("payment step", () => {
  const base = {
    methods: [{ code: "QRPH", label: "QR Ph", hint: "Scan with any bank or e-wallet app" }],
    toggleAgree: vi.fn(), method: "QRPH", setMethod: vi.fn(), agree: false, loading: false, isInvalid: false,
    timeLeft: "09:41", modalOpen: false, modalTitle: "", modalMessage: "", modalAction: undefined, modalButtonText: "OK", modalDismissible: true,
    appointment: { service_name: "Hard Gel", nailist_name: "Max", nailist_category_id: 1, service_price: 650, appointment_date: "2026-10-20", appointment_time: "9:00 AM - 11:00 AM" },
    handlePay: vi.fn(), handleModalClose: vi.fn(), sectionLabel: "label-caps",
  };

  it("shows the summary, the fees and the countdown", () => {
    hook.mockReturnValue(base);
    render(<Payment />);
    expect(screen.getByText("★ Max")).toBeInTheDocument();
    expect(screen.getByText("Starts at ₱650")).toBeInTheDocument();
    expect(screen.getByText("₱400")).toBeInTheDocument();
    expect(screen.getByText("₱100")).toBeInTheDocument();
    expect(screen.getByText(/total due/i)).toBeInTheDocument();
    expect(screen.getByText("₱500")).toBeInTheDocument();
    expect(screen.getByText(/reservation expires in/i)).toBeInTheDocument();
    expect(screen.getByText("09:41")).toBeInTheDocument();
  });

  it("agrees to the terms and pays", () => {
    hook.mockReturnValue(base);
    render(<Payment />);
    fireEvent.click(screen.getByRole("checkbox", { name: /I agree with the/ }));
    expect(base.toggleAgree).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Terms & Conditions" })).toHaveAttribute("href", "/terms");
    fireEvent.click(screen.getByRole("button", { name: "Pay downpayment" }));
    expect(base.handlePay).toHaveBeenCalled();
  });

  it("sends a visitor without a booking home", () => {
    hook.mockReturnValue({ ...base, appointment: null });
    render(<Payment />);
    expect(screen.getByText("Invalid access")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/my");
  });
});
