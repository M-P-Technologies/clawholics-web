import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBooking } from "@/hooks/client/useBooking";
import { bookingStateFor } from "@/utils/booking";
import { manilaToday } from "@/lib/bookingNotice";
import { addDays } from "@/lib/bookingWindow";

const location: { state: unknown } = { state: null };
const navigate = vi.fn();
const fetchAnyAvailability = vi.fn();
const fetchBookedSlotsRange = vi.fn();
const fetchBookedSlotsDetailed = vi.fn();
const createBooking = vi.fn();
const joinWaitlist = vi.fn();

vi.mock("@/lib/router", () => ({ useNavigate: () => navigate, useLocation: () => location }));
vi.mock("@clerk/nextjs", () => {
  const user = { id: "user_1" };
  const getToken = async () => "tok";
  return { useUser: () => ({ user, isSignedIn: true }), useAuth: () => ({ getToken }) };
});
vi.mock("@/services/bookingService", () => ({
  fetchNailists: async () => [{ id: 3, name: "Bea", category_id: 1 }, { id: 4, name: "Jun", category_id: 2 }],
  fetchAnyAvailability: (...args: unknown[]) => fetchAnyAvailability(...args),
  fetchBookedSlotsDetailed: (...args: unknown[]) => fetchBookedSlotsDetailed(...args),
  fetchBookedSlotsRange: (...args: unknown[]) => fetchBookedSlotsRange(...args),
  createBooking: (...args: unknown[]) => createBooking(...args),
}));
vi.mock("@/services/waitlistService", () => ({ joinWaitlist: (...args: unknown[]) => joinWaitlist(...args) }));
vi.mock("@/services/nailistService", () => ({
  fetchNailistDayOffs: async () => ({ regularDays: [], customDates: [] }),
  fetchNailistTimeSlots: async () => ["10:00-11:00", "11:00-12:00"],
}));
vi.mock("@/services/contentService", () => ({ fetchHomeContent: async () => ({}) }));
vi.mock("@/services/aboutService", () => ({ fetchAboutContent: async () => ({}) }));
vi.mock("@/services/userService", () => ({ fetchProfileIfExists: async () => ({ id: 9, onboarded: true, first_name: "Ana", phone: "09171234567", preferred_contact_method: "call" }) }));
vi.mock("@/services/catalogService", () => ({ fetchCategories: async () => [] }));

const service = {
  id: 4, name: "Gel Manicure", junior_price: 400, master_price: 500, description: "d", category: "Nails", category_id: 1,
  pricing_type: "tiered" as const, price: 0, variants: [], image: "",
};

// A day a few days ahead, as the Manila date the server uses, and the same day as a local Date for the calendar
const DAY = addDays(manilaToday(), 3);
const dayOf = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

beforeEach(() => {
  vi.clearAllMocks();
  location.state = bookingStateFor(service);
  fetchBookedSlotsRange.mockResolvedValue([]);
  fetchBookedSlotsDetailed.mockResolvedValue([]);
  fetchAnyAvailability.mockResolvedValue({ days: { [DAY]: ["10:00-11:00", "11:00-12:00"] }, full: [] });
});

const loaded = async () => {
  const hook = renderHook(() => useBooking());
  await waitFor(() => expect(hook.result.current.nailists).toHaveLength(2));
  return hook;
};

describe("booking with any available artist", () => {
  it("offers it when more than one artist does the service", async () => {
    const { result } = await loaded();
    expect(result.current.canChooseAnyArtist).toBe(true);
    expect(result.current.anyArtist).toBe(false);
  });

  it("opens only the days with a time free with at least one artist, and lists those times", async () => {
    const { result } = await loaded();
    act(() => result.current.handleArtistChange("any"));
    await waitFor(() => expect(result.current.loadingAnyDays).toBe(false));
    expect(result.current.anyArtist).toBe(true);
    expect(result.current.artistLabel).toBe("Any available artist");
    expect(fetchAnyAvailability).toHaveBeenCalledWith(4, manilaToday(), addDays(manilaToday(), 30));

    expect(result.current.isDisabledDate(dayOf(DAY))).toBe(false);
    expect(result.current.isDisabledDate(dayOf(addDays(DAY, 1)))).toBe(true);

    await act(async () => {
      await result.current.handleDateSelect(dayOf(DAY));
    });
    expect(result.current.selectedDate).toBe(DAY);
    expect(result.current.timeSlots).toEqual(["10:00-11:00", "11:00-12:00"]);
    expect(result.current.isSlotBlocked("10:00-11:00")).toBe(false);
    // The server knows each artist's day, so no per-artist request is made
    expect(fetchBookedSlotsDetailed).not.toHaveBeenCalled();
  });

  it("shows the price as a range, by the artist's level", async () => {
    const { result } = await loaded();
    act(() => result.current.handleArtistChange(3));
    expect(result.current.priceLabel).toBe("Starts at ₱500 (Master Rate) ★");
    act(() => result.current.handleArtistChange("any"));
    expect(result.current.priceLabel).toBe("Starts at ₱400 – ₱500, depending on the artist assigned");
  });

  it("books without naming an artist, and goes to payment with the one the salon assigned", async () => {
    const { result } = await loaded();
    act(() => result.current.handleArtistChange("any"));
    await waitFor(() => expect(result.current.loadingAnyDays).toBe(false));
    await act(async () => {
      await result.current.handleDateSelect(dayOf(DAY));
    });
    act(() => result.current.setSelectedTime("10:00-11:00"));
    createBooking.mockResolvedValue({ appointment_id: 55, status: "PENDING", expires_at: "2099-01-01T00:00:00Z", nailist_id: 4, nailist_name: "Jun", nailist_category_id: 2 });

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(createBooking).toHaveBeenCalledWith(
      expect.objectContaining({ any_artist: true, nailist_id: null, nailist_name: "", appointment_date: DAY, appointment_time: "10:00-11:00" }),
      "tok",
    );
    expect(navigate).toHaveBeenCalledWith("/my/payment", { state: expect.objectContaining({ appointment_id: 55, nailist_name: "Jun", nailist_category_id: 2 }) });
  });

  it("says so, keeps the choices and asks for the times again when the time goes to someone else", async () => {
    const { result } = await loaded();
    act(() => result.current.handleArtistChange("any"));
    await waitFor(() => expect(result.current.loadingAnyDays).toBe(false));
    await act(async () => {
      await result.current.handleDateSelect(dayOf(DAY));
    });
    act(() => result.current.setSelectedTime("10:00-11:00"));
    createBooking.mockRejectedValue(Object.assign(new Error("No artist is free at this time. Please choose another time."), { status: 409, code: "SLOT_TAKEN" }));
    fetchAnyAvailability.mockClear();
    fetchAnyAvailability.mockResolvedValue({ days: { [DAY]: ["11:00-12:00"] }, full: [] });

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(result.current.modalOpen).toBe(true);
    expect(result.current.modalTitle).toBe("Slot Unavailable");
    expect(result.current.modalMessage).toContain("No artist is free at this time");
    expect(result.current.selectedTime).toBe("");
    expect(result.current.selectedDate).toBe(DAY);
    await waitFor(() => expect(fetchAnyAvailability).toHaveBeenCalled());
  });

  it("books a chosen artist as before, without asking the salon to assign one", async () => {
    const { result } = await loaded();
    act(() => result.current.handleArtistChange(4));
    await waitFor(() => expect(result.current.selectedNailist?.id).toBe(4));
    // Their hours load once they're chosen
    await waitFor(() => expect(result.current.timeSlots.length).toBeGreaterThan(0));
    await act(async () => {
      await result.current.handleDateSelect(dayOf(DAY));
    });
    act(() => result.current.setSelectedTime("10:00-11:00"));
    createBooking.mockResolvedValue({ appointment_id: 56, status: "PENDING", expires_at: "2099-01-01T00:00:00Z" });

    await act(async () => {
      await result.current.handleContinue();
    });

    const payload = createBooking.mock.calls[0][0];
    expect(payload).toMatchObject({ nailist_id: 4, nailist_name: "Jun" });
    expect(payload).not.toHaveProperty("any_artist");
    expect(fetchAnyAvailability).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/my/payment", { state: expect.objectContaining({ nailist_name: "Jun" }) });
  });
});

describe("asking to be told when a fully booked day opens up", () => {
  it("offers it for a chosen artist's full day, and joins on Notify me", async () => {
    const { result } = await loaded();
    act(() => result.current.handleArtistChange(4));
    await waitFor(() => expect(result.current.timeSlots.length).toBeGreaterThan(0));
    fetchBookedSlotsDetailed.mockResolvedValue([{ appointment_time: "10:00-11:00" }, { appointment_time: "11:00-12:00" }]);
    // A full day isn't disabled: it can be picked
    expect(result.current.isDisabledDate(dayOf(DAY))).toBe(false);

    await act(async () => {
      await result.current.handleDateSelect(dayOf(DAY));
    });
    expect(result.current.modalOpen).toBe(true);
    expect(result.current.modalTitle).toBe("Fully booked");
    expect(result.current.modalMessage).toContain("Jun has no times left");
    expect(result.current.modalButtonText).toBe("Notify me");
    expect(result.current.selectedDate).toBe("");

    joinWaitlist.mockResolvedValue({ id: 1, already: false });
    await act(async () => {
      result.current.modalAction?.();
    });
    await waitFor(() => expect(result.current.modalTitle).toBe("You're on the list"));
    expect(joinWaitlist).toHaveBeenCalledWith({ service_id: 4, nailist_id: 4, date: DAY }, "tok");
  });

  it("offers it for a day that's full with every artist, asking for any artist", async () => {
    fetchAnyAvailability.mockResolvedValue({ days: {}, full: [DAY] });
    const { result } = await loaded();
    act(() => result.current.handleArtistChange("any"));
    await waitFor(() => expect(result.current.loadingAnyDays).toBe(false));
    expect(result.current.isDisabledDate(dayOf(DAY))).toBe(false);
    expect(result.current.isDateFullyBooked(dayOf(DAY))).toBe(true);
    // A day with nobody working stays closed to it
    expect(result.current.isDisabledDate(dayOf(addDays(DAY, 1)))).toBe(true);

    await act(async () => {
      await result.current.handleDateSelect(dayOf(DAY));
    });
    expect(result.current.modalTitle).toBe("Fully booked");
    expect(result.current.modalMessage).toContain("None of our artists has a time left");

    joinWaitlist.mockResolvedValue({ id: 2, already: true });
    await act(async () => {
      result.current.modalAction?.();
    });
    await waitFor(() => expect(result.current.modalTitle).toBe("You're already on the list"));
    expect(joinWaitlist).toHaveBeenCalledWith({ service_id: 4, nailist_id: null, date: DAY }, "tok");
  });

  it("says why it couldn't add them, and asks for the times again when the day has some after all", async () => {
    fetchAnyAvailability.mockResolvedValue({ days: {}, full: [DAY] });
    const { result } = await loaded();
    act(() => result.current.handleArtistChange("any"));
    await waitFor(() => expect(result.current.loadingAnyDays).toBe(false));
    await act(async () => {
      await result.current.handleDateSelect(dayOf(DAY));
    });
    joinWaitlist.mockRejectedValue(Object.assign(new Error("That day has times free: you can book one now."), { status: 409, code: "NOT_FULL" }));
    fetchAnyAvailability.mockClear();
    fetchAnyAvailability.mockResolvedValue({ days: { [DAY]: ["10:00-11:00"] }, full: [] });

    await act(async () => {
      result.current.modalAction?.();
    });
    await waitFor(() => expect(result.current.modalTitle).toBe("We couldn't add you"));
    expect(result.current.modalMessage).toContain("That day has times free");
    await waitFor(() => expect(fetchAnyAvailability).toHaveBeenCalled());
  });
});
