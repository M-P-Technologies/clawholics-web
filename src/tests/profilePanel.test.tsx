import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Mail } from "lucide-react";
import { ProfilePanel } from "@/components/organisms";

describe("ProfilePanel", () => {
  const base = { label: "Client profile", name: "Ana Cruz", rowsTitle: "Client info", rows: [{ label: "Email", value: "ana@example.com", icon: Mail }, { label: "Phone", value: "" }] };

  it("shows who it is, the highlight and the rows that have a value", () => {
    render(<ProfilePanel {...base} badges={<span>Client</span>} highlight={{ title: "Next visit", value: "Oct 20, 2026", detail: "9:00 AM · Hard Gel with Max", empty: "Nothing booked ahead." }} />);
    const panel = screen.getByRole("complementary", { name: "Client profile" });
    expect(within(panel).getByRole("heading", { name: "Ana Cruz" })).toBeInTheDocument();
    expect(panel).toHaveTextContent("Client");
    expect(panel).toHaveTextContent("Oct 20, 2026");
    expect(panel).toHaveTextContent("9:00 AM · Hard Gel with Max");
    expect(within(panel).getByText("ana@example.com")).toBeInTheDocument();
    expect(within(panel).queryByText("Phone")).toBeNull();
  });

  it("says when nothing is booked, shows initials without a photo, and a photo when there is one", () => {
    const { rerender } = render(<ProfilePanel {...base} highlight={{ title: "Next visit", empty: "Nothing booked ahead." }} />);
    expect(screen.getByText("Nothing booked ahead.")).toBeInTheDocument();
    expect(screen.getByText("AC")).toBeInTheDocument();
    rerender(<ProfilePanel {...base} imageUrl="https://img/ana.webp" />);
    expect(document.querySelector('img[src="https://img/ana.webp"]')).not.toBeNull();
  });

  it("puts the actions under the rows", () => {
    render(<ProfilePanel {...base}><button type="button">Edit details</button></ProfilePanel>);
    expect(screen.getByRole("button", { name: "Edit details" })).toBeInTheDocument();
  });
});
