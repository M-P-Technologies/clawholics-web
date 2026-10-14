import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalendarCheck } from "lucide-react";
import { StatCard } from "@/components/molecules";

describe("StatCard", () => {
  it("is the dashboard's headline card by default", () => {
    render(<StatCard label="Bookings" value="12" change={{ kind: "up", label: "+20%" }} />);
    const card = screen.getByRole("group", { name: "Bookings" });
    expect(card.className).toContain("shadow-petal");
    expect(within(card).getByText("+20%")).toBeInTheDocument();
  });
  it("has the small tinted size the client profile used", () => {
    render(<StatCard size="compact" icon={CalendarCheck} label="Visits" value="4" hint="completed" />);
    const card = screen.getByRole("group", { name: "Visits" });
    expect(card.className).toContain("bg-crimson-light/15");
    expect(within(card).getByText("completed")).toBeInTheDocument();
  });
});
