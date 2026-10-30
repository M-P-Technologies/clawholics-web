import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Reschedule from "@/app/(client)/my/reschedule/page";
import { formatSlot } from "@/utils/reschedule";
import { rescheduleLabels } from "@/lib/client/reschedule";

const hook = vi.fn();
// The screens draw ClientScreen, which reads the account the client app provides
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => ({ dbUser: null, clerkUser: null }) }));
vi.mock("@/hooks/client/useReschedule", () => ({ useReschedule: () => hook() }));
vi.mock("@/lib/router", () => ({ useNavigate: () => vi.fn() }));

const now = new Date();
const day = (n: number) => screen.getByRole("button", { name: new RegExp(`\\b${n}(st|nd|rd|th)?,`) });

const state = () => ({
  isLoaded: true,
  appointment: {
    service_name: "Hard Gel", service_description: "Long-lasting gel", nailist_name: "Max",
    appointment_date: "2026-10-20", appointment_time: "09:00-11:00",
  },
  isSubmitting: false, month: new Date(now.getFullYear(), now.getMonth(), 1), setMonth: vi.fn(),
  selectedDate: "", selectedTime: "", setSelectedTime: vi.fn(),
  modalOpen: false, modalTitle: "", modalMessage: "",
  isDisabledDate: (d: Date) => d.getDate() === 28,
  formatDisplayDate: (d: string) => (d ? `Display ${d}` : ""),
  handleConfirmReschedule: vi.fn(), handleDateSelect: vi.fn(), selectedDay: undefined,
  isDateFullyBooked: () => false, isSlotBlocked: (t: string) => t === "13:00-15:00",
  uniqueTimeSlots: ["09:00-11:00", "13:00-15:00"], handleModalClose: vi.fn(),
});

let s: ReturnType<typeof state>;
beforeEach(() => {
  s = state();
  // The labels the hook works out from the fake state
  hook.mockImplementation(() => ({ ...s, formatSlot, ...rescheduleLabels(s.appointment, s.selectedDate, s.selectedTime, s.formatDisplayDate) }));
});

describe("reschedule step", () => {
  it("loads inside the same frame (title and back button), as placeholders", () => {
    s = { ...s, isLoaded: false };
    render(<Reschedule />);
    expect(screen.getByRole("heading", { level: 1, name: "Reschedule" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading your appointment" })).toBeInTheDocument();
  });

  it("shows the current booking", () => {
    render(<Reschedule />);
    expect(screen.getByRole("heading", { name: "Reschedule your visit" })).toBeInTheDocument();
    expect(screen.getByText(/new date and time for your Hard Gel with Max/)).toBeInTheDocument();
    const current = screen.getByText("Old date", { selector: "dt" }).closest("dl")!;
    expect(within(current).getByText("Max")).toBeInTheDocument();
    expect(within(current).getByText("Display 2026-10-20")).toBeInTheDocument();
  });

  it("can't confirm before a new date and time are picked", () => {
    render(<Reschedule />);
    expect(screen.getByRole("button", { name: "Confirm reschedule" })).toBeDisabled();
    const pick = screen.getByText("New date", { selector: "dt" }).closest("dl")!;
    expect(within(pick).getAllByText("-")).toHaveLength(2);
  });

  it("blocks unavailable days and taken times", () => {
    render(<Reschedule />);
    expect(day(28)).toBeDisabled();
    fireEvent.click(day(10));
    expect(s.handleDateSelect).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: formatSlot("13:00-15:00") })).toBeDisabled();
    expect(screen.getByRole("button", { name: formatSlot("09:00-11:00") })).toBeEnabled();
  });

  it("confirms the new date and time", () => {
    s = { ...s, selectedDate: "2026-10-22", selectedTime: "09:00-11:00" };
    render(<Reschedule />);
    const pick = screen.getByText("New date", { selector: "dt" }).closest("dl")!;
    expect(within(pick).getByText("Display 2026-10-22")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm reschedule" }));
    expect(s.handleConfirmReschedule).toHaveBeenCalledTimes(1);
  });

  it("shows Processing… while it saves", () => {
    s = { ...s, selectedDate: "2026-10-22", selectedTime: "09:00-11:00", isSubmitting: true };
    render(<Reschedule />);
    expect(screen.getByRole("button", { name: "Processing..." })).toBeDisabled();
  });

  it("shows the alert the hook asks for", () => {
    s = { ...s, modalOpen: true, modalTitle: "Couldn't reschedule", modalMessage: "That time was just taken." };
    render(<Reschedule />);
    expect(screen.getByRole("alertdialog", { name: "Couldn't reschedule" })).toHaveTextContent("That time was just taken.");
  });
});
