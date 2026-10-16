import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScheduleWeekGrid from "@/components/features/admin/schedule/ScheduleWeekGrid";
import { weekDays } from "@/services/scheduleAgenda";
import type { MonthlySchedule, ScheduleAppointment } from "@/services/scheduleService";

const appt = (id: number, over: Partial<ScheduleAppointment>): ScheduleAppointment => ({
  id, nailist_id: 1, nailist_name: "Miss Max", appointment_date: "2026-10-13", appointment_time: "10:00-11:30",
  service_name: "Softgel Extensions", status: "CONFIRMED", first_name: "Ana", last_name: "Cruz", ...over,
});

const schedule: MonthlySchedule = {
  nailists: [{ id: 1, name: "Miss Max" }, { id: 2, name: "Miss Emily" }],
  timeSlots: [],
  dayOffs: [
    { nailist_id: 2, day_off_type: "REGULAR", day_of_week: 3 }, // Wednesdays
    { nailist_id: 1, day_off_type: "CUSTOM", date: "2026-10-17" },
  ],
  appointments: [
    appt(1, {}),
    appt(2, { appointment_time: "09:00-10:00", first_name: "Bea", last_name: "Lim", service_name: "Hard Gel", status: "PENDING" }),
    appt(3, { nailist_id: 2, appointment_date: "2026-10-12", first_name: "Cara", last_name: "Go", service_name: "Eyelash Extension", status: "COMPLETED" }),
    appt(4, { nailist_id: 2, appointment_date: "2026-10-16", first_name: "Dana", last_name: "Reyes", status: "CANCELLED" }),
    appt(5, { appointment_date: "2026-10-20", first_name: "Next", last_name: "Week" }),
  ],
};
const days = weekDays(new Date(2026, 9, 14)); // Mon 12 – Sun 18 Oct

const renderGrid = (over: Partial<Parameters<typeof ScheduleWeekGrid>[0]> = {}) => {
  const onOpen = vi.fn();
  const onOpenDay = vi.fn();
  render(<ScheduleWeekGrid days={days} schedule={schedule} todayKey="2026-10-14" query="" service="All" artist="All" onOpen={onOpen} onOpenDay={onOpenDay} {...over} />);
  return { onOpen, onOpenDay };
};

describe("ScheduleWeekGrid", () => {
  it("puts the artists down the side and the week across, today marked", () => {
    renderGrid();
    const grid = screen.getByRole("table", { name: "Week schedule" });
    const heads = within(grid).getAllByRole("columnheader").map((h) => h.textContent);
    expect(heads.slice(1)).toEqual(["Mon12", "Tue13", "Wed14Today", "Thu15", "Fri16", "Sat17", "Sun18"]);
    expect(within(grid).getByRole("rowheader", { name: /Miss Max/ })).toBeInTheDocument();
    expect(within(grid).getByRole("rowheader", { name: /Miss Emily/ })).toBeInTheDocument();
  });

  it("shows each booking as a block in its artist's day, in time order, coloured by status", () => {
    renderGrid();
    const max = within(screen.getByRole("row", { name: /Miss Max/ }));
    const tuesday = within(max.getByRole("cell", { name: /Tuesday/ }));
    const blocks = tuesday.getAllByRole("button");
    expect(blocks.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Bea Lim, Hard Gel, 9:00 AM - 10:00 AM, pending",
      "Ana Cruz, Softgel Extensions, 10:00 AM - 11:30 AM, confirmed",
    ]);
    expect(blocks[0]).toHaveAttribute("data-status", "pending");
    expect(blocks[1]).toHaveAttribute("data-status", "confirmed");
    expect(within(blocks[1]).getByText("Ana Cruz")).toBeInTheDocument();
    expect(within(blocks[1]).getByText("10:00 AM - 11:30 AM")).toBeInTheDocument();
    // next week's booking isn't in this week
    expect(screen.queryByText("Next Week")).toBeNull();
  });

  it("shades days off: a regular weekday and a one-off date", () => {
    renderGrid();
    const emily = within(screen.getByRole("row", { name: /Miss Emily/ }));
    expect(emily.getByRole("cell", { name: "Wednesday: day off" })).toHaveTextContent("Day off");
    const max = within(screen.getByRole("row", { name: /Miss Max/ }));
    expect(max.getByRole("cell", { name: "Saturday: day off" })).toBeInTheDocument();
  });

  it("opens a booking, and a day", () => {
    const { onOpen, onOpenDay } = renderGrid();
    fireEvent.click(screen.getByRole("button", { name: /Cara Go/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }));
    fireEvent.click(screen.getByRole("button", { name: "Open Thursday, October 15" }));
    expect(onOpenDay).toHaveBeenCalledWith("2026-10-15");
  });

  it("filters by search, service and artist", () => {
    const { rerender } = render(<div />);
    rerender(<ScheduleWeekGrid days={days} schedule={schedule} todayKey="2026-10-14" query="cara" service="All" artist="All" onOpen={vi.fn()} onOpenDay={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /, (pending|confirmed|completed|cancelled)$/ })).toHaveLength(1);
    rerender(<ScheduleWeekGrid days={days} schedule={schedule} todayKey="2026-10-14" query="" service="Hard Gel" artist="All" onOpen={vi.fn()} onOpenDay={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Bea Lim/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ana Cruz/ })).toBeNull();
    rerender(<ScheduleWeekGrid days={days} schedule={schedule} todayKey="2026-10-14" query="" service="All" artist="Miss Emily" onOpen={vi.fn()} onOpenDay={vi.fn()} />);
    expect(screen.queryByRole("row", { name: /Miss Max/ })).toBeNull();
  });

  it("explains the colours in a legend", () => {
    renderGrid();
    const legend = within(screen.getByRole("list", { name: "Legend" }));
    for (const label of ["Confirmed", "Pending", "Completed", "Cancelled", "Day off"]) expect(legend.getByText(label)).toBeInTheDocument();
  });
});
