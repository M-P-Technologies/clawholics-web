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

  it("makes a row a link when it has an address: phone apps open in place, a web address in a new tab", () => {
    render(
      <ProfilePanel
        {...base}
        rows={[
          { label: "Phone", value: "0917 123 4567", href: "tel:09171234567" },
          { label: "Instagram", value: "@ana", href: "https://www.instagram.com/ana/" },
          { label: "Prefers", value: "Call" },
        ]}
      />,
    );
    const phone = screen.getByRole("link", { name: "0917 123 4567" });
    expect(phone).toHaveAttribute("href", "tel:09171234567");
    expect(phone).not.toHaveAttribute("target");
    const web = screen.getByRole("link", { name: /@ana/ });
    expect(web).toHaveAttribute("href", "https://www.instagram.com/ana/");
    expect(web).toHaveAttribute("target", "_blank");
    expect(web).toHaveAttribute("rel", "noopener noreferrer");
    expect(web).toHaveTextContent("(opens in a new tab)");
    // A row with no address stays plain text
    expect(screen.queryByRole("link", { name: "Call" })).toBeNull();
    expect(screen.getByText("Call")).toBeInTheDocument();
  });

  it("puts the actions under the rows", () => {
    render(<ProfilePanel {...base}><button type="button">Edit details</button></ProfilePanel>);
    expect(screen.getByRole("button", { name: "Edit details" })).toBeInTheDocument();
  });
});
