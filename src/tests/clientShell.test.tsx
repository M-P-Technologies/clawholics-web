import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientShell from "@/components/features/client/shell/ClientShell";

let pathname = "/my";
const navigate = vi.fn();
vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname }),
  useNavigate: () => navigate,
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock("@/hooks/useSiteTheme", () => ({ useSiteTheme: () => {} }));
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ signOut: vi.fn() }) }));

beforeEach(() => {
  pathname = "/my";
  navigate.mockReset();
});

describe("ClientShell", () => {
  it("shows the four tabs on phones with the current one marked", () => {
    pathname = "/my/explore";
    render(<ClientShell><p>Content</p></ClientShell>);
    const tabs = screen.getByRole("navigation", { name: "App tabs" });
    expect(tabs.closest(".lg\\:hidden")).not.toBeNull();
    expect(within(tabs).getAllByRole("link").map((l) => l.textContent)).toEqual(["Home", "Appointments", "Explore", "Profile"]);
    expect(within(tabs).getByRole("link", { name: "Explore" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("has a desktop sidebar with the same tabs and a way back to the site", () => {
    render(<ClientShell><p>x</p></ClientShell>);
    const side = screen.getByRole("navigation", { name: "App menu" });
    expect(side.closest("aside")!.className).toContain("lg:flex");
    expect(within(side).getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Back to site/ })).toHaveAttribute("href", "/");
  });

  it("hides the tab bar on a service's page and the booking steps", () => {
    for (const path of ["/my/explore/3", "/my/book", "/my/payment"]) {
      pathname = path;
      const { unmount } = render(<ClientShell><p>x</p></ClientShell>);
      expect(screen.queryByRole("navigation", { name: "App tabs" })).not.toBeInTheDocument();
      unmount();
    }
  });
});
