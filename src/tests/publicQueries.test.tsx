import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useArtistDetail } from "@/features/catalog/hooks/useArtistDetail";
import { useFaqs } from "@/features/content/hooks/useFaqs";
import { usePhotoStrip } from "@/features/catalog/hooks/usePhotoStrip";

const fetchNailists = vi.fn();
const fetchNailistById = vi.fn();
const fetchNailistGallery = vi.fn();
vi.mock("@/features/catalog/api/nailistService", () => ({
  fetchNailists: () => fetchNailists(),
  fetchNailistById: (id: number) => fetchNailistById(id),
  fetchNailistGallery: (id: number) => fetchNailistGallery(id),
}));
const fetchServices = vi.fn();
vi.mock("@/features/catalog/api/serviceService", () => ({ fetchServices: () => fetchServices() }));
const fetchFaqs = vi.fn();
vi.mock("@/features/content/api/faqService", () => ({ fetchFaqs: () => fetchFaqs() }));
const fetchHomeContent = vi.fn();
vi.mock("@/features/content/api/contentService", () => ({ fetchHomeContent: () => fetchHomeContent() }));

const navigate = vi.fn();
let params: Record<string, string | undefined> = {};
vi.mock("@/lib/router", () => ({ useParams: () => params, useNavigate: () => navigate }));
vi.mock("@/features/booking/hooks/useStartBooking", () => ({ useStartBooking: () => vi.fn() }));

const max = { id: 3, name: "Miss Max", position: "", specialty: "", bio: "", image: "", service_ids: [7] };

beforeEach(() => {
  vi.clearAllMocks();
  params = {};
  fetchNailists.mockResolvedValue([max]);
  fetchNailistById.mockResolvedValue(max);
  fetchNailistGallery.mockResolvedValue([]);
  fetchServices.mockResolvedValue([{ id: 7, name: "Gel" }, { id: 8, name: "Lashes" }]);
  fetchFaqs.mockResolvedValue([]);
  fetchHomeContent.mockResolvedValue({});
});

describe("shared public content", () => {
  it("fetches content once for every part of the page that shows it", async () => {
    const { result } = renderHook(() => ({ faqs: useFaqs(), strip: usePhotoStrip([]) }));
    await waitFor(() => expect(result.current.faqs.loading).toBe(false));
    expect(fetchHomeContent).toHaveBeenCalledTimes(1);
  });
});

describe("useArtistDetail", () => {
  it("finds the artist named in the address, with the services they offer", async () => {
    params = { id: "miss-max" };
    const { result } = renderHook(() => useArtistDetail());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.nailist?.name).toBe("Miss Max");
    expect(result.current.offeredServices.map((s) => s.id)).toEqual([7]);
    expect(fetchNailistById).toHaveBeenCalledWith(3);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("swaps an id in the address for the artist's name", async () => {
    params = { id: "3" };
    renderHook(() => useArtistDetail());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/artists/miss-max", { replace: true }));
  });

  it("says not found for a name no artist has", async () => {
    params = { id: "nobody" };
    const { result } = renderHook(() => useArtistDetail());
    await waitFor(() => expect(result.current.notFound).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(fetchNailistById).not.toHaveBeenCalled();
  });

  it("says not found when the server has no artist with that id", async () => {
    params = { id: "99" };
    fetchNailistById.mockResolvedValue(null);
    const { result } = renderHook(() => useArtistDetail());
    await waitFor(() => expect(result.current.notFound).toBe(true));
  });

  it("shows an error, not 'not found', when the list can't load for a name", async () => {
    params = { id: "miss-max" };
    fetchNailists.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useArtistDetail());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.notFound).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("still follows an id in the address when the list can't load", async () => {
    params = { id: "3" };
    fetchNailists.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useArtistDetail());
    await waitFor(() => expect(result.current.nailist?.name).toBe("Miss Max"));
    expect(result.current.error).toBe(false);
  });
});
