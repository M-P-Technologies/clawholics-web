import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminShell from "@/components/admin/AdminShell";

vi.mock("@/components/admin/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));

describe("AdminShell", () => {
  it("renders the sidebar, the title, both slots and the content", () => {
    render(
      <AdminShell title="Appointments" titleAside={<button>Create</button>} actions={<span>Sort</span>}>
        <p>Content</p>
      </AdminShell>,
    );
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Appointments" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByText("Sort")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("shows the welcome line on desktop only", () => {
    render(<AdminShell title="Schedule"><p>x</p></AdminShell>);
    expect(screen.getByText("Welcome, Admin!").className).toContain("hidden");
    expect(screen.getByText("Welcome, Admin!").className).toContain("lg:block");
  });

  it("has a top bar with a link to the public site and who is signed in", () => {
    render(<AdminShell title="Schedule"><p>x</p></AdminShell>);
    const bar = screen.getByRole("banner");
    expect(bar).toContainElement(screen.getByRole("heading", { name: "Schedule" }));
    const link = screen.getByRole("link", { name: /View site/ });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("img", { name: "Admin" }).length).toBeGreaterThan(0);
  });

  it("does not scroll by itself on desktop: only the screen's own content area does", () => {
    // overflow-x-hidden alone makes the frame scrollable vertically too, so with the decorative glows
    // hanging off its edge it grew a second scrollbar next to the content area's
    const { container } = render(<AdminShell title="Schedule"><p>x</p></AdminShell>);
    expect((container.firstChild as HTMLElement).className).toContain("lg:overflow-clip");
  });
});
