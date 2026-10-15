import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarDays, House } from "lucide-react";
import { AppShell, SideBar, TabBar } from "@/components/organisms";

let pathname = "/a";
const navigate = vi.fn();
vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname }),
  useNavigate: () => navigate,
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const items = [{ path: "/a", label: "Alpha", icon: House }, { path: "/b", label: "Beta", icon: CalendarDays }];

beforeEach(() => {
  pathname = "/a";
  navigate.mockReset();
});

describe("SideBar", () => {
  it("lists the groups as buttons, marks the current one and collapses to a rail", () => {
    render(<SideBar label="Menu" storageKey="test-rail" groups={[{ title: "Group", items }]} footer={(collapsed) => <span>{collapsed ? "rail" : "full"} footer</span>} />);
    const nav = within(screen.getByRole("navigation", { name: "Menu" }));
    expect(nav.getByRole("heading", { name: "Group" })).toBeInTheDocument();
    expect(nav.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-current", "page");
    fireEvent.click(nav.getByRole("button", { name: "Beta" }));
    expect(navigate).toHaveBeenCalledWith("/b");
    fireEvent.click(screen.getByRole("button", { name: "Collapse the sidebar" }));
    expect(screen.getByText("rail footer")).toBeInTheDocument();
  });
});

describe("TabBar", () => {
  it("links the tabs and opens a More sheet", () => {
    render(<TabBar label="Tabs" items={items} more={{ id: "more-sheet", isActive: false, content: (close) => <button onClick={close}>Inside</button> }} />);
    const bar = within(screen.getByRole("navigation", { name: "Tabs" }));
    expect(bar.getByRole("link", { name: "Alpha" })).toHaveAttribute("aria-current", "page");
    expect(bar.getByRole("link", { name: "Beta" })).toHaveAttribute("href", "/b");
    const more = screen.getByRole("button", { name: "More" });
    fireEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Inside" }));
    expect(screen.queryByRole("button", { name: "Inside" })).toBeNull();
  });
  it("has no More button without more", () => {
    render(<TabBar label="Tabs" items={items} />);
    expect(screen.queryByRole("button", { name: "More" })).toBeNull();
  });
});

describe("AppShell", () => {
  it("frames the admin and the client app", () => {
    const { rerender } = render(<AppShell variant="admin" sideBar={<aside>side</aside>}><p>content</p></AppShell>);
    expect(screen.getByText("content")).toBeInTheDocument();
    rerender(<AppShell variant="client" sideBar={<aside>side</aside>} tabBar={<nav aria-label="t" />}><p>content</p></AppShell>);
    expect(screen.getByRole("main")).toHaveTextContent("content");
  });
});
