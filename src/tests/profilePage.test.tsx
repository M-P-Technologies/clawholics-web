import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyAppointments from "@/app/(client)/my/appointments/page";
import MyProfile from "@/app/(client)/my/profile/page";

vi.mock("@/lib/router", () => ({
  useNavigate: () => () => {},
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
const signOut = vi.fn();
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ openUserProfile: vi.fn(), signOut }) }));
vi.mock("@/hooks/useServicePhotos", () => ({ useServicePhotos: () => () => "" }));
vi.mock("@/components/features/client/appointments/PaymentProofCard", () => ({ default: () => null }));

const view = (id: number, status = "confirmed", over = {}) => ({
  appt: { id, service_name: `Service ${id}`, nailist_id: 1, nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "09:00-11:00", status },
  displayStatus: status, remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true, statusLabel: status,
  dateLabel: "October 20, 2026", timeLabel: "9:00 AM - 11:00 AM", canPay: false, payLabel: "", isLocked: false, ...over,
});

let hook: Record<string, unknown>;
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => hook }));

const makeHook = (over: Record<string, unknown> = {}) => ({
  isBusy: false,
  dbUser: { first_name: "Ana", last_name: "Cruz", email: "a@b.co", phone: "09171234567", dob: "2000-01-02", gender: "female", member_since_month: "October", member_since_year: "2026" },
  clerkUser: { id: "user_1", imageUrl: "" },
  getToken: async () => "t",
  upcoming: [view(1), view(2)],
  nextAppointment: view(1),
  pastViews: [view(3, "completed")],
  appointments: [view(1).appt, view(2).appt, view(3, "completed").appt],
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
  openAppointment: vi.fn(), openRewards: vi.fn(), reviews: {},
  ...over,
});

beforeEach(() => {
  hook = makeHook();
});

describe("MyAppointments", () => {
  it("lists upcoming and past appointments and opens one", () => {
    render(<MyAppointments />);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("heading", { level: 1, name: "My appointments" }));
    const list = within(screen.getByRole("region", { name: "Appointments" }));
    fireEvent.click(list.getByRole("button", { name: /Service 2/ }));
    expect(hook.openAppointment).toHaveBeenCalledWith(2);
  });
});

describe("MyProfile", () => {
  it("shows the profile panel with the client's details and actions", () => {
    render(<MyProfile />);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("heading", { level: 1, name: "My profile" }));
    const panel = within(screen.getByRole("complementary", { name: "Your profile" }));
    expect(panel.getByRole("heading", { name: "Ana Cruz" })).toBeInTheDocument();
    expect(panel.getByText("Member since October 2026")).toBeInTheDocument();
    expect(panel.getByText("09171234567")).toBeInTheDocument();
    expect(panel.getByText("Next visit")).toBeInTheDocument();
    fireEvent.click(panel.getByRole("button", { name: "Edit details" }));
    expect(hook.handleEditClick).toHaveBeenCalled();
    fireEvent.click(panel.getByRole("button", { name: "Log out" }));
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });

  it("shows the glance cards, the loyalty card and where the booking is", () => {
    render(<MyProfile />);
    expect(within(screen.getByRole("group", { name: "Loyalty stamps" })).getByText("4 / 10")).toBeInTheDocument();
    expect(screen.getByText(/6 more visits to a reward/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open your loyalty card" }));
    expect(hook.openRewards).toHaveBeenCalled();
    expect(screen.getByRole("list", { name: "Booking progress" })).toBeInTheDocument();
  });

  it("says when a reward is ready", () => {
    hook = makeHook({ stamps: 10 });
    render(<MyProfile />);
    expect(screen.getByText(/reward is ready/i)).toBeInTheDocument();
  });

  it("has no tracker and nothing booked for an account with no appointments", () => {
    hook = makeHook({ upcoming: [], pastViews: [], nextAppointment: null });
    render(<MyProfile />);
    expect(screen.queryByRole("list", { name: "Booking progress" })).toBeNull();
    expect(screen.getByText("No bookings to track yet.")).toBeInTheDocument();
    expect(screen.getByText("Nothing booked ahead.")).toBeInTheDocument();
  });

  it("links back to the site and to the legal pages", () => {
    render(<MyProfile />);
    expect(screen.getByRole("link", { name: "Back to site" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/tou");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });
});

describe("MyProfile visits", () => {
  it("counts every completed visit, not just the rows the Past list shows", () => {
    hook = makeHook({ appointments: [1, 2, 3, 4, 5, 6, 7].map((id) => ({ ...view(id, "completed").appt })), pastViews: [] });
    render(<MyProfile />);
    expect(within(screen.getByRole("group", { name: "Visits" })).getByText("7")).toBeInTheDocument();
  });
});
