import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClientTopBar from "@/components/features/client/shell/ClientTopBar";

let account: Record<string, unknown>;
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => account }));

const signedIn = (over: Record<string, unknown> = {}) => ({
  dbUser: { first_name: "Ana", last_name: "Cruz", email: "ana@example.com" },
  clerkUser: { firstName: "Ana", imageUrl: "", hasImage: false },
  ...over,
});

describe("ClientTopBar", () => {
  it("has the screen's title, a welcome, the site link and who is signed in", () => {
    account = signedIn();
    render(<ClientTopBar title="My profile" />);
    const bar = screen.getByRole("banner");
    expect(bar).toContainElement(screen.getByRole("heading", { level: 1, name: "My profile" }));
    expect(screen.getByText("Welcome back, Ana!").className).toContain("lg:block");
    const site = screen.getByRole("link", { name: /View site/ });
    expect(site).toHaveAttribute("href", "/");
    expect(site).toHaveAttribute("target", "_blank");
    // Initials without a photo, on a phone (beside the title) and on a computer
    expect(screen.getAllByRole("img", { name: "Ana Cruz" })).toHaveLength(2);
    expect(screen.getAllByText("AC")).toHaveLength(2);
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
  });

  it("shows the client's photo when they have one", () => {
    account = signedIn({ clerkUser: { firstName: "Ana", imageUrl: "https://img/ana.png", hasImage: true } });
    const { container } = render(<ClientTopBar title="Home" />);
    expect(container.querySelector('img[src="https://img/ana.png"]')).not.toBeNull();
  });

  it("shows today's date once it is in the browser", () => {
    account = signedIn();
    render(<ClientTopBar title="Home" />);
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    expect(screen.getByText(today)).toBeInTheDocument();
  });

  it("puts the screen's own controls in the bar", () => {
    account = signedIn();
    render(<ClientTopBar title="Explore" actions={<button>Filter</button>} />);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("button", { name: "Filter" }));
  });
});
