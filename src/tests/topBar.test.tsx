import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopBar } from "@/components/organisms";

const account = { name: "Ana Cruz", email: "ana@example.com", imageUrl: "" };

describe("TopBar", () => {
  it("has the title, the greeting on computers, the site link and the account", () => {
    render(<TopBar title="Schedule" greeting="Welcome, Ana!" account={account} actions={<button>Today</button>} />);
    const bar = screen.getByRole("banner");
    expect(within(bar).getByRole("heading", { level: 1, name: "Schedule" })).toBeInTheDocument();
    expect(screen.getByText("Welcome, Ana!").className).toContain("lg:block");
    expect(screen.getByRole("link", { name: /View site/ })).toHaveAttribute("target", "_blank");
    expect(screen.getAllByRole("img", { name: "Ana Cruz" })).toHaveLength(2);
    expect(within(bar).getByRole("button", { name: "Today" })).toBeInTheDocument();
  });
  it("leaves out what it isn't given", () => {
    render(<TopBar title="Home" account={account} />);
    expect(screen.queryByText(/Welcome/)).toBeNull();
    expect(screen.queryByText(/Oct/)).toBeNull();
  });
});
