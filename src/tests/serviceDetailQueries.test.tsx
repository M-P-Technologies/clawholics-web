import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppointment } from "@/features/booking/hooks/useAppointment";

const fetchServices = vi.fn();
const fetchServiceById = vi.fn();
const fetchServiceGallery = vi.fn();
vi.mock("@/features/catalog/api/serviceService", () => ({
  fetchServices: () => fetchServices(),
  fetchServiceById: (id: number) => fetchServiceById(id),
  fetchServiceGallery: (id: number) => fetchServiceGallery(id),
}));
const fetchTacs = vi.fn();
vi.mock("@/features/content/api/tacService", () => ({ fetchTacs: () => fetchTacs() }));

const navigate = vi.fn();
let params: Record<string, string | undefined> = {};
vi.mock("@/lib/router", () => ({ useParams: () => params, useNavigate: () => navigate }));
vi.mock("@/features/booking/hooks/useStartBooking", () => ({ useStartBooking: () => vi.fn() }));

const gel = { id: 4, name: "Hard Gel", pricing_type: "flat", price: 500, master_price: 0, junior_price: 0, variants: [] };

beforeEach(() => {
  vi.clearAllMocks();
  params = {};
  fetchServices.mockResolvedValue([gel]);
  fetchServiceById.mockResolvedValue(gel);
  fetchServiceGallery.mockResolvedValue([{ id: 1, service_id: 4, image_url: "a.jpg", position: 0 }]);
  fetchTacs.mockResolvedValue([
    { id: 2, section: "B", content: "", display_order: 2 },
    { id: 1, section: "A", content: "", display_order: 1 },
  ]);
});

describe("useAppointment (a service's page)", () => {
  it("loads the service named in the address, its photos and the terms in order", async () => {
    params = { id: "hard-gel" };
    const { result } = renderHook(() => useAppointment());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.service?.name).toBe("Hard Gel");
    expect(result.current.gallery).toHaveLength(1);
    expect(result.current.terms.map((t) => t.section)).toEqual(["A", "B"]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("swaps an id in the address for the service's name", async () => {
    params = { id: "4" };
    renderHook(() => useAppointment());
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/services/hard-gel", { replace: true }));
  });

  it("says not found for a name no service has, or a service the server doesn't have", async () => {
    params = { id: "nothing" };
    const byName = renderHook(() => useAppointment());
    await waitFor(() => expect(byName.result.current.notFound).toBe(true));
    expect(fetchServiceById).not.toHaveBeenCalled();

    params = { id: "99" };
    fetchServiceById.mockRejectedValue(new Error("Service not found"));
    const byId = renderHook(() => useAppointment());
    await waitFor(() => expect(byId.result.current.notFound).toBe(true));
    expect(byId.result.current.loading).toBe(false);
  });

  it("still shows the service when the photos or the terms can't load", async () => {
    params = { id: "hard-gel" };
    fetchServiceGallery.mockRejectedValue(new Error("down"));
    fetchTacs.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useAppointment());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.service?.name).toBe("Hard Gel");
    expect(result.current.gallery).toEqual([]);
    expect(result.current.terms).toEqual([]);
  });
});
