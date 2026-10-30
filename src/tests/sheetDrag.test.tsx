import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "@/components/organisms";

// Reduced motion makes the release settle at once, so the outcome can be read without frames
function stubMedia(desktop: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("prefers-reduced-motion") || (desktop && query.includes("min-width")),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function Sheet({ placement = "sheet" }: { placement?: "sheet" | "drawer" }) {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Details" placement={placement}>
      <p>Body</p>
    </Dialog>
  );
}

// One pointer event at a given place and time (jsdom's own timestamps are all about the same)
function pointer(target: Element, type: "pointerDown" | "pointerMove" | "pointerUp", x: number, y: number, time: number) {
  const event = createEvent[type](target, { clientX: x, clientY: y, pointerId: 1, button: 0 });
  Object.defineProperty(event, "timeStamp", { value: time });
  fireEvent(target, event);
}

describe("dragging a sheet away", () => {
  beforeEach(() => {
    stubMedia(false);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
    Element.prototype.setPointerCapture = () => {};
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const header = () => screen.getByRole("heading", { name: "Details" });

  it("closes when dragged more than halfway down", () => {
    render(<Sheet />);
    pointer(header(), "pointerDown", 0, 0, 1000);
    pointer(header(), "pointerMove", 0, 150, 1300);
    pointer(header(), "pointerMove", 0, 260, 1600);
    pointer(header(), "pointerUp", 0, 260, 1600);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("settles back open when let go short of halfway and slowly", () => {
    render(<Sheet />);
    pointer(header(), "pointerDown", 0, 0, 1000);
    pointer(header(), "pointerMove", 0, 40, 1400);
    pointer(header(), "pointerMove", 0, 60, 1800);
    pointer(header(), "pointerUp", 0, 60, 1800);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog").style.transform).toBe("translateY(0px)");
  });

  it("closes on a short but fast flick, from where it would land", () => {
    render(<Sheet />);
    pointer(header(), "pointerDown", 0, 0, 1000);
    pointer(header(), "pointerMove", 0, 40, 1030);
    pointer(header(), "pointerMove", 0, 80, 1060);
    pointer(header(), "pointerUp", 0, 80, 1060);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resists being pulled up past its open position", () => {
    render(<Sheet />);
    pointer(header(), "pointerDown", 0, 300, 1000);
    pointer(header(), "pointerMove", 0, 100, 1400);
    const moved = Number(/-?\d+(\.\d+)?/.exec(screen.getByRole("dialog").style.transform)?.[0]);
    expect(moved).toBeLessThan(0);
    expect(moved).toBeGreaterThan(-200);
  });

  it("does not start a drag from the close button", () => {
    render(<Sheet />);
    const close = screen.getByRole("button", { name: "Close" });
    pointer(close, "pointerDown", 0, 0, 1000);
    pointer(close, "pointerMove", 0, 300, 1100);
    expect(screen.getByRole("dialog").style.transform).toBe("");
  });

  it("a drawer is dragged to the right", () => {
    render(<Sheet placement="drawer" />);
    pointer(header(), "pointerDown", 0, 0, 1000);
    pointer(header(), "pointerMove", 300, 0, 1300);
    pointer(header(), "pointerUp", 300, 0, 1300);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is not a sheet at desktop width", () => {
    stubMedia(true);
    render(<Sheet />);
    pointer(header(), "pointerDown", 0, 0, 1000);
    pointer(header(), "pointerMove", 0, 300, 1100);
    expect(screen.getByRole("dialog").style.transform).toBe("");
  });

  it("Escape calls the caller's current onClose, not the first one it saw", () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<Dialog open onClose={first} title="Details"><p>Body</p></Dialog>);
    rerender(<Dialog open onClose={latest} title="Details"><p>Body</p></Dialog>);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it("opens again at rest after being dragged closed", () => {
    function Reopen() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Details"><p>Body</p></Dialog>
        </>
      );
    }
    render(<Reopen />);
    pointer(header(), "pointerDown", 0, 0, 1000);
    pointer(header(), "pointerMove", 0, 300, 1300);
    pointer(header(), "pointerUp", 0, 300, 1300);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    // Touching the header must not start from where the last drag ended
    pointer(header(), "pointerDown", 0, 10, 2000);
    pointer(header(), "pointerMove", 0, 12, 2100);
    expect(screen.getByRole("dialog").style.transform).toBe("");
  });

  it("a tap on the header leaves the panel's animation alone", () => {
    render(<Sheet />);
    pointer(header(), "pointerDown", 0, 0, 1000);
    pointer(header(), "pointerUp", 0, 0, 1050);
    expect(screen.getByRole("dialog").style.animation).toBe("");
  });
});
