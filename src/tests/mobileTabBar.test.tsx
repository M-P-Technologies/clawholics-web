import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MobileTabBar from "@/components/layout/MobileTabBar";

let pathname = "/";
let signedIn = false;
const openUserProfile = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/router", () => ({
  useLocation: () => ({ pathname }),
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ openUserProfile, signOut }),
  Show: ({ when, children }: { when: "signed-in" | "signed-out"; children: React.ReactNode }) =>
    (when === "signed-in") === signedIn ? <>{children}</> : null,
}));

beforeEach(() => {
  // Not the home page, where the bar stays hidden until the page is scrolled
  pathname = "/services";
  signedIn = false;
  vi.clearAllMocks();
});

describe("phone tab bar", () => {
  it("has the four page tabs, a Book button and More", () => {
    render(<MobileTabBar />);
    const bar = screen.getByRole("navigation", { name: "Mobile navigation" });
    const links = [...bar.querySelectorAll("a")].map((a) => [a.textContent?.trim(), a.getAttribute("href")]);
    expect(links).toEqual([["Home", "/"], ["Services", "/services"], ["Book", "/services"], ["Artists", "/artists"]]);
    expect(screen.getByRole("link", { name: "Book an appointment" })).toHaveAttribute("href", "/services");
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "false");
  });

  it("marks the current page's tab", () => {
    pathname = "/artists";
    render(<MobileTabBar />);
    expect(screen.getByRole("link", { name: "Artists" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("More opens About, Contact and the sign-in links when signed out", () => {
    render(<MobileTabBar />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: "About Us" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "/contact");
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: "Log in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign up" })).toBeNull();
    expect(screen.queryByText("Log out")).toBeNull();
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "true");
  });

  it("More shows the account actions when signed in", () => {
    signedIn = true;
    render(<MobileTabBar />);
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("link", { name: "My account" })).toHaveAttribute("href", "/my");
    expect(screen.queryByRole("link", { name: "Account" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Manage account" }));
    expect(openUserProfile).toHaveBeenCalled();
    expect(screen.queryByText("About Us")).toBeNull(); // the sheet closed
  });

  it("closes the sheet on Escape and when tapping outside it", () => {
    render(<MobileTabBar />);
    const open = () => fireEvent.click(screen.getByRole("button", { name: "More" }));

    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("About Us")).toBeNull();

    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("About Us")).toBeNull();
  });

  describe("on the home page hero", () => {
    beforeEach(() => {
      pathname = "/";
    });

    const scrollTo = (y: number) =>
      act(() => {
        Object.defineProperty(window, "scrollY", { value: y, configurable: true });
        window.dispatchEvent(new Event("scroll"));
      });
    const bar = () => screen.getByRole("navigation", { name: "Mobile navigation" });

    beforeEach(() => scrollTo(0));

    it("is tucked away until the page is scrolled, then slides up", () => {
      render(<MobileTabBar />);
      expect(bar()).toHaveClass("translate-y-[calc(100%+2rem)]");
      expect(bar()).toHaveAttribute("inert");

      scrollTo(120);
      expect(bar()).toHaveClass("translate-y-0");
      expect(bar()).not.toHaveAttribute("inert");

      scrollTo(0);
      expect(bar()).toHaveClass("translate-y-[calc(100%+2rem)]");
    });

    it("is always shown on the other pages", () => {
      pathname = "/services";
      render(<MobileTabBar />);
      expect(bar()).toHaveClass("translate-y-0");
      expect(bar()).not.toHaveAttribute("inert");
    });
  });

  describe("at the footer", () => {
    let trigger: (intersecting: boolean) => void;
    let options: IntersectionObserverInit | undefined;

    beforeEach(() => {
      pathname = "/services";
      document.body.insertAdjacentHTML("beforeend", "<footer id='test-footer'>footer</footer>");
      class FakeObserver {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void, opts?: IntersectionObserverInit) {
          options = opts;
          trigger = (isIntersecting) => act(() => cb([{ isIntersecting }]));
        }
        observe() {}
        disconnect() {}
      }
      vi.stubGlobal("IntersectionObserver", FakeObserver);
    });

    afterEach(() => {
      document.getElementById("test-footer")?.remove();
      vi.unstubAllGlobals();
    });

    it("slides away once the footer reaches it, and comes back when the footer leaves", () => {
      render(<MobileTabBar />);
      const bar = screen.getByRole("navigation", { name: "Mobile navigation" });
      expect(bar).toHaveClass("translate-y-0");

      trigger(true);
      expect(bar).toHaveClass("translate-y-[calc(100%+2rem)]");
      expect(bar).toHaveAttribute("inert");

      trigger(false);
      expect(bar).toHaveClass("translate-y-0");
    });

    it("counts the bar's own height, so it moves aside when the footer touches it", () => {
      render(<MobileTabBar />);
      expect(options?.rootMargin).toBe("0px 0px -64px 0px");
    });
  });
});
