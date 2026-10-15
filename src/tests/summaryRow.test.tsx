import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Clock } from "lucide-react";
import { SummaryRow } from "@/components/molecules";

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

  it("is a dotted-line row with a small label, and a value that wraps on a narrow phone", () => {
    render(<dl><SummaryRow label="Preferred artist" value="Maximiliana Concepcion-Dela Cruz" /></dl>);
    const dt = screen.getByText("Preferred artist").closest("dt")!;
    expect(dt).toHaveClass("text-[13px]");
    expect(dt.parentElement).toHaveClass("border-dotted", "first:border-t-0");
    const dd = screen.getByText("Maximiliana Concepcion-Dela Cruz").closest("dd")!;
    expect(dd).toHaveClass("min-w-0", "break-words", "font-bold");
  });

  it("shows a total bigger and in the brand colour", () => {
    render(<dl><SummaryRow label="Total" value="₱650" strong /></dl>);
    expect(screen.getByText("₱650").closest("dd")).toHaveClass("font-display", "text-xl", "text-berry");
  });
});
