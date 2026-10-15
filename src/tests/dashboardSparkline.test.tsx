import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Sparkline from "@/features/dashboard/components/Sparkline";

const labels = (values: number[]) => values.map((v, i) => `Day ${i + 1}: ${v}`);

describe("Sparkline", () => {
  it("draws a line with a dot on the latest point, and says in words what it shows", () => {
    const values = [2, 5, 3, 10];
    const { container } = render(<Sparkline values={values} labels={labels(values)} ariaLabel="Collected per day, from ₱2 to ₱10" />);
    expect(screen.getByRole("img", { name: "Collected per day, from ₱2 to ₱10" })).toBeInTheDocument();
    expect(container.querySelector("path[data-line]")).not.toBeNull();
    const dot = screen.getByTestId("spark-dot");
    // the latest value is the highest, so the dot sits at the top; the last x is the right edge
    expect(dot.style.left).toBe("100%");
    expect(dot.style.top).toBe("10%");
  });

  it("puts the dot low when the latest value is the lowest", () => {
    const values = [10, 6, 0];
    render(<Sparkline values={values} labels={labels(values)} ariaLabel="x" />);
    expect(screen.getByTestId("spark-dot").style.top).toBe("90%");
  });

  it("gives every point a tooltip", () => {
    const values = [1, 2, 3];
    const { container } = render(<Sparkline values={values} labels={labels(values)} ariaLabel="x" />);
    expect([...container.querySelectorAll("title")].map((t) => t.textContent)).toEqual(["Day 1: 1", "Day 2: 2", "Day 3: 3"]);
  });

  it("shows a faint flat dotted line when there is nothing to draw", () => {
    const values = [0, 0, 0, 0];
    const { container } = render(<Sparkline values={values} labels={labels(values)} ariaLabel="Collected per day, no activity" />);
    expect(screen.getByTestId("spark-flat")).toBeInTheDocument();
    expect(screen.queryByTestId("spark-dot")).toBeNull();
    expect(container.querySelector("path[data-line]")).toBeNull();
  });

  it("draws a steady line in the middle when every value is the same", () => {
    const values = [4, 4, 4];
    render(<Sparkline values={values} labels={labels(values)} ariaLabel="x" />);
    expect(screen.getByTestId("spark-dot").style.top).toBe("50%");
  });

  it("a single point is just a dot", () => {
    const { container } = render(<Sparkline values={[7]} labels={["Oct 12: 7"]} ariaLabel="x" />);
    expect(screen.getByTestId("spark-dot").style.left).toBe("50%");
    expect(container.querySelector("path[data-line]")).toBeNull();
  });

  it("renders nothing without points", () => {
    const { container } = render(<Sparkline values={[]} labels={[]} ariaLabel="x" />);
    expect(container).toBeEmptyDOMElement();
  });
});
