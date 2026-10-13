import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminTabBar from "@/components/admin/AdminTabBar";

let pathname = "/clients";
const openUserProfile = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname }),
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ openUserProfile, signOut }),
}));

beforeEach(() => {
  pathname = "/clients";
  vi.clearAllMocks();
});

describe("admin tab bar", () => {
  it("has the four daily tabs and More", () => {
    render(<AdminTabBar />);
    const bar = screen.getByRole("navigation", { name: "Admin tabs" });
    const links = [...bar.querySelectorAll("a")].map((a) => [a.textContent?.trim(), a.getAttribute("href")]);
    expect(links).toEqual([
      ["Bookings", "/clients"],
      ["Schedule", "/schedule"],
      ["Scanner", "/admin-scanner"],
      ["Dashboard", "/dashboard"],
    ]);
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "false");
  });

  it("marks the current tab", () => {
    pathname = "/schedule";
    render(<AdminTabBar />);
    expect(screen.getByRole("link", { name: "Schedule" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Bookings" })).not.toHaveAttribute("aria-current");
  });

  it("More lists the content screens, the admin directory and the account actions", () => {
    render(<AdminTabBar />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const hrefs = (name: string) => screen.getByRole("link", { name }).getAttribute("href");
    expect(hrefs("Sales")).toBe("/sales");
    expect(hrefs("Performance")).toBe("/performance");
    expect(hrefs("Homepage")).toBe("/homepage");
    expect(hrefs("Services")).toBe("/nail-services");
    expect(hrefs("Artists")).toBe("/nail-artists");
    expect(hrefs("About Us")).toBe("/about-us");
    expect(hrefs("Contact Us")).toBe("/contact-info");
    expect(hrefs("FAQs")).toBe("/faqs");
    expect(hrefs("Terms & Conditions")).toBe("/terms-and-conditions");
    expect(hrefs("Privacy Policy")).toBe("/privacy-policy");
    expect(hrefs("Admin Directory")).toBe("/admin-directory");
    expect(screen.getByRole("button", { name: "Manage account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "true");
  });

  it("More is the active tab on a content screen", () => {
    pathname = "/faqs";
    render(<AdminTabBar />);
    const more = screen.getByRole("button", { name: "More" });
    expect(more.className).toContain("text-berry");
    expect(screen.getByRole("link", { name: "Bookings" })).not.toHaveAttribute("aria-current");
  });

  it("closes the sheet on Escape and runs the account actions", () => {
    render(<AdminTabBar />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Homepage" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "Manage account" }));
    expect(openUserProfile).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: "Homepage" })).toBeNull();
  });

  it("closes the sheet when the screen changes", () => {
    const { rerender } = render(<AdminTabBar />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: "Homepage" })).toBeInTheDocument();
    pathname = "/homepage";
    rerender(<AdminTabBar />);
    expect(screen.queryByRole("link", { name: "Homepage" })).toBeNull();
  });

  it("only points aria-controls at the sheet while it exists", () => {
    render(<AdminTabBar />);
    const more = screen.getByRole("button", { name: "More" });
    expect(more).not.toHaveAttribute("aria-controls");
    fireEvent.click(more);
    expect(more).toHaveAttribute("aria-controls", "admin-more-menu");
    expect(document.getElementById("admin-more-menu")).not.toBeNull();
  });

  it("a failed log out is logged, not thrown", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    signOut.mockRejectedValueOnce(new Error("offline"));
    render(<AdminTabBar />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(error).toHaveBeenCalled());
    error.mockRestore();
  });

  it("has the dashboard as a tab, and Sales first in More", () => {
    pathname = "/dashboard";
    render(<AdminTabBar />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const links = screen.getAllByRole("link").filter((a) => a.closest("#admin-more-menu"));
    expect(links[0]).toHaveTextContent("Sales");
  });

});
