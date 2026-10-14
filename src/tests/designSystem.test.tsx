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
});
