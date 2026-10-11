import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ArtistOverview from "@/components/booking/ArtistOverview";

const nailist = {
  name: "Miss Max", position: "Master Technician", bio: "A highly skilled artist.",
  specialty: "Russian Manicure\nHard Gel", offered_services: ["Hard Gel", "Gel Overlay", "Biab Overlay"],
};

describe("ArtistOverview (phone layout)", () => {
  it("shows the name, three quick facts, and the bio under About", () => {
    render(<ArtistOverview nailist={nailist} workCount={6} />);
    expect(screen.getByRole("heading", { level: 1, name: "Miss Max" })).toBeInTheDocument();
    expect(screen.getByText("Master")).toBeInTheDocument();
    expect(screen.getByText("Technician")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // services
    expect(screen.getByText("6")).toBeInTheDocument(); // photos of work
    expect(screen.getByRole("heading", { name: "About" }).nextElementSibling).toHaveTextContent("A highly skilled artist.");
  });

  it("lists specialties and the services they offer, with the shared text styles", () => {
    const { container } = render(<ArtistOverview nailist={nailist} workCount={0} />);
    expect(screen.getByRole("heading", { name: "Specialties" }).nextElementSibling).toHaveClass("copy-body");
    expect(screen.getByText("Gel Overlay")).toBeInTheDocument();
    expect(container.querySelectorAll("h2.label-caps").length).toBe(3);
  });

  it("leaves out facts and sections there is nothing for", () => {
    render(<ArtistOverview nailist={{ ...nailist, specialty: "", offered_services: [] }} workCount={0} />);
    expect(screen.queryByText("Services")).toBeNull();
    expect(screen.queryByText("Photos of work")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Specialties" })).toBeNull();
  });
});
