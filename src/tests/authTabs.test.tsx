import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthTabs from "@/features/auth/components/AuthTabs";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

describe("Login | Sign up switch", () => {
  it("links both pages and marks the current one", () => {
    const { rerender } = render(<AuthTabs current="login" />);
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Sign up" })).not.toHaveAttribute("aria-current");

    rerender(<AuthTabs current="signup" />);
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Login" })).not.toHaveAttribute("aria-current");
  });
});
