import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentCard from "@/components/profile/AppointmentCard";
import NextAppointmentCard from "@/components/profile/NextAppointmentCard";
import type { AppointmentView } from "@/components/profile/types";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const make = (over: Partial<AppointmentView> = {}, apptOver: Partial<AppointmentView["appt"]> = {}): AppointmentView => ({
  appt: { id: 5, service_name: "Hard Gel", nailist_id: 1, nailist_name: "Miss Max", appointment_date: "2026-10-20", appointment_time: "09:00-11:00", status: "confirmed", ...apptOver },
  displayStatus: "confirmed", remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true,
  statusLabel: "confirmed", dateLabel: "October 20, 2026", timeLabel: "9:00 AM - 11:00 AM",
  canPay: false, payLabel: "", isLocked: false, ...over,
});
const NOW = Date.parse("2026-10-17T09:00:00+08:00");
const actions = () => ({ onPay: vi.fn(), onReschedule: vi.fn(), onCancel: vi.fn() });

describe("AppointmentCard", () => {
  it("shows the service, artist, date, time and status, and opens on tap", () => {
    const onOpen = vi.fn();
    render(<AppointmentCard view={make()} photo="" onOpen={onOpen} />);
    const card = screen.getByRole("button", { name: /Hard Gel/ });
    expect(card).toHaveTextContent("With Miss Max");
    expect(card).toHaveTextContent("October 20, 2026");
    expect(card).toHaveTextContent("9:00 AM - 11:00 AM");
    expect(card).toHaveTextContent("confirmed");
    fireEvent.click(card);
    expect(onOpen).toHaveBeenCalled();
  });

  it("falls back to the emblem when there is no photo, and keeps long names from overflowing", () => {
    const long = { service_name: "A very long service name ".repeat(6), nailist_name: "An equally long artist name ".repeat(6) };
    const { container } = render(<AppointmentCard view={make({}, long)} photo="" onOpen={() => {}} />);
    expect(container.querySelector("img")).not.toBeNull(); // the emblem
    expect(screen.getAllByText(/A very long service name/)[0].className).toContain("truncate");
    expect(screen.getByText(/With An equally long/).className).toContain("truncate");
  });
});

describe("NextAppointmentCard", () => {
  it("offers Reschedule and Cancel for a confirmed appointment, with how far away it is", () => {
    const a = actions();
    render(<NextAppointmentCard view={make()} photo="" now={NOW} {...a} />);
    expect(screen.getByText("in 3 days")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(a.onReschedule).toHaveBeenCalledTimes(1);
    expect(a.onCancel).toHaveBeenCalledTimes(1);
  });

  it("makes Complete payment the main action while the hold runs, with its countdown", () => {
    const a = actions();
    render(<NextAppointmentCard view={make({ canPay: true, canReschedule: false, displayStatus: "pending", payLabel: "9:35", statusLabel: "pending" })} photo="" now={NOW} {...a} />);
    expect(screen.getByText(/Pay within 9:35/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Complete payment" }));
    expect(a.onPay).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull();
  });

  it("disables Reschedule inside the change window and says why", () => {
    render(<NextAppointmentCard view={make({ canReschedule: false, isLocked: true })} photo="" now={NOW} {...actions()} />);
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeDisabled();
    expect(screen.getByText(/Changes close 3 days before/)).toBeInTheDocument();
  });

  it("never offers payment for an expired hold", () => {
    render(<NextAppointmentCard view={make({ canPay: false, isExpired: true, canCancel: false, canReschedule: false, displayStatus: "Cancelled", statusLabel: "Cancelled" })} photo="" now={NOW} {...actions()} />);
    expect(screen.queryByRole("button", { name: "Complete payment" })).toBeNull();
  });

  it("invites a first booking when there is nothing upcoming", () => {
    render(<NextAppointmentCard view={null} photo="" now={NOW} {...actions()} />);
    expect(screen.getByText(/no upcoming appointments/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /book now/i })).toHaveAttribute("href", "/services");
  });
});
