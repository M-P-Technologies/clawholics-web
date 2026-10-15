import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyAppointments from "@/app/(client)/my/appointments/page";

vi.mock("@/lib/router", () => ({
  useNavigate: () => () => {},
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock("@/hooks/useServicePhotos", () => ({ useServicePhotos: () => () => "" }));
const layout = { table: true };
vi.mock("@/hooks/useMinWidth", () => ({ useTableLayout: () => layout.table }));

const view = (id: number, status = "confirmed", over = {}) => ({
  appt: { id, service_name: `Service ${id}`, nailist_id: 1, nailist_name: "Max", appointment_date: "2026-10-20", appointment_time: "09:00-11:00", status },
  displayStatus: status, remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true, statusLabel: status,
  dateLabel: "October 20, 2026", timeLabel: "9:00 AM - 11:00 AM", canPay: false, payLabel: "", isLocked: false, ...over,
});

let hook: Record<string, unknown>;
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => hook }));
const makeHook = (over: Record<string, unknown> = {}) => ({
  dbUser: { first_name: "Ana", last_name: "Cruz", email: "a@b.co" },
  clerkUser: { id: "user_1", imageUrl: "" },
  upcoming: [view(1), view(2)],
  pastViews: [view(3, "completed")],
  highlightedAppointmentId: null,
  historyFilter: "all", historySortBy: "appointmentDateDesc", handleHistoryFilterChange: vi.fn(), handleHistorySortChange: vi.fn(),
  hasMoreHistory: false, showAllHistory: false, toggleHistory: vi.fn(),
  openAppointment: vi.fn(), reviews: {},
  ...over,
});

beforeEach(() => {
  layout.table = true;
  hook = makeHook();
});

describe("My appointments", () => {
  it("starts on Upcoming and switches to Past", () => {
    render(<MyAppointments />);
    expect(screen.getByRole("tab", { name: /Upcoming/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Service 1")).toBeInTheDocument();
    expect(screen.queryByText("Service 3")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Past/ }));
    expect(screen.getByText("Service 3")).toBeInTheDocument();
    expect(screen.queryByText("Service 1")).toBeNull();
  });

  it("is a table on a computer with the artist, date, time and status", () => {
    render(<MyAppointments />);
    const table = screen.getByRole("table", { name: "Upcoming appointments" });
    const row = within(table).getByText("Service 2").closest("tr")!;
    expect(row).toHaveTextContent("Max");
    expect(row).toHaveTextContent("October 20, 2026");
    expect(row).toHaveTextContent("9:00 AM - 11:00 AM");
    expect(row).toHaveTextContent(/confirmed/i);
  });

  it("is cards on a phone", () => {
    layout.table = false;
    render(<MyAppointments />);
    const cards = within(screen.getByRole("list", { name: "Upcoming appointments" })).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent("Max");
  });

  it("opens the chosen appointment, on a computer and on a phone", () => {
    render(<MyAppointments />);
    fireEvent.click(screen.getByRole("button", { name: "Open Service 2" }));
    expect(hook.openAppointment).toHaveBeenCalledWith(2);
  });

  it("opens it from a phone card too", () => {
    layout.table = false;
    render(<MyAppointments />);
    fireEvent.click(screen.getByRole("button", { name: "Open Service 1" }));
    expect(hook.openAppointment).toHaveBeenCalledWith(1);
  });

  it("marks the appointment the link pointed at", () => {
    hook = makeHook({ highlightedAppointmentId: 2 });
    render(<MyAppointments />);
    expect(screen.getByText("Service 2").closest("tr")).toHaveAttribute("data-highlighted", "true");
    expect(screen.getByText("Service 1").closest("tr")).not.toHaveAttribute("data-highlighted");
  });

  it("marks a completed visit that hasn't been reviewed", () => {
    const { unmount } = render(<MyAppointments />);
    fireEvent.click(screen.getByRole("tab", { name: /Past/ }));
    expect(screen.getByText("Leave a review")).toBeInTheDocument();
    unmount();
    hook = makeHook({ reviews: { 3: { rating: 5 } } });
    render(<MyAppointments />);
    fireEvent.click(screen.getByRole("tab", { name: /Past/ }));
    expect(screen.queryByText("Leave a review")).toBeNull();
  });

  it("says so when an account has no appointments", () => {
    hook = makeHook({ upcoming: [], pastViews: [] });
    render(<MyAppointments />);
    expect(screen.getByText(/nothing coming up/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Past/ }));
    expect(screen.getByText(/no past appointments/i)).toBeInTheDocument();
  });

  it("keeps the past filter, sort and 'view more'", () => {
    hook = makeHook({ hasMoreHistory: true });
    render(<MyAppointments />);
    expect(screen.queryByRole("button", { name: "Filter past appointments" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /Past/ }));
    fireEvent.click(screen.getByRole("button", { name: "Filter past appointments" }));
    fireEvent.click(screen.getByRole("option", { name: /Cancelled/ }));
    expect(hook.handleHistoryFilterChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: "cancelled" } }));
    expect(screen.getByRole("button", { name: "Sort past appointments" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view more/i }));
    expect(hook.toggleHistory).toHaveBeenCalled();
  });

  it("starts the phone cards on the first page when switching tabs", () => {
    layout.table = false;
    hook = makeHook({ upcoming: Array.from({ length: 7 }, (_, i) => view(i + 1)), pastViews: Array.from({ length: 7 }, (_, i) => view(i + 20, "completed")) });
    render(<MyAppointments />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Service 6")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Past/ }));
    expect(screen.getByText("Service 20")).toBeInTheDocument();
  });
});
