import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentSheet from "@/components/profile/AppointmentSheet";
import AppointmentsSection from "@/components/profile/AppointmentsSection";
import type { AppointmentView } from "@/components/profile/types";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/payment/PaymentProofCard", () => ({
  default: ({ appointment }: { appointment: { id: number; status: string } }) =>
    appointment.status === "awaiting_proof" ? <div id={`proof-${appointment.id}`}>proof card</div> : null,
}));

const make = (id: number, over: Partial<AppointmentView> = {}, status = "confirmed"): AppointmentView => ({
  appt: { id, service_name: `Service ${id}`, nailist_id: 1, nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "09:00-11:00", status },
  displayStatus: status, remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true, statusLabel: status, statusDot: "bg-info",
  dateLabel: "October 20, 2026", timeLabel: "9:00 AM - 11:00 AM", canPay: false, payLabel: "", isLocked: false, ...over,
});
const sheetProps = () => ({
  photo: "", now: 0, tokenFetcher: async () => "t", clerkId: "u",
  onClose: vi.fn(), onPay: vi.fn(), onReschedule: vi.fn(), onCancel: vi.fn(), onProofUploaded: vi.fn(),
});
const sectionProps = (over = {}) => ({
  upcoming: [make(1), make(2)], past: [make(3, {}, "completed")], photoFor: () => "", highlightedId: null, onOpen: vi.fn(),
  historyFilter: "all", onFilterChange: vi.fn(), historySort: "appointmentDateDesc", onSortChange: vi.fn(),
  hasMore: false, showAll: false, onToggleAll: vi.fn(), ...over,
});

describe("AppointmentSheet", () => {
  it("is closed with no appointment, and shows details with the actions that apply", () => {
    const p = sheetProps();
    const { rerender } = render(<AppointmentSheet view={null} {...p} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<AppointmentSheet view={make(1)} {...p} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Service 1");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reschedule" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel appointment" }));
    expect(p.onReschedule).toHaveBeenCalled();
    expect(p.onCancel).toHaveBeenCalled();
  });

  it("offers payment while the hold runs, and shows the payment proof card for an appointment awaiting proof", () => {
    const p = sheetProps();
    const { rerender } = render(<AppointmentSheet view={make(1, { canPay: true, payLabel: "9:35", canReschedule: false })} {...p} />);
    fireEvent.click(screen.getByRole("button", { name: /Complete payment/ }));
    expect(p.onPay).toHaveBeenCalled();
    rerender(<AppointmentSheet view={make(2, { canReschedule: false }, "awaiting_proof")} {...p} />);
    expect(document.getElementById("proof-2")).not.toBeNull();
  });

  it("explains a locked reschedule instead of hiding it", () => {
    render(<AppointmentSheet view={make(1, { canReschedule: false, isLocked: true })} {...sheetProps()} />);
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeDisabled();
    expect(screen.getByText(/Changes close 3 days before/)).toBeInTheDocument();
  });
});

describe("AppointmentsSection", () => {
  it("starts on Upcoming and switches to Past", () => {
    render(<AppointmentsSection {...sectionProps()} />);
    expect(screen.getByRole("tab", { name: /Upcoming/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Service 1")).toBeInTheDocument();
    expect(screen.queryByText("Service 3")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Past/ }));
    expect(screen.getByText("Service 3")).toBeInTheDocument();
    expect(screen.queryByText("Service 1")).toBeNull();
  });

  it("opens the tapped appointment", () => {
    const p = sectionProps();
    render(<AppointmentsSection {...p} />);
    fireEvent.click(screen.getByRole("button", { name: /Service 2/ }));
    expect(p.onOpen).toHaveBeenCalledWith(expect.objectContaining({ appt: expect.objectContaining({ id: 2 }) }));
  });

  it("says so when a list is empty", () => {
    render(<AppointmentsSection {...sectionProps({ upcoming: [], past: [] })} />);
    expect(screen.getByText(/nothing coming up/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Past/ }));
    expect(screen.getByText(/no past appointments/i)).toBeInTheDocument();
  });

  it("keeps the past filter and 'view more'", () => {
    const p = sectionProps({ hasMore: true });
    render(<AppointmentsSection {...p} />);
    fireEvent.click(screen.getByRole("tab", { name: /Past/ }));
    fireEvent.click(screen.getByRole("button", { name: "Filter past appointments" }));
    fireEvent.click(screen.getByRole("option", { name: /Cancelled/ }));
    expect(p.onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: "cancelled" } }));
    fireEvent.click(screen.getByRole("button", { name: /view more/i }));
    expect(p.onToggleAll).toHaveBeenCalled();
  });
});
