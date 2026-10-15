import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateAppointment } from "@/hooks/admin/useCreateAppointment";

vi.mock("@/services/bookingService", () => ({
  createAdminAppointment: vi.fn(),
  fetchBookedSlotsDetailed: vi.fn().mockResolvedValue([]),
  fetchNailists: vi.fn().mockResolvedValue([
    { id: 1, name: "Mara", category_id: 1 },
    { id: 2, name: "Jun", category_id: 2 },
  ]),
}));
vi.mock("@/services/nailistService", () => ({
  fetchNailistDayOffs: vi.fn().mockResolvedValue({ regularDays: [], customDates: [] }),
  fetchNailistTimeSlots: vi.fn().mockResolvedValue(["09:00-10:00", "10:00-11:00"]),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 14, 10, 0, 0) });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ id: 10, name: "Gel Polish", master_price: 800, junior_price: 500, duration: "60", nailist_ids: "1,2" }],
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useCreateAppointment", () => {
  it("choosing another artist clears the service, the date and the time", async () => {
    const { result } = renderHook(() => useCreateAppointment({ onCreated: vi.fn() }));
    await waitFor(() => expect(result.current.loadingNailists || result.current.loadingServices).toBe(false));

    act(() => result.current.chooseArtist("1"));
    act(() => result.current.setServiceId("10"));
    await waitFor(() => expect(result.current.timeSlots).toHaveLength(2));
    await act(() => result.current.handleDateSelect(new Date(2026, 9, 15)));
    await waitFor(() => expect(result.current.appointmentDate).toBe("2026-10-15"));
    act(() => result.current.setAppointmentTime("10:00-11:00"));
    expect(result.current.appointmentTime).toBe("10:00-11:00");
    expect(result.current.serviceId).toBe("10");

    act(() => result.current.chooseArtist("2"));
    await waitFor(() => expect(result.current.selectedNailist?.name).toBe("Jun"));
    expect(result.current.serviceId).toBe("");
    expect(result.current.appointmentDate).toBe("");
    expect(result.current.appointmentTime).toBe("");
  });
});
