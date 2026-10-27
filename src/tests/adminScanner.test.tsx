import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminScanner from "@/app/(admin)/admin-scanner/page";

vi.mock("@/components/features/admin/shell/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
// A stable getToken, as the real Clerk hook has (the global mock makes a new one every render)
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok" };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});
vi.mock("@yudiel/react-qr-scanner", () => ({
  Scanner: ({ onScan }: { onScan: (r: { rawValue: string }[]) => void }) => (
    <button onClick={() => onScan([{ rawValue: JSON.stringify({ userId: "u1" }) }])}>fake scan</button>
  ),
}));

const scrollIntoView = vi.fn();
// Twelve earlier scans, five to a page
const SCANS = Array.from({ length: 12 }, (_, i) => ({ id: String(100 - i), userId: `c${i}`, clientName: `Client ${i + 1}`, action: "stamp", time: "3:45 PM" }));
const historyPage = (url: string) => {
  const page = Number(new URL(url, "http://x").searchParams.get("page") ?? 1);
  return { rows: SCANS.slice((page - 1) * 5, page * 5), total: SCANS.length, page, pageSize: 5 };
};

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        String(url).includes("/users/scan/u1") ? { id: "u1", name: "Ana Cruz", stamps: 2 } : String(url).includes("/users/scan-history") ? historyPage(String(url)) : {},
    })),
  );
});

afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia;
});

const scanOnce = async () => {
  render(<AdminScanner />);
  fireEvent.click(await screen.findByRole("button", { name: "Start scanner" }));
  fireEvent.click(screen.getByRole("button", { name: "fake scan" }));
  await screen.findByText("Ana Cruz");
};

describe("AdminScanner", () => {
  it("shows the camera card, the result and the history", async () => {
    render(<AdminScanner />);
    expect(await screen.findByRole("heading", { name: "Scanner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start scanner" })).toBeInTheDocument();
    expect(screen.getByText(/Waiting for a scan/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent scans" })).toBeInTheDocument();
  });

  it("lists the recent scans five to a page, with a pager", async () => {
    render(<AdminScanner />);
    expect(await screen.findByText("Client 1")).toBeInTheDocument();
    expect(screen.queryByText("Client 6")).toBeNull();
    expect(screen.getByText("Showing 1–5 of 12")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(await screen.findByText("Client 11")).toBeInTheDocument();
    expect(screen.getByText("Showing 11–12 of 12")).toBeInTheDocument();
  });

  it("orders the cards camera, result, history on a phone", async () => {
    render(<AdminScanner />);
    const camera = (await screen.findByRole("heading", { name: "Scanner" })).closest("div[class*='max-lg:order']")!;
    const result = screen.getByRole("heading", { name: "Scan result" }).closest("div[class*='max-lg:order']")!;
    const history = screen.getByRole("heading", { name: "Recent scans" }).closest("div[class*='max-lg:order']")!;
    expect(camera.className).toContain("max-lg:order-1");
    expect(result.className).toContain("max-lg:order-2");
    expect(history.className).toContain("max-lg:order-3");
  });

  it("brings the result into view after a scan on a phone", async () => {
    await scanOnce();
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
  });

  it("does not scroll the panel after a scan on a desktop", async () => {
    window.matchMedia = ((query: string) => ({ matches: query === "(min-width: 64rem)" })) as unknown as typeof window.matchMedia;
    await scanOnce();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("shows the client's stamps as a loyalty card, and the recent scans as tagged rows", async () => {
    await scanOnce();
    expect(screen.getByRole("list", { name: "2 of 10 stamps" }).children).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Redeem reward" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Award stamp" }));
    // The scan joins the first page of the recent scans (five rows, each tagged)
    expect(await screen.findAllByText("Stamp")).toHaveLength(5);
    expect(screen.getByRole("list", { name: "3 of 10 stamps" })).toBeInTheDocument();
  });
});
