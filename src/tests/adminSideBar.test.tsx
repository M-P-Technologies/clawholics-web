import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SideBar from "@/components/admin/SideBar";

vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ signOut: vi.fn(), openUserProfile: vi.fn() }) }));

describe("admin sidebar", () => {
  it("shows the Clawholics logo image in place of a typed name", () => {
    render(<SideBar />);
    const logo = screen.getByRole("img", { name: "Clawholics by Max" });
    expect(logo.tagName).toBe("IMG");
    expect(screen.queryByText("by Max")).toBeNull();
  });

  it("keeps the logo's full height in the scrolling sidebar instead of squeezing it away", () => {
    // The sidebar is a height-limited flex column; an overflow-hidden child can shrink to nothing
    // there (the cropped logo box did), so it must opt out. jsdom has no layout: the class is what we can check.
    render(<SideBar />);
    const box = screen.getByRole("img", { name: "Clawholics by Max" }).parentElement as HTMLElement;
    expect(box.className).toContain("shrink-0");
  });

  it("marks the current screen in the navigation", () => {
    render(<SideBar />);
    const nav = within(screen.getByRole("navigation", { name: "Admin navigation" }));
    expect(nav.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("button", { name: "Schedule" })).not.toHaveAttribute("aria-current");
  });
});
