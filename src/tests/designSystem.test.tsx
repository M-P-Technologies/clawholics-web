import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DesignSystem from "@/admin/DesignSystem";

vi.mock("@/components/admin/AdminShell", () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <main><h1>{title}</h1>{children}</main> }));

describe("design system gallery", () => {
  it("shows the three groups", () => {
    render(<DesignSystem />);
    expect(screen.getByRole("heading", { level: 1, name: "Design system" })).toBeInTheDocument();
    for (const group of ["Atoms", "Molecules", "Organisms"]) expect(screen.getByRole("heading", { level: 2, name: group })).toBeInTheDocument();
  });

  it("shows the atoms", () => {
    render(<DesignSystem />);
    for (const c of ["Button", "Badge", "Avatar", "Card", "IconButton", "Input", "Checkbox", "Select", "LoadingBar", "Blush", "StarRating", "Pearls"]) expect(screen.getByRole("heading", { level: 3, name: c })).toBeInTheDocument();
  });

  it("shows the molecules", () => {
    render(<DesignSystem />);
    for (const c of ["FormField", "ChoiceRow", "SearchBar", "Tabs", "StatCard", "Pagination", "Toast", "EmptyState", "SectionHeader"]) expect(screen.getByRole("heading", { level: 3, name: c })).toBeInTheDocument();
  });

  it("shows the organisms", () => {
    render(<DesignSystem />);
    for (const c of ["Dialog"]) expect(screen.getByRole("heading", { level: 3, name: c })).toBeInTheDocument();
  });
});
