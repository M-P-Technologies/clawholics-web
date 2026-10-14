import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useArtistEditor } from "@/hooks/admin/useArtistEditor";
import { useDayOffs } from "@/hooks/admin/useDayOffs";
import { useTimeSlots } from "@/hooks/admin/useTimeSlots";

const show = vi.fn();
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
vi.mock("@/services/nailistService", () => ({
  fetchNailistDayOffs: vi.fn().mockResolvedValue({ regularDays: [], customDates: [] }),
  fetchNailistTimeSlots: vi.fn().mockResolvedValue([]),
  fetchNailistServices: vi.fn().mockResolvedValue([1]),
  createNailist: vi.fn(), deleteNailist: vi.fn(), updateNailist: vi.fn(),
  updateNailistDayOffs: vi.fn(), updateNailistServices: vi.fn(), updateNailistTimeSlots: vi.fn(),
}));
vi.mock("@/services/serviceService", () => ({ fetchServices: vi.fn().mockResolvedValue([{ id: 1, name: "Gel" }, { id: 2, name: "Art" }]) }));
vi.mock("@/services/appointmentService", () => ({ fetchAppointments: vi.fn().mockResolvedValue([]) }));
vi.mock("@/services/uploadService", () => ({ uploadImage: vi.fn() }));

beforeEach(() => show.mockClear());

describe("useTimeSlots", () => {
  it("adds a slot from the two new times, then removes it", async () => {
    const { result } = renderHook(() => {
      const [timeSlots, setTimeSlots] = useState<string[]>([]);
      return { timeSlots, ...useTimeSlots({ nailistId: 7, disabled: false, timeSlots, setTimeSlots, onTimeSlotsLoaded: setTimeSlots }) };
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => { result.current.setNewStartTime("13:00"); result.current.setNewEndTime("15:00"); });
    act(() => result.current.handleAddTimeSlot());
    expect(result.current.timeSlots).toEqual(["13:00-15:00"]);
    expect(result.current.newStartTime).toBe("");
    act(() => result.current.deleteTimeSlot(0));
    expect(result.current.timeSlots).toEqual([]);
  });
});

describe("useDayOffs", () => {
  it("toggles a regular day and a one-off date, and does nothing while disabled", async () => {
    const { result, rerender } = renderHook(({ disabled }) => {
      const [regularDays, setRegularDays] = useState<number[]>([]);
      const [customDates, setCustomDates] = useState<string[]>([]);
      return { regularDays, customDates, ...useDayOffs({ nailistId: 7, disabled, regularDays, customDates, setRegularDays, setCustomDates, onDayOffsLoaded: () => {} }) };
    }, { initialProps: { disabled: false } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.toggleRegularDay(5));
    act(() => result.current.toggleCustomDate(new Date(2026, 9, 28)));
    expect(result.current.regularDays).toEqual([5]);
    expect(result.current.customDates).toEqual(["2026-10-28"]);
    expect(result.current.isDayOff(new Date(2026, 9, 28))).toBe(true);
    rerender({ disabled: true });
    act(() => result.current.toggleRegularDay(5));
    expect(result.current.regularDays).toEqual([5]);
  });
});

describe("useArtistEditor", () => {
  it("toggles a service while editing and puts it back on Cancel", async () => {
    const nailist = { id: 7, name: "Mara", position: "Master Technician", specialty: "Chrome", bio: "Bio", image: "x.webp", service_ids: [1] };
    const { result } = renderHook(() => useArtistEditor({ nailist }));
    await waitFor(() => expect(result.current.availableServices).toHaveLength(2));
    act(() => result.current.toggleService(2));
    expect(result.current.selectedServiceIds).toEqual([1]);
    act(() => result.current.setIsEditing(true));
    act(() => result.current.toggleService(2));
    expect(result.current.selectedServiceIds).toEqual([1, 2]);
    act(() => result.current.handleCancel());
    expect(result.current.selectedServiceIds).toEqual([1]);
    expect(result.current.isEditing).toBe(false);
  });
});
