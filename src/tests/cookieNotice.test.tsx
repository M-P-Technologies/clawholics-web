import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

import CookieNotice from "@/components/layout/CookieNotice";
import { resetCookieNotice } from "@/hooks/useCookieNotice";

describe("cookie notice", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCookieNotice();
  });

  it("says which cookies the site uses and links to the privacy policy's cookie section", () => {
    render(<CookieNotice />);
    expect(screen.getByRole("region", { name: "Cookie notice" })).toHaveTextContent(/only use the cookies needed .* No tracking or ads/);
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy#cookies");
  });

  it("closes with Got it and stays closed on the next visit", () => {
    const first = render(<CookieNotice />);
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("region", { name: "Cookie notice" })).toBeNull();
    first.unmount();

    render(<CookieNotice />);
    expect(screen.queryByRole("region", { name: "Cookie notice" })).toBeNull();
  });
});
