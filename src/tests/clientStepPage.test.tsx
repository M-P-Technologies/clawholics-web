import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClientPage from "@/components/features/client/shell/ClientPage";

const navigate = vi.fn();
vi.mock("@/lib/router", () => ({ useNavigate: () => navigate }));

describe("ClientPage", () => {
  it("shows the title and goes back one step", () => {
    render(<ClientPage title="Book"><p>body</p></ClientPage>);
    expect(screen.getByRole("heading", { level: 1, name: "Book" })).toBeInTheDocument();
    const back = screen.getByRole("button", { name: "Back" });
    expect(back).toHaveAttribute("title", "Back"); // IconButton always gives its name as a tooltip
    fireEvent.click(back);
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it("goes to the given path when there is one", () => {
    navigate.mockClear();
    render(<ClientPage title="Payment" back="/my/appointments"><p>body</p></ClientPage>);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenCalledWith("/my/appointments");
  });
});
