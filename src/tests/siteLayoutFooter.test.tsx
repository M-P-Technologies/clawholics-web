import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SiteLayout from "@/components/layout/SiteLayout";

let pathname = "/";
vi.mock("@/lib/router", () => ({ useLocation: () => ({ pathname }) }));
vi.mock("@/components/layout/NavBar", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/MobileTabBar", () => ({ default: () => null }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer>footer</footer> }));

// The footer's wrapper: shown on phones only for the main pages (it always shows from lg up)
const wrapperClass = (path: string) => {
  pathname = path;
  const { container, unmount } = render(<SiteLayout>page</SiteLayout>);
  const footer = container.querySelector("footer");
  const cls = footer ? (footer.parentElement as HTMLElement).className : null;
  unmount();
  return cls;
};

describe("footer on phones", () => {
  it.each(["/", "/services", "/artists", "/about", "/faq", "/contact"])("shows on %s", (path) => {
    expect(wrapperClass(path)).not.toContain("hidden");
  });

  it.each(["/artists/3", "/services/2", "/booking", "/payment", "/payment-confirmation", "/reschedule", "/terms", "/privacy", "/tou"])(
    "is hidden on phones on %s, but still there from lg up",
    (path) => {
      expect(wrapperClass(path)).toContain("hidden");
      expect(wrapperClass(path)).toContain("lg:block");
    },
  );

  it.each(["/login", "/signup", "/onboarding"])("is not rendered at all on %s", (path) => {
    expect(wrapperClass(path)).toBeNull();
  });
});

describe("room for the bottom bar", () => {
  const layoutClass = (path: string) => {
    pathname = path;
    const { container, unmount } = render(<SiteLayout>page</SiteLayout>);
    const cls = (container.firstElementChild as HTMLElement).className;
    unmount();
    return cls;
  };

  it("leaves no empty band under the footer on the pages that show it", () => {
    for (const path of ["/", "/services", "/artists", "/about", "/contact"]) {
      expect(layoutClass(path)).not.toContain("pb-[calc");
    }
  });

  it("keeps room for the bar on phones where the page has no footer", () => {
    for (const path of ["/services/hard-gel", "/booking", "/payment", "/profile", "/login"]) {
      expect(layoutClass(path)).toContain("pb-[calc(4rem+env(safe-area-inset-bottom))]");
    }
  });
});
