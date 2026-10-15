import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientHome from "@/app/(client)/my/page";

const navigate = vi.fn();
vi.mock("@/lib/router", () => ({
  useNavigate: () => navigate,
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock("@/hooks/useServicePhotos", () => ({ useServicePhotos: () => () => "" }));
const services = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1, name: `Service ${i + 1}`, description: "Nice set", pricing_type: "flat", price: 500 + i, master_price: 0, junior_price: 0, image: "", variants: [], category: "Nails",
}));
let home: Record<string, string> = {};
vi.mock("@/services/serviceService", () => ({ fetchServices: () => Promise.resolve(services) }));
vi.mock("@/services/contentService", () => ({ fetchHomeContent: () => Promise.resolve(home) }));
let account: Record<string, unknown>;
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => account }));
let birthday: Record<string, unknown>;
vi.mock("@/hooks/useBirthdayVoucher", () => ({ useBirthdayVoucher: () => birthday }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T08:00:00+08:00"));
  home = {};
  navigate.mockReset();
  account = {
    dbUser: { first_name: "Ana", dob: "1998-03-02" }, clerkUser: { firstName: "Ana" },
    nextAppointment: null, pastViews: [], appointments: [], currentTime: Date.now(), stamps: 3, stampTarget: 10,
    payForAppointment: vi.fn(), rescheduleAppointment: vi.fn(), startCancel: vi.fn(), openRewards: vi.fn(), openAppointment: vi.fn(),
  };
});
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  birthday = { voucher: null, claim: vi.fn(async () => ({})), isClaiming: false, claimError: null };
});

const view = (over: Record<string, unknown> = {}, apptOver: Record<string, unknown> = {}) => ({
  appt: { id: 5, service_name: "Hard Gel", nailist_id: 1, nailist_name: "Miss Max", appointment_date: "2026-10-17", appointment_time: "09:00-11:00", status: "confirmed", created_at: "2026-10-10 05:00:00", ...apptOver },
  displayStatus: "confirmed", remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true,
  statusLabel: "confirmed", dateLabel: "October 17, 2026", timeLabel: "9:00 AM - 11:00 AM",
  canPay: false, payLabel: "", isLocked: false, ...over,
});

describe("ClientHome", () => {
  it("greets the client and searches in Explore", () => {
    render(<ClientHome />);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("heading", { level: 1, name: "Hi, Ana" }));
    // The app's top bar, not a page header of its own
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("link", { name: /View site/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search services" }), { target: { value: "gel x" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(navigate).toHaveBeenCalledWith("/my/explore?q=gel%20x");
  });

  it("shows the first eight services in their admin order", async () => {
    render(<ClientHome />);
    await waitFor(() => expect(screen.getByText("Service 1")).toBeInTheDocument());
    expect(screen.getByText("Service 8")).toBeInTheDocument();
    expect(screen.queryByText("Service 9")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Service 1/ })).toHaveAttribute("href", "/my/explore/1");
  });

  it("leaves Special offers out when there are none", async () => {
    render(<ClientHome />);
    await waitFor(() => expect(screen.getByText("Service 1")).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Special offers" })).not.toBeInTheDocument();
  });

  it("shows the birthday banner in the client's birthday month", async () => {
    account = { ...account, dbUser: { first_name: "Ana", dob: "1998-10-25" } };
    render(<ClientHome />);
    expect(await screen.findByRole("heading", { name: "Special offers" })).toBeInTheDocument();
    expect(screen.getByText("Happy birthday, Ana!")).toBeInTheDocument();
  });

  it("shows the admin's offers", async () => {
    home = { home_offers: JSON.stringify([{ title: "20% off", line: "On gel", note: "", image: "", buttonLabel: "Grab it", link: "/my/explore/2" }]) };
    render(<ClientHome />);
    expect(await screen.findByText("20% off")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Grab it" })).toHaveAttribute("href", "/my/explore/2");
  });

  it("offers a booking from the empty upcoming card", () => {
    render(<ClientHome />);
    expect(screen.getByText("You have no upcoming appointments.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book now" })).toHaveAttribute("href", "/my/explore");
  });

  it("shows the glance cards: next visit, stamps and visits", () => {
    const past = [view({}, { id: 1, status: "COMPLETED" }), view({}, { id: 2, status: "cancelled" })];
    account = { ...account, nextAppointment: view(), pastViews: past, appointments: past.map((p) => p.appt) };
    render(<ClientHome />);
    expect(within(screen.getByRole("group", { name: "Next visit" })).getByText("October 17, 2026")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Loyalty stamps" })).getByText("3 / 10")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Visits" })).getByText("1")).toBeInTheDocument();
  });

  it("says no visit is booked on the glance card when nothing is coming up", () => {
    render(<ClientHome />);
    expect(within(screen.getByRole("group", { name: "Next visit" })).getByText("None booked")).toBeInTheDocument();
  });

  it("shows the upcoming appointment with how far away it is, and where the booking is", () => {
    account = { ...account, nextAppointment: view() };
    render(<ClientHome />);
    const upcoming = within(screen.getByRole("region", { name: "Upcoming appointment" }));
    expect(upcoming.getByText("Hard Gel")).toBeInTheDocument();
    expect(upcoming.getByText("Miss Max")).toBeInTheDocument();
    expect(upcoming.getByText(/in 3 days/)).toBeInTheDocument();
    fireEvent.click(upcoming.getByRole("button", { name: "Reschedule" }));
    fireEvent.click(upcoming.getByRole("button", { name: "Cancel" }));
    expect(account.rescheduleAppointment).toHaveBeenCalledTimes(1);
    expect(account.startCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("list", { name: "Booking progress" })).toBeInTheDocument();
  });

  it("makes Complete payment the main action while the hold runs, with its countdown", () => {
    account = { ...account, nextAppointment: view({ canPay: true, canReschedule: false, displayStatus: "pending", payLabel: "9:35", statusLabel: "pending" }) };
    render(<ClientHome />);
    expect(screen.getByText(/Pay within 9:35/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Complete payment" }));
    expect(account.payForAppointment).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull();
  });

  it("disables Reschedule inside the change window and says why, and never offers payment for an expired hold", () => {
    account = { ...account, nextAppointment: view({ canReschedule: false, isLocked: true }) };
    const { unmount } = render(<ClientHome />);
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeDisabled();
    expect(screen.getByText(/Changes close 3 days before/)).toBeInTheDocument();
    unmount();
    account = { ...account, nextAppointment: view({ canPay: false, isExpired: true, canCancel: false, canReschedule: false, displayStatus: "Cancelled", statusLabel: "Cancelled" }) };
    render(<ClientHome />);
    expect(screen.queryByRole("button", { name: "Complete payment" })).toBeNull();
  });

  it("has no tracker when nothing is coming up", () => {
    render(<ClientHome />);
    expect(screen.queryByRole("list", { name: "Booking progress" })).toBeNull();
  });

  it("counts every completed visit, not just the rows the Past list shows", () => {
    const appts = Array.from({ length: 8 }, (_, i) => ({ ...view({}, { id: i + 1, status: "COMPLETED" }).appt }));
    // The Past list is cut to five rows and filtered to cancelled visits
    account = { ...account, appointments: [...appts, { ...appts[0], id: 99, status: "cancelled" }], pastViews: [view({}, { id: 99, status: "cancelled" })] };
    render(<ClientHome />);
    expect(within(screen.getByRole("group", { name: "Visits" })).getByText("8")).toBeInTheDocument();
  });
});

describe("ClientHome birthday voucher", () => {
  it("shows the birthday voucher: claim it, then its code", () => {
    const voucher = { id: 1, code: "BDAY-1A2B3C4D", discount_pct: 20, valid_from: "2026-10-01", valid_until: "2026-10-31", status: "ISSUED", claimed_at: null };
    birthday = { ...birthday, voucher };
    const { rerender } = render(<ClientHome />);
    const card = within(screen.getByRole("region", { name: "Your birthday voucher" }));
    expect(card.getByText(/Claim it before October 31/)).toBeInTheDocument();
    fireEvent.click(card.getByRole("button", { name: "Claim 20% off" }));
    expect(birthday.claim).toHaveBeenCalled();

    birthday = { ...birthday, voucher: { ...voucher, status: "CLAIMED" } };
    rerender(<ClientHome />);
    expect(screen.getByRole("region", { name: "Your birthday voucher" })).toHaveTextContent("BDAY-1A2B3C4D");
    expect(screen.queryByRole("button", { name: "Claim 20% off" })).toBeNull();
  });

  it("has no birthday voucher card without one", () => {
    render(<ClientHome />);
    expect(screen.queryByRole("region", { name: "Your birthday voucher" })).toBeNull();
  });
});
