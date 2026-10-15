import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QrCode } from "lucide-react";
import { EmptyState, LoadError, SectionHeader } from "@/components/molecules";
import { Link } from "@/lib/router";

vi.mock("@/lib/router", () => ({ Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a> }));

describe("EmptyState", () => {
  it("announces errors at once and the rest politely", () => {
    const { rerender } = render(<EmptyState kind="error" title="It failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("It failed");
    rerender(<EmptyState kind="empty" title="Nothing yet" message="Book a visit." />);
    expect(screen.getByRole("status")).toHaveTextContent("Book a visit.");
  });
  it("LoadError offers a retry and a way home", () => {
    const onRetry = vi.fn();
    render(<LoadError what="services" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load the services");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("SectionHeader", () => {
  it("is the page's h1 by default", () => {
    render(<SectionHeader title="Book your visit" subtitle="Pick a time." />);
    expect(screen.getByRole("heading", { level: 1, name: "Book your visit" })).toBeInTheDocument();
  });
  it("is a section row with an action", () => {
    render(<SectionHeader size="section" title="Popular services" action={<Link to="/my/explore">See all</Link>} />);
    expect(screen.getByRole("heading", { level: 2, name: "Popular services" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all" })).toBeInTheDocument();
  });
  it("is a card title with its icon", () => {
    const { container } = render(<SectionHeader size="card" icon={QrCode} title="Scan a card" />);
    expect(screen.getByRole("heading", { level: 2, name: "Scan a card" })).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
