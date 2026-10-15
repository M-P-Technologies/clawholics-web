import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Clock } from "lucide-react";
import SummaryRow from "@/features/booking/components/SummaryRow";

describe("SummaryRow", () => {
  it("shows an icon before the label when it is given, and hides it from screen readers", () => {
    const { container } = render(<dl><SummaryRow label="Time" icon={<Clock size={16} />} value="9:00 AM" /></dl>);
    const term = screen.getByText("Time").closest("dt") as HTMLElement;
    const icon = term.querySelector("span[aria-hidden=true] svg");
    expect(icon).not.toBeNull();
    expect(term.firstElementChild).toContainElement(icon as SVGElement); // the icon comes first
    expect(container).toHaveTextContent("9:00 AM");
  });

  it("looks as before without an icon", () => {
    render(<dl><SummaryRow label="Date" value="-" /></dl>);
    expect(screen.getByText("Date").closest("dt")!.querySelector("svg")).toBeNull();
  });
});
