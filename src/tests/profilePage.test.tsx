import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "@/views/account/Profile";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }) }));
vi.mock("@/hooks/useServicePhotos", () => ({ useServicePhotos: () => () => "" }));
vi.mock("@/hooks/useMyReviews", () => ({ useMyReviews: () => ({ reviews: {}, submit: vi.fn() }) }));
vi.mock("@/components/payment/PaymentProofCard", () => ({ default: () => null }));
vi.mock("@/components/layout/PageShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/layout/Section", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const view = (id: number, status = "confirmed", over = {}) => ({
  appt: { id, service_name: `Service ${id}`, nailist_id: 1, nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "09:00-11:00", status },
  displayStatus: status, remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true, statusLabel: status, statusDot: "bg-info",
  dateLabel: "October 20, 2026", timeLabel: "9:00 AM - 11:00 AM", canPay: false, payLabel: "", isLocked: false, ...over,
});

let hook: Record<string, unknown>;
vi.mock("@/hooks/useProfile", () => ({ useProfile: () => hook }));

const makeHook = (over: Record<string, unknown> = {}) => ({
  isBusy: false,
  dbUser: { first_name: "Ana", last_name: "Cruz", email: "a@b.co", phone: "09171234567", dob: "2000-01-02", gender: "female", member_since_month: "October", member_since_year: "2026" },
  clerkUser: { id: "user_1", imageUrl: "" },
  getToken: async () => "t",
  upcoming: [view(1), view(2)],
  nextAppointment: view(1),
  pastViews: [view(3, "completed")],
  stamps: 4,
  loyaltyCardNumber: "CLAWHOLICS-2026-0007",
  currentTime: Date.parse("2026-10-17T09:00:00+08:00"),
  highlightedAppointmentId: null,
  historyFilter: "all", historySortBy: "appointmentDateDesc", handleHistoryFilterChange: vi.fn(), handleHistorySortChange: vi.fn(),
  hasMoreHistory: false, showAllHistory: false, toggleHistory: vi.fn(),
  isEditing: false, handleEditClick: vi.fn(), handleSave: vi.fn(), handleCancel: vi.fn(), profileFields: [], formData: null, error: null,
  genderLabel: "", genderOptions: [], isGenderOpen: false, toggleGender: vi.fn(), handleGenderSelect: vi.fn(),
  formatDisplayDate: (d: string) => d,
  payForAppointment: vi.fn(), rescheduleAppointment: vi.fn(), startCancel: vi.fn(), handleClientRedeem: vi.fn(), handleProofUploaded: vi.fn(),
  showRewardModal: false, closeRewardModal: vi.fn(), todayFormatted: "", isCancelModalOpen: false, selectedAppt: null, selectedApptDateLabel: "",
  isLateCancellation: false, actionError: null, closeCancelModal: vi.fn(), isCancelling: false, handleCancelAppointment: vi.fn(),
  ...over,
});

beforeEach(() => {
  hook = makeHook();
});

describe("Profile page", () => {
  it("shows the sections in order: header, next appointment, rewards, appointments, details", () => {
    render(<Profile />);
    const texts = [
      screen.getByRole("heading", { level: 1 }),
      screen.getByRole("region", { name: "Next appointment" }),
      screen.getByRole("button", { name: "Open your loyalty card" }),
      screen.getByRole("region", { name: "Appointments" }),
      screen.getByRole("region", { name: "My details" }),
    ];
    expect(texts[0]).toHaveTextContent("Hi, Ana");
    // Phones show one column in this DOM-independent order (CSS `order`), so check the order classes
    const order = (el: HTMLElement) => Number(/(?:^| )order-(\d)(?: |$)/.exec(el.closest("[class~='order-1'],[class~='order-2'],[class~='order-3'],[class~='order-4']")?.className ?? "")?.[1] ?? 0);
    expect([order(texts[1]), order(texts[2]), order(texts[3]), order(texts[4])]).toEqual([1, 2, 3, 4]);
  });

  it("opens an appointment's sheet from the list, and the loyalty card from the strip", () => {
    render(<Profile />);
    fireEvent.click(within(screen.getByRole("region", { name: "Appointments" })).getByRole("button", { name: /Service 2/ }));
    expect(screen.getByRole("dialog", { name: "Appointment" })).toHaveTextContent("Service 2");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open your loyalty card" }));
    expect(screen.getByRole("dialog", { name: "Loyalty card" })).toHaveTextContent("CLAWHOLICS-2026-0007");
  });

  it("starts the cancel flow from the hero", () => {
    render(<Profile />);
    fireEvent.click(within(screen.getByRole("region", { name: "Next appointment" })).getByRole("button", { name: "Cancel" }));
    expect((hook.startCancel as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it("opens the highlighted appointment's sheet on arrival (deep link)", () => {
    hook = makeHook({ highlightedAppointmentId: 2 });
    render(<Profile />);
    expect(screen.getByRole("dialog", { name: "Appointment" })).toHaveTextContent("Service 2");
  });

  it("shows the edit sheet while editing, and Cancel in it ends the edit", () => {
    hook = makeHook({ isEditing: true });
    render(<Profile />);
    const dialog = screen.getByRole("dialog", { name: "Edit details" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(hook.handleCancel).toHaveBeenCalled();
  });

  it("shows a loader while the profile loads", () => {
    hook = makeHook({ isBusy: true });
    render(<Profile />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
