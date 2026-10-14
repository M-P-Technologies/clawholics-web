import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Schedule from "@/admin/front-desk/Schedule";
import type { MonthlySchedule, ScheduleAppointment } from "@/services/scheduleService";

const appt = (id: number, date: string, client: string): ScheduleAppointment => ({
  id, nailist_id: 1, nailist_name: "Ana", appointment_date: date, appointment_time: "10:00-11:00",
  service_name: "Gel", status: "CONFIRMED", client_name: client,
});

let byMonth: Record<string, ScheduleAppointment[]> = {};
const fetchMonthlySchedule = vi.fn(async (month: string): Promise<MonthlySchedule> => ({
  nailists: [{ id: 1, name: "Ana" }], timeSlots: [], dayOffs: [], appointments: byMonth[month] ?? [],
}));

vi.mock("@/services/scheduleService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/scheduleService")>()),
  fetchMonthlySchedule: (month: string) => fetchMonthlySchedule(month),
}));
vi.mock("@/components/admin/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show: vi.fn() }) }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  fetchMonthlySchedule.mockClear();
  byMonth = {};
});
afterEach(() => {
  vi.useRealTimers();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

describe("Schedule on a phone", () => {
  it("loads both months when the week spans two, so the strip dots are right", async () => {
    vi.setSystemTime(new Date(2026, 9, 1)); // Thu 1 Oct: the week starts Mon 28 Sep
    byMonth = { "2026-09": [appt(1, "2026-09-30", "Sept Client")], "2026-10": [] };
    render(<Schedule />);
    const strip = await screen.findByRole("group", { name: "Week" });
    expect(fetchMonthlySchedule).toHaveBeenCalledWith("2026-10");
    expect(fetchMonthlySchedule).toHaveBeenCalledWith("2026-09");
    expect(within(within(strip).getByRole("button", { name: "Wed 30" })).getByTestId("day-dot")).toBeInTheDocument();
  });

  it("going from Month back to Day shows the agenda day's month again", async () => {
    vi.setSystemTime(new Date(2026, 9, 12));
    byMonth = { "2026-10": [appt(2, "2026-10-12", "Oct Client")] };
    render(<Schedule />);
    expect(await screen.findByText("Oct Client")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    fireEvent.click(await screen.findByRole("button", { name: "Next month" }));
    await waitFor(() => expect(fetchMonthlySchedule).toHaveBeenCalledWith("2026-11"));

    fireEvent.click(screen.getByRole("button", { name: "Day" }));
    expect(await screen.findByText("Oct Client")).toBeInTheDocument();
  });

  it("treats 64rem as the desktop width, the same as the lg breakpoint", async () => {
    vi.setSystemTime(new Date(2026, 9, 12));
    window.matchMedia = ((query: string) => ({ matches: query === "(min-width: 64rem)" })) as unknown as typeof window.matchMedia;
    render(<Schedule />);
    // desktop: the week grid, opened on this week
    expect(await screen.findByRole("table", { name: "Week schedule" })).toBeInTheDocument();
    expect(screen.getByText("Oct 12 – 18, 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Thursday, October 15" }));
    // the desktop day drawer opens, not the phone agenda
    expect(await screen.findByText(/October 15, 2026/)).toBeInTheDocument();
  });

  it("on desktop, has the service and artist filters together in the row above the week", async () => {
    vi.setSystemTime(new Date(2026, 9, 12));
    window.matchMedia = ((query: string) => ({ matches: query === "(min-width: 64rem)" })) as unknown as typeof window.matchMedia;
    render(<Schedule />);
    await screen.findByRole("table", { name: "Week schedule" });
    const service = screen.getByRole("button", { name: "Service" });
    const artist = screen.getByRole("button", { name: "Artist" });
    const row = (el: HTMLElement) => el.closest(".flex-wrap");
    expect(row(service)).not.toBeNull();
    expect(row(artist)).toBe(row(service));
    expect(row(artist)).toContainElement(screen.getByRole("button", { name: "Next week" }));
  });

  it("on desktop, moves a week at a time, loading both months when a week spans two", async () => {
    vi.setSystemTime(new Date(2026, 9, 21));
    window.matchMedia = ((query: string) => ({ matches: query === "(min-width: 64rem)" })) as unknown as typeof window.matchMedia;
    render(<Schedule />);
    await screen.findByRole("table", { name: "Week schedule" });
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    expect(await screen.findByText("Oct 26 – Nov 1, 2026")).toBeInTheDocument();
    await waitFor(() => expect(fetchMonthlySchedule).toHaveBeenCalledWith("2026-11"));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(await screen.findByText("Oct 19 – 25, 2026")).toBeInTheDocument();
  });

  it("keeps the screen up while another month loads", async () => {
    vi.setSystemTime(new Date(2026, 9, 12));
    render(<Schedule />);
    await screen.findByRole("group", { name: "Week" });

    let release: (value: MonthlySchedule) => void = () => {};
    fetchMonthlySchedule.mockImplementationOnce(() => new Promise<MonthlySchedule>((resolve) => { release = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    fireEvent.click(await screen.findByRole("button", { name: "Next month" }));
    await waitFor(() => expect(fetchMonthlySchedule).toHaveBeenCalledWith("2026-11"));

    expect(screen.queryByText(/Loading the schedule/)).toBeNull();
    release({ nailists: [], timeSlots: [], dayOffs: [], appointments: [] });
  });
});
