import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BackButton, { BACK_SLOT_ID } from "@/components/layout/BackButton";

const navigate = vi.fn();
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate }));

describe("BackButton", () => {
  it("stays in the page when there is no top bar slot (admin screens)", () => {
    const { container } = render(<BackButton />);
    expect(container.querySelectorAll("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenLastCalledWith(-1);
  });

  it("puts a copy in the top bar's slot on phones, and keeps the page's copy for desktop", () => {
    const slot = document.createElement("div");
    slot.id = BACK_SLOT_ID;
    document.body.appendChild(slot);

    const { container } = render(<BackButton to="/artists" label="All artists" />);
    expect(slot.querySelectorAll("button")).toHaveLength(1);
    expect(slot.textContent).toContain("All artists");
    // the page's own copy is hidden below lg
    expect(container.querySelector("span.hidden")).toHaveClass("lg:inline-flex");

    fireEvent.click(slot.querySelector("button")!);
    expect(navigate).toHaveBeenLastCalledWith("/artists");
    slot.remove();
  });
});
