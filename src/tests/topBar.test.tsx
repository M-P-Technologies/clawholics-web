import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopBar } from "@/components/organisms";

const account = { name: "Ana Cruz", email: "ana@example.com", imageUrl: "" };

describe("TopBar", () => {
  it("has the title, the greeting on computers, the site link, the date and the account", () => {
    render(<TopBar title="Schedule" greeting="Welcome, Ana!" today="Wednesday, Oct 14" account={account} actions={<button>Today</button>} />);
    const bar = screen.getByRole("banner");
    expect(within(bar).getByRole("heading", { level: 1, name: "Schedule" })).toBeInTheDocument();
    expect(screen.getByText("Welcome, Ana!").className).toContain("lg:block");
    expect(screen.getByRole("link", { name: /View site/ })).toHaveAttribute("target", "_blank");
    expect(screen.getByText("Wednesday, Oct 14")).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Ana Cruz" })).toHaveLength(2);
    expect(within(bar).getByRole("button", { name: "Today" })).toBeInTheDocument();
  });
  it("leaves out what it isn't given", () => {
    render(<TopBar title="Home" account={account} />);
    expect(screen.queryByText(/Welcome/)).toBeNull();
    expect(screen.queryByText(/Oct/)).toBeNull();
  });
});
