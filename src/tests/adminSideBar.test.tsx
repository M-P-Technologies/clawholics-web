import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SideBar from "@/components/features/admin/shell/SideBar";

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

  it("groups the screens: Overview, Front Desk (with the scanner) and Content Management", () => {
    render(<SideBar />);
    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    expect([...nav.querySelectorAll("h3")].map((h) => h.textContent)).toEqual(["Overview", "Front Desk", "Content Management"]);
    const frontDesk = within(nav.querySelectorAll("h3")[1].parentElement as HTMLElement);
    expect(frontDesk.getAllByRole("button").map((b) => b.textContent)).toEqual(["Clients & Bookings", "Schedule", "Admin Scanner", "Admin Directory"]);
  });

  it("scrolls only the menu, with its scrollbar on the left, and lets long names wrap", () => {
    render(<SideBar />);
    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    expect(nav.parentElement?.className).toContain("overflow-y-auto");
    expect(nav.parentElement?.className).toContain("[direction:rtl]");
    expect(nav.className).toContain("[direction:ltr]");
    expect(within(nav).getByRole("button", { name: "Clients & Bookings" }).className).toContain("whitespace-normal");
    // Log out stays below the scrolling menu
    expect(nav.parentElement?.contains(screen.getByRole("button", { name: "Log out" }))).toBe(false);
  });

  it("marks the current screen in the navigation", () => {
    render(<SideBar />);
    const nav = within(screen.getByRole("navigation", { name: "Admin navigation" }));
    expect(nav.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("button", { name: "Schedule" })).not.toHaveAttribute("aria-current");
  });

  it("collapses to an icon rail and back, and remembers it", () => {
    window.localStorage.clear();
    const { unmount } = render(<SideBar />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse the sidebar" }));
    const nav = within(screen.getByRole("navigation", { name: "Admin navigation" }));
    // Icons only, each still named for screen readers, and no group headings
    expect(nav.getByRole("button", { name: "Clients & Bookings" })).toHaveAttribute("title", "Clients & Bookings");
    expect(nav.queryByText("Front Desk")).toBeNull();
    expect(screen.getByRole("button", { name: "Log out" })).toHaveTextContent("");
    expect(window.localStorage.getItem("clawholics-admin-sidebar-collapsed")).toBe("1");
    unmount();

    render(<SideBar />);
    expect(screen.getByRole("button", { name: "Expand the sidebar" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Expand the sidebar" }));
    expect(screen.getByText("Front Desk")).toBeInTheDocument();
    expect(window.localStorage.getItem("clawholics-admin-sidebar-collapsed")).toBe("0");
  });
});
