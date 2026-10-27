import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/(site)/(home)/page";

vi.mock("@/hooks/useHome", () => ({
  useHome: () => ({
    contentError: false, reloadContent: () => {},
    content: { home_title: "Clawholics.", home_services_subtitle: "", home_about_subtitle: "", home_about_image: "", home_hero_image: "" },
    faqs: [], nailists: [], about: null, stripItems: [],
  }),
}));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: "/", state: null }),
}));

// Tailwind class names contain colons, so match them as whole class tokens
const byClass = (container: HTMLElement, token: string) => container.querySelector(`[class~="${token}"]`) as HTMLElement;

describe("home hero on phones", () => {
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as unknown as typeof window.matchMedia;
  });

  it("has a wide 'Book appointment' button and a plain 'Explore' with a bouncing chevron", () => {
    const { container } = render(<Home />);
    const phone = byClass(container, "md:hidden");
    expect(phone).not.toBeNull();

    const book = within(phone).getByRole("link", { name: /^Book appointment/ });
    expect(book).toHaveAttribute("href", "/services");
    expect(book).toHaveTextContent("Book appointment");

    const explore = within(phone).getByRole("button", { name: /explore/i });
    expect(explore).toHaveTextContent(/^Explore$/);
    expect(explore.querySelector("svg")).toHaveClass("animate-bounce");
    expect(container.textContent).not.toContain("Explore Services");
  });

  it("keeps the two original buttons for tablets and desktops", () => {
    const { container } = render(<Home />);
    const desktop = byClass(container, "md:flex");
    expect(within(desktop).getByRole("link", { name: /^Book now/ })).toHaveTextContent("Book now");
    expect(within(desktop).getByRole("link", { name: "View services" })).toHaveAttribute("href", "/services");
  });

  it("Explore scrolls to the 'Why choose us' section", () => {
    const { container } = render(<Home />);
    const target = container.querySelector("#why-choose-us") as HTMLElement;
    expect(target).not.toBeNull();
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    fireEvent.click(screen.getByRole("button", { name: /explore/i }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });
});
