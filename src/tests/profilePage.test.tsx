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
  openAppointment: vi.fn(), reviews: {},
  ...over,
});

beforeEach(() => {
  hook = makeHook();
});

describe("MyAppointments", () => {
  it("lists upcoming and past appointments and shows the chosen one beside the list", () => {
    render(<MyAppointments />);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("heading", { level: 1, name: "My appointments" }));
    const list = within(screen.getByRole("region", { name: "Appointments" }));
    fireEvent.click(list.getByRole("button", { name: /Service 2/ }));
    // A computer here (no matchMedia): the panel shows it rather than the drawer
    expect(screen.getByRole("complementary", { name: "Service 2 details" })).toBeInTheDocument();
    expect(hook.openAppointment).not.toHaveBeenCalled();
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
    expect(screen.getByRole("list", { name: "Booking progress" })).toBeInTheDocument();
    // The loyalty card is a tab of the panel, not a drawer
    fireEvent.click(screen.getByRole("tab", { name: "Loyalty card" }));
    expect(screen.getByText("Clawholics Loyalty Card")).toBeInTheDocument();
    expect(screen.getByText(/6 more visits to a reward/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says when a reward is ready", () => {
    hook = makeHook({ stamps: 10 });
    render(<MyProfile />);
    fireEvent.click(screen.getByRole("tab", { name: "Loyalty card" }));
    expect(screen.getByText(/reward is ready/i)).toBeInTheDocument();
  });

  it("has no tracker and nothing booked for an account with no appointments", () => {
    hook = makeHook({ upcoming: [], pastViews: [], nextAppointment: null });
    render(<MyProfile />);
    expect(screen.queryByRole("list", { name: "Booking progress" })).toBeNull();
    expect(screen.getByText("No bookings to track yet.")).toBeInTheDocument();
    expect(screen.getByText("Nothing booked ahead.")).toBeInTheDocument();
  });

  it("says the bookings are loading, not that there are none, until the appointments arrive", () => {
    hook = makeHook({ upcoming: [], pastViews: [], nextAppointment: null, appointmentsLoading: true });
    render(<MyProfile />);
    expect(screen.getByText("Loading your bookings…")).toBeInTheDocument();
    expect(screen.queryByText("No bookings to track yet.")).toBeNull();
  });

  it("says the appointments are loading, not that nothing is coming up, until they arrive", () => {
    hook = makeHook({ upcoming: [], pastViews: [], nextAppointment: null, appointmentsLoading: true });
    render(<MyAppointments />);
    expect(screen.getByText("Loading your appointments…")).toBeInTheDocument();
    expect(screen.queryByText("Nothing coming up yet.")).toBeNull();
  });

  it("links back to the site and to the legal pages, in a new tab", () => {
    render(<MyProfile />);
    for (const [name, href] of [["Back to site", "/"], ["Terms", "/tou"], ["Privacy", "/privacy"]]) {
      const link = screen.getByRole("link", { name: (n) => n.startsWith(name) && n.endsWith("(opens in a new tab)") });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
    }
  });
});

describe("MyProfile visits", () => {
  it("counts every completed visit, not just the rows the Past list shows", () => {
    hook = makeHook({ appointments: [1, 2, 3, 4, 5, 6, 7].map((id) => ({ ...view(id, "completed").appt })), pastViews: [] });
    render(<MyProfile />);
    expect(within(screen.getByRole("group", { name: "Visits" })).getByText("7")).toBeInTheDocument();
  });
});
