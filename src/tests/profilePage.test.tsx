import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "@/features/profile/screens/Profile";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ openUserProfile: vi.fn(), signOut: vi.fn() }) }));
vi.mock("@/features/profile/hooks/useServicePhotos", () => ({ useServicePhotos: () => () => "" }));
vi.mock("@/features/reviews/hooks/useMyReviews", () => ({ useMyReviews: () => ({ reviews: {}, submit: vi.fn() }) }));
let birthday: Record<string, unknown>;
vi.mock("@/features/vouchers/hooks/useBirthdayVoucher", () => ({ useBirthdayVoucher: () => birthday }));
vi.mock("@/features/payments/components/PaymentProofCard", () => ({ default: () => null }));
vi.mock("@/components/layout/PageShell", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/layout/Section", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const view = (id: number, status = "confirmed", over = {}) => ({
  appt: { id, service_name: `Service ${id}`, nailist_id: 1, nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "09:00-11:00", status },
  displayStatus: status, remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true, statusLabel: status, statusDot: "bg-info",
  dateLabel: "October 20, 2026", timeLabel: "9:00 AM - 11:00 AM", canPay: false, payLabel: "", isLocked: false, ...over,
});

let hook: Record<string, unknown>;
vi.mock("@/features/profile/hooks/useProfile", () => ({ useProfile: () => hook }));

const makeHook = (over: Record<string, unknown> = {}) => ({
  isBusy: false,
  dbUser: { first_name: "Ana", last_name: "Cruz", email: "a@b.co", phone: "09171234567", dob: "2000-01-02", gender: "female", member_since_month: "October", member_since_year: "2026" },
  clerkUser: { id: "user_1", imageUrl: "" },
  getToken: async () => "t",
  upcoming: [view(1), view(2)],
  nextAppointment: view(1),
  pastViews: [view(3, "completed")],
  stamps: 4,
  stampTarget: 10,
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
  birthday = { voucher: null, claim: vi.fn(async () => ({})), isClaiming: false, claimError: null };
});

describe("Profile page", () => {
  it("has two panels: the profile on the left, and Overview and Appointments tabs on the right", () => {
    render(<Profile />);
    const profile = within(screen.getByRole("complementary", { name: "Your profile" }));
    expect(profile.getByRole("heading", { level: 1 })).toHaveTextContent("Hi, Ana");
    expect(profile.getByText("Member since October 2026")).toBeInTheDocument();
    expect(profile.getByRole("button", { name: "Open your loyalty card" })).toBeInTheDocument();
    expect(profile.getByRole("region", { name: "My details" })).toHaveTextContent("a@b.co");
    expect(profile.getByRole("button", { name: "Manage account" })).toBeInTheDocument();
    expect(profile.getByRole("button", { name: "Log out" })).toBeInTheDocument();

    // Overview first: the next appointment and the counts
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    const overview = within(screen.getByRole("tabpanel"));
    expect(overview.getByRole("region", { name: "Next appointment" })).toHaveTextContent("Service 1");
    expect(within(overview.getByRole("group", { name: "Coming up" })).getByText("2")).toBeInTheDocument();
    expect(within(overview.getByRole("group", { name: "Loyalty stamps" })).getByText("4 / 10")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Appointments" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Appointments/ }));
    expect(screen.getByRole("region", { name: "Appointments" })).toHaveTextContent("Service 2");
  });

  it("opens an appointment's sheet from the list, and the loyalty card from the strip", () => {
    render(<Profile />);
    fireEvent.click(screen.getByRole("tab", { name: /Appointments/ }));
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
    // and the list it is in, behind the sheet
    expect(screen.getByRole("tab", { name: /Appointments/, hidden: true })).toHaveAttribute("aria-selected", "true");
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

  it("shows the birthday voucher on the Overview: claim it, then its code", () => {
    const voucher = { id: 1, code: "BDAY-1A2B3C4D", discount_pct: 20, valid_from: "2026-10-01", valid_until: "2026-10-31", status: "ISSUED", claimed_at: null };
    birthday = { ...birthday, voucher };
    const { rerender } = render(<Profile />);
    const card = within(screen.getByRole("region", { name: "Your birthday voucher" }));
    expect(card.getByText(/Claim it before October 31/)).toBeInTheDocument();
    fireEvent.click(card.getByRole("button", { name: "Claim 20% off" }));
    expect(birthday.claim).toHaveBeenCalled();

    birthday = { ...birthday, voucher: { ...voucher, status: "CLAIMED" } };
    rerender(<Profile />);
    expect(screen.getByRole("region", { name: "Your birthday voucher" })).toHaveTextContent("BDAY-1A2B3C4D");
    expect(screen.queryByRole("button", { name: "Claim 20% off" })).toBeNull();
  });

  it("has no birthday voucher card without one", () => {
    render(<Profile />);
    expect(screen.queryByRole("region", { name: "Your birthday voucher" })).toBeNull();
  });
});
