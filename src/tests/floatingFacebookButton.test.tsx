import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import FloatingFacebookButton from "@/components/home/FloatingFacebookButton";

const scrollTo = (y: number) =>
  act(() => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
  });

const button = () => screen.getByLabelText("Message Clawholics by Max on Facebook", { selector: "a" });
const HIDDEN = "max-lg:invisible";

describe("floating Facebook button", () => {
  beforeEach(() => scrollTo(0));

  it("is hidden on phones while the hero shows, and slides in once the page is scrolled", () => {
    render(<FloatingFacebookButton href="https://facebook.com/x" />);
    expect(button().className).toContain(HIDDEN);

    scrollTo(120);
    expect(button().className).not.toContain(HIDDEN);

    scrollTo(0);
    expect(button().className).toContain(HIDDEN);
  });

  it("only hides below the lg breakpoint, so desktops always show it", () => {
    render(<FloatingFacebookButton href="https://facebook.com/x" />);
    for (const token of button().className.split(" ").filter((c) => /invisible|opacity-0|pointer-events-none|translate-y-\[calc/.test(c) && c.includes(":"))) {
      expect(token.startsWith("max-lg:")).toBe(true);
    }
  });
});
