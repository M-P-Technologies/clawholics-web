import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScheduleAgenda, { type AgendaArtist } from "@/components/features/admin/schedule/ScheduleAgenda";
import type { ScheduleAppointment } from "@/services/scheduleService";

const appt = (over: Partial<ScheduleAppointment>): ScheduleAppointment => ({
  id: 1, nailist_id: 1, nailist_name: "Ana", appointment_date: "2026-10-14", appointment_time: "10:00-11:00",
  service_name: "Gel", status: "CONFIRMED", client_name: "Bea Lim", ...over,
});

// Wed 14 Oct 2026 has two appointments (one for each artist, the later one listed first) and a day-off artist
const dayData = (date: Date): AgendaArtist[] =>
  date.getDate() === 14
    ? [
        { id: 1, name: "Ana", appointments: [appt({ id: 2, appointment_time: "15:00-16:00", client_name: "Late Client" })], isDayOff: false },
        { id: 2, name: "Cara", appointments: [appt({ id: 3, nailist_id: 2, nailist_name: "Cara", appointment_time: "09:00-10:00", client_name: "Early Client" })], isDayOff: false },
        { id: 3, name: "Dina", appointments: [], isDayOff: true },
      ]
    : [{ id: 1, name: "Ana", appointments: [], isDayOff: false }];

describe("ScheduleAgenda", () => {
  it("shows the week Monday to Sunday and marks the selected day", () => {
    render(<ScheduleAgenda selected={new Date(2026, 9, 14)} onSelect={() => {}} dayData={dayData} onOpenAppointment={() => {}} />);
    const strip = screen.getByRole("group", { name: "Week" });
    expect(within(strip).getAllByRole("button", { name: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+/ })).toHaveLength(7);
    expect(within(strip).getByRole("button", { name: "Wed 14" })).toHaveAttribute("aria-pressed", "true");
    expect(within(strip).getByRole("button", { name: "Mon 12" })).toHaveAttribute("aria-pressed", "false");
  });

  it("lists the day's appointments in time order and notes who is off", () => {
    render(<ScheduleAgenda selected={new Date(2026, 9, 14)} onSelect={() => {}} dayData={dayData} onOpenAppointment={() => {}} />);
    const rows = screen.getAllByRole("button", { name: /Client/ });
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining("Early Client"), expect.stringContaining("Late Client")]);
    expect(screen.getByText("Dina is off")).toBeInTheDocument();
  });

  it("says so when the day is empty", () => {
    render(<ScheduleAgenda selected={new Date(2026, 9, 15)} onSelect={() => {}} dayData={dayData} onOpenAppointment={() => {}} />);
    expect(screen.getByText("No appointments on this day.")).toBeInTheDocument();
  });

  it("selecting a day and moving a week report the new date", () => {
    const onSelect = vi.fn();
    render(<ScheduleAgenda selected={new Date(2026, 9, 14)} onSelect={onSelect} dayData={dayData} onOpenAppointment={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Fri 16" }));
    expect(onSelect.mock.calls[0][0].getDate()).toBe(16);
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(onSelect.mock.calls[1][0].getDate()).toBe(21);
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    expect(onSelect.mock.calls[2][0].getDate()).toBe(7);
  });

  it("opens the tapped appointment", () => {
    const onOpen = vi.fn();
    render(<ScheduleAgenda selected={new Date(2026, 9, 14)} onSelect={() => {}} dayData={dayData} onOpenAppointment={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /Early Client/ }));
    expect(onOpen.mock.calls[0][0].id).toBe(3);
  });

  it("dots the days that have appointments", () => {
    render(<ScheduleAgenda selected={new Date(2026, 9, 14)} onSelect={() => {}} dayData={dayData} onOpenAppointment={() => {}} />);
    expect(within(screen.getByRole("button", { name: "Wed 14" })).getByTestId("day-dot")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: "Mon 12" })).queryByTestId("day-dot")).toBeNull();
  });
});
