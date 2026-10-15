// The public site's browser cache (lib/tanstack-query/publicQueries) with the app's own query client: screens
// that show the same content share one request, coming back within STALE_MS asks nothing, and
// after that the cached copy shows at once while it's fetched again.
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useServices } from "../features/catalog/hooks/useServices";
import { makeQueryClient, STALE_MS } from "../lib/tanstack-query/publicQueries";
import { fetchServices } from "../features/catalog/api/serviceService";
import { fetchHomeContent } from "../features/content/api/contentService";
import { fetchCategories } from "../features/catalog/api/catalogService";

vi.mock("../features/catalog/api/serviceService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../features/catalog/api/serviceService")>()),
  fetchServices: vi.fn(),
}));
vi.mock("../features/content/api/contentService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../features/content/api/contentService")>()),
  fetchHomeContent: vi.fn(),
}));
vi.mock("../features/catalog/api/catalogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../features/catalog/api/catalogService")>()),
  fetchCategories: vi.fn(),
}));

function ServiceCount({ label }: { label: string }) {
  const { filtered } = useServices();
  return <p>{`${label}: ${filtered.length}`}</p>;
}

describe("public content cache", () => {
  const client = makeQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  beforeEach(() => {
    client.clear();
    vi.mocked(fetchServices).mockResolvedValue([{ id: 1, name: "Gel" }] as Awaited<ReturnType<typeof fetchServices>>);
    vi.mocked(fetchHomeContent).mockResolvedValue({} as Awaited<ReturnType<typeof fetchHomeContent>>);
    vi.mocked(fetchCategories).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(fetchServices).mockReset();
  });

  it("shares one request between screens, and asks nothing when one comes back within STALE_MS", async () => {
    const first = render(<><ServiceCount label="Home" /><ServiceCount label="Services" /></>, { wrapper });
    expect(await screen.findByText("Home: 1")).toBeInTheDocument();
    expect(screen.getByText("Services: 1")).toBeInTheDocument();
    expect(fetchServices).toHaveBeenCalledTimes(1);
    first.unmount();

    // Back on the page a moment later: the cached copy at once, no request
    render(<ServiceCount label="Again" />, { wrapper });
    expect(screen.getByText("Again: 1")).toBeInTheDocument();
    expect(fetchServices).toHaveBeenCalledTimes(1);
  });

  it("shows the cached copy at once after STALE_MS, and fetches it again behind it", async () => {
    const first = render(<ServiceCount label="Home" />, { wrapper });
    expect(await screen.findByText("Home: 1")).toBeInTheDocument();
    first.unmount();

    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + STALE_MS + 1_000);
    vi.mocked(fetchServices).mockResolvedValue([{ id: 1 }, { id: 2 }] as Awaited<ReturnType<typeof fetchServices>>);
    render(<ServiceCount label="Later" />, { wrapper });
    expect(screen.getByText("Later: 1")).toBeInTheDocument();
    expect(await screen.findByText("Later: 2")).toBeInTheDocument();
    await waitFor(() => expect(fetchServices).toHaveBeenCalledTimes(2));
  });
});
