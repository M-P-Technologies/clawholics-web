import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "@/components/organisms";
import { Badge } from "@/components/atoms";
import { pickNext, relativeDay, sortSoonest, stampsToGo, startOf } from "@/utils/profileView";
import type { AppointmentView } from "@/components/profile/types";
import { useServicePhotos } from "@/hooks/useServicePhotos";

const fetchServices = vi.fn();
vi.mock("@/services/serviceService", () => ({ fetchServices: () => fetchServices() }));

const view = (over: Partial<AppointmentView> & { date?: string } = {}): AppointmentView => ({
  appt: { id: 1, service_name: "Hard Gel", nailist_id: 1, nailist_name: "Max", appointment_date: over.date ?? "2026-10-20", appointment_time: "09:00-11:00", status: "confirmed" },
  displayStatus: "confirmed", remainingTime: 0, isExpired: false, canReschedule: true, canCancel: true,
  statusLabel: "confirmed", dateLabel: "October 20, 2026", timeLabel: "9:00 AM - 11:00 AM",
  canPay: false, payLabel: "", isLocked: false, ...over,
});

describe("Sheet", () => {
  it("renders nothing when closed, and a labelled dialog when open", () => {
    const { rerender } = render(<Dialog open={false} title="Details" onClose={() => {}}>body</Dialog>);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<Dialog open title="Details" onClose={() => {}}>body</Dialog>);
    expect(screen.getByRole("dialog", { name: "Details" })).toHaveTextContent("body");
  });

  it("closes from the X, the backdrop and Escape, but not from a click inside", () => {
    const onClose = vi.fn();
    const { container } = render(<Dialog open title="T" onClose={onClose}>body</Dialog>);
    fireEvent.click(screen.getByText("body"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe("Badge", () => {
  it("shows the label with a coloured dot", () => {
    const { container } = render(<Badge dot="warning" caps>awaiting proof</Badge>);
    expect(screen.getByText("awaiting proof")).toBeInTheDocument();
    expect(container.querySelector(".bg-warning")).not.toBeNull();
  });
});

describe("profileView helpers", () => {
  it("counts stamps to go, never below zero", () => {
    expect(stampsToGo(0)).toBe(10);
    expect(stampsToGo(7)).toBe(3);
    expect(stampsToGo(12)).toBe(0);
  });

  it("reads appointment times as Philippine time", () => {
    expect(startOf("2026-10-20", "09:00-11:00")).toBe(Date.parse("2026-10-20T09:00:00+08:00"));
  });

  it("sorts soonest first and picks the next live appointment", () => {
    const later = view({ date: "2026-11-02" });
    const sooner = view({ date: "2026-10-20" });
    const expired = view({ date: "2026-10-10", isExpired: true });
    expect(sortSoonest([later, sooner]).map((v) => v.appt.appointment_date)).toEqual(["2026-10-20", "2026-11-02"]);
    expect(pickNext([later, expired, sooner])).toBe(sooner);
    expect(pickNext([])).toBeNull();
    expect(pickNext([expired])).toBeNull();
  });

  it("says how far away an appointment is", () => {
    const now = Date.parse("2026-10-17T09:00:00+08:00");
    expect(relativeDay("2026-10-20", "09:00-11:00", now)).toBe("in 3 days");
    expect(relativeDay("2026-10-18", "09:00-11:00", now)).toBe("in 1 day");
    expect(relativeDay("2026-10-17", "15:00-17:00", now)).toBe("in 6 hr");
    expect(relativeDay("2026-10-17", "09:30-11:00", now)).toBe("Starting soon");
    expect(relativeDay("2026-10-16", "09:00-11:00", now)).toBe("");
  });
});

describe("useServicePhotos", () => {
  it("finds a service's photo by name, ignoring case, and gives '' for unknown or photo-less services", async () => {
    fetchServices.mockResolvedValue([{ name: "Hard Gel", image: "https://img/hard.webp" }, { name: "No Photo", image: "" }]);
    const { result } = renderHook(() => useServicePhotos());
    await waitFor(() => expect(result.current("hard gel")).toBe("https://img/hard.webp"));
    expect(result.current("No Photo")).toBe("");
    expect(result.current("Unknown")).toBe("");
  });

  it("gives '' for everything when the list can't be loaded", async () => {
    fetchServices.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useServicePhotos());
    await waitFor(() => expect(fetchServices).toHaveBeenCalled());
    expect(result.current("Hard Gel")).toBe("");
  });
});
