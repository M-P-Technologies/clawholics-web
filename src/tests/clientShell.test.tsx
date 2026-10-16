import { fireEvent, render, screen, within } from "@testing-library/react";
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
const signOut = vi.fn();
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ signOut }) }));

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
    expect(within(tabs).getAllByRole("link").map((l) => l.textContent)).toEqual(["Home", "Bookings", "Explore", "Profile"]);
    expect(within(tabs).getByRole("link", { name: "Explore" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("has a desktop sidebar with the same tabs and a way back to the site", () => {
    render(<ClientShell><p>x</p></ClientShell>);
    const side = screen.getByRole("navigation", { name: "App menu" });
    // Shown from sm up (phones get the tab bar instead)
    expect(side.closest("aside")!.parentElement!.className).toContain("sm:block");
    expect(within(side).getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Back to site/ })).toHaveAttribute("href", "/");
  });

  it("ends the sidebar with the library buttons: Back to site secondary, Log out primary", () => {
    render(<ClientShell><p>x</p></ClientShell>);
    const back = screen.getByRole("link", { name: /Back to site/ });
    expect(back).toHaveClass("border-crimson"); // secondary
    const logOut = screen.getByRole("button", { name: "Log out" });
    expect(logOut).toHaveClass("bg-crimson"); // primary
    fireEvent.click(logOut);
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });

  it("hides the tab bar on the booking steps", () => {
    for (const path of ["/my/book", "/my/payment"]) {
      pathname = path;
      const { unmount } = render(<ClientShell><p>x</p></ClientShell>);
      expect(screen.queryByRole("navigation", { name: "App tabs" })).not.toBeInTheDocument();
      unmount();
    }
  });
});
