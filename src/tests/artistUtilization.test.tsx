import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArtistUtilization from "@/components/admin/dashboard/ArtistUtilization";
import type { Utilization } from "@/services/dashboardTypes";

const day = (date: string, offered: number, booked: number, off = false) => ({ date, offered, booked, off });
const week = (from: string, overall: number | null = 15 / 36): Utilization => ({
  week: { from, to: "2026-10-18" },
  overall,
  artists: [
    {
      id: 1, name: "Maxine", title: "Master Technician", image: null, rate: 14 / 24,
      days: [day("2026-10-12", 4, 3), day("2026-10-13", 4, 4), day("2026-10-14", 4, 5), day("2026-10-15", 4, 2),
        day("2026-10-16", 0, 0, true), day("2026-10-17", 4, 0), day("2026-10-18", 4, 0)],
    },
    {
      id: 2, name: "Jun", title: "Junior Technician", image: "https://img.test/jun.jpg", rate: 1 / 12,
      days: [day("2026-10-12", 2, 0), day("2026-10-13", 2, 0), day("2026-10-14", 2, 1), day("2026-10-15", 0, 1, true),
        day("2026-10-16", 2, 0), day("2026-10-17", 2, 0), day("2026-10-18", 2, 0)],
    },
  ],
});

const load = vi.fn();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T02:00:00Z")); // Wednesday 14 Oct in Manila
  load.mockReset().mockImplementation(async (date: string) => week(date === "2026-10-14" ? "2026-10-12" : date));
});
afterEach(() => vi.useRealTimers());

describe("ArtistUtilization", () => {
  it("loads this week and shows each artist's days as booked of offered slots", async () => {
    render(<ArtistUtilization load={load} />);
    const card = within(await screen.findByRole("region", { name: "Artist utilization" }));
    expect(load).toHaveBeenCalledWith("2026-10-14");
    expect(card.getByText("Oct 12 – 18, 2026")).toBeInTheDocument();

    const maxine = within(await card.findByRole("row", { name: /Maxine/ }));
    expect(maxine.getByText("Master Technician")).toBeInTheDocument();
    expect(maxine.getByText("58%")).toBeInTheDocument(); // 14 of 24
    expect(maxine.getByRole("cell", { name: "Monday: 3 of 4 slots booked" })).toHaveTextContent("3/4");
    expect(maxine.getByRole("cell", { name: "Friday: day off" })).toHaveTextContent("Off");
    // more bookings than slots: shown as they are, the bar stops at full
    expect(maxine.getByRole("cell", { name: "Wednesday: 5 of 4 slots booked" })).toHaveTextContent("5/4");
  });

  it("shows a booking made on a day off instead of hiding it", async () => {
    render(<ArtistUtilization load={load} />);
    const jun = within(await screen.findByRole("row", { name: /Jun/ }));
    expect(jun.getByRole("cell", { name: "Thursday: day off, 1 booked anyway" })).toHaveTextContent("1 booked");
    expect(jun.getByRole("img", { name: "Jun" })).toHaveAttribute("src", "https://img.test/jun.jpg");
  });

  it("says how full the salon is overall, and names the columns with today marked", async () => {
    render(<ArtistUtilization load={load} />);
    const card = within(await screen.findByRole("region", { name: "Artist utilization" }));
    expect(await card.findByText("42% of all slots booked")).toBeInTheDocument();
    expect(card.getByRole("columnheader", { name: /Wed.*14.*today/i })).toBeInTheDocument();
  });

  it("moves a week back and forward, and back to this week", async () => {
    render(<ArtistUtilization load={load} />);
    await screen.findByRole("row", { name: /Maxine/ });
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith("2026-10-05"));
    expect(await screen.findByRole("button", { name: "This week" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith("2026-10-12"));
  });

  it("explains the colours in a legend", async () => {
    render(<ArtistUtilization load={load} />);
    const legend = within(await screen.findByRole("list", { name: "Legend" }));
    expect(legend.getByText("Booked")).toBeInTheDocument();
    expect(legend.getByText("Open")).toBeInTheDocument();
    expect(legend.getByText("Day off")).toBeInTheDocument();
  });

  it("says so when there are no artists with slots, and when it can't load", async () => {
    load.mockResolvedValueOnce({ week: { from: "2026-10-12", to: "2026-10-18" }, overall: null, artists: [] });
    const { unmount } = render(<ArtistUtilization load={load} />);
    expect(await screen.findByText("No artists yet. Add them in Nail Artists, with their time slots.")).toBeInTheDocument();
    unmount();

    load.mockRejectedValueOnce(new Error("boom"));
    render(<ArtistUtilization load={load} />);
    expect(await screen.findByText("We couldn't load artist utilization.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
