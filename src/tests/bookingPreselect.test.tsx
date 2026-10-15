import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBooking } from "@/features/booking/hooks/useBooking";
import { bookingStateFor } from "@/features/booking/lib/booking";

const navigate = vi.fn();
const location: { state: unknown } = { state: null };
const fetchNailists = vi.fn();

vi.mock("@/lib/router", () => ({ useNavigate: () => navigate, useLocation: () => location }));
vi.mock("@clerk/nextjs", () => {
  const user = { id: "user_1" };
  const getToken = async () => "tok";
  return { useUser: () => ({ user, isSignedIn: true }), useAuth: () => ({ getToken }) };
});
vi.mock("@/features/booking/api/bookingService", () => ({
  fetchNailists: (...args: unknown[]) => fetchNailists(...args),
  fetchBookedSlotsDetailed: async () => [],
  createBooking: vi.fn(),
}));
vi.mock("@/features/catalog/api/nailistService", () => ({
  fetchNailistDayOffs: async () => ({ regularDays: [], customDates: [] }),
  fetchNailistTimeSlots: async () => [],
}));
vi.mock("@/features/content/api/contentService", () => ({ fetchHomeContent: async () => ({}) }));
vi.mock("@/features/profile/api/userService", () => ({ fetchProfileIfExists: async () => null }));
vi.mock("@/features/catalog/api/catalogService", () => ({ fetchCategories: async () => [] }));

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
  image: "https://img/gel.webp",
};
const artists = [
  { id: 2, name: "Ana", category_id: 2 },
  { id: 3, name: "Bea", category_id: 1 },
];

describe("bookingStateFor", () => {
  it("describes the service, and adds the artist only when there is one", () => {
    expect(bookingStateFor(service)).toMatchObject({ service_id: 4, service_name: "Gel Manicure", master_price: 500 });
    expect(bookingStateFor(service)).not.toHaveProperty("nailist_id");
    expect(bookingStateFor(service).service_image).toBe("https://img/gel.webp");
    expect(bookingStateFor(service, 3)).toMatchObject({ service_id: 4, nailist_id: 3 });
  });
});

describe("booking page with an artist chosen beforehand", () => {
  beforeEach(() => {
    fetchNailists.mockReset();
    fetchNailists.mockResolvedValue(artists);
  });

  it("starts with the artist from their page already selected", async () => {
    location.state = bookingStateFor(service, 3);
    const { result } = renderHook(() => useBooking());
    await waitFor(() => expect(result.current.selectedNailist?.id).toBe(3));
    expect(fetchNailists).toHaveBeenCalledWith(4);
  });

  it("leaves the choice open when the artist doesn't offer this service", async () => {
    location.state = bookingStateFor(service, 99);
    const { result } = renderHook(() => useBooking());
    await waitFor(() => expect(result.current.nailists).toHaveLength(2));
    expect(result.current.selectedNailist).toBeNull();
  });

  it("leaves the choice open when the visitor came from the service page", async () => {
    location.state = bookingStateFor(service);
    const { result } = renderHook(() => useBooking());
    await waitFor(() => expect(result.current.nailists).toHaveLength(2));
    expect(result.current.selectedNailist).toBeNull();
  });
});
