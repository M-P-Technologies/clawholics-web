import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBooking } from "@/hooks/client/useBooking";
import { bookingStateFor } from "@/utils/booking";

const location: { state: unknown } = { state: null };
const fetchBookedSlotsRange = vi.fn();
const fetchBookedSlotsDetailed = vi.fn();

vi.mock("@/lib/router", () => ({ useNavigate: () => vi.fn(), useLocation: () => location }));
vi.mock("@clerk/nextjs", () => {
  const user = { id: "user_1" };
  const getToken = async () => "tok";
  return { useUser: () => ({ user, isSignedIn: true }), useAuth: () => ({ getToken }) };
});
vi.mock("@/services/bookingService", () => ({
  fetchNailists: async () => [{ id: 3, name: "Bea", category_id: 1 }],
  fetchBookedSlotsDetailed: (...args: unknown[]) => fetchBookedSlotsDetailed(...args),
  fetchBookedSlotsRange: (...args: unknown[]) => fetchBookedSlotsRange(...args),
  createBooking: vi.fn(),
}));
vi.mock("@/services/nailistService", () => ({
  fetchNailistDayOffs: async () => ({ regularDays: [], customDates: [] }),
  fetchNailistTimeSlots: async () => ["10:00-11:00", "11:00-12:00"],
}));
vi.mock("@/services/contentService", () => ({ fetchHomeContent: async () => ({}) }));
vi.mock("@/services/aboutService", () => ({ fetchAboutContent: async () => ({}) }));
vi.mock("@/services/userService", () => ({ fetchProfileIfExists: async () => null }));
vi.mock("@/services/catalogService", () => ({ fetchCategories: async () => [] }));

const service = {
  id: 4,
  name: "Gel Manicure",
  junior_price: 400,
  master_price: 500,
  description: "d",
  category: "Nails",
  category_id: 1,
  pricing_type: "tiered" as const,
  price: 0,
  variants: [],
  image: "",
};

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

beforeEach(() => {
  vi.clearAllMocks();
  fetchBookedSlotsDetailed.mockResolvedValue([]);
  location.state = bookingStateFor(service, 3);
});

describe("booking calendar", () => {
  it("finds the next month's fully booked days with one request", async () => {
    fetchBookedSlotsRange.mockResolvedValue([
      // Both times taken: full
      { appointment_date: "2099-02-01", appointment_time: "10:00-11:00" },
      { appointment_date: "2099-02-01", appointment_time: "11:00-12:00" },
      // One left: still open
      { appointment_date: "2099-02-02", appointment_time: "10:00-11:00" },
    ]);
    const { result } = renderHook(() => useBooking());

    await waitFor(() => expect(result.current.fullyBookedDates).toEqual(["2099-02-01"]));
    expect(fetchBookedSlotsRange).toHaveBeenCalledTimes(1);
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    expect(fetchBookedSlotsRange).toHaveBeenCalledWith(3, ymd(new Date()), ymd(end));
    // The per-day request is only for the day the client picks
    expect(fetchBookedSlotsDetailed).not.toHaveBeenCalled();
  });

  it("marks no day as full when the booked times can't load", async () => {
    fetchBookedSlotsRange.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useBooking());
    await waitFor(() => expect(fetchBookedSlotsRange).toHaveBeenCalled());
    expect(result.current.fullyBookedDates).toEqual([]);
  });
});
