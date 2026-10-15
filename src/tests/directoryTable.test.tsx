import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DirectoryTable from "@/components/features/admin/directory/DirectoryTable";
import type { DirectoryUser } from "@/components/features/admin/directory/DirectoryProfileCard";

const person = (i: number, over: Partial<DirectoryUser> = {}): DirectoryUser => ({
  id: `user_${i}`, clerk_id: `user_${i}`, firstName: `Client${i}`, lastName: "Cruz", email: `c${i}@x.test`, phoneNumber: `0917 000 00${String(i).padStart(2, "0")}`,
  role: "customer", visit_count: i, ...over,
});
const people = Array.from({ length: 13 }, (_, i) => person(i + 1));
const profiles = { user_1: { imageUrl: "https://img.clerk.com/1.png", joinedAt: "2026-06-01T00:00:00.000Z", lastSignInAt: "2026-10-11T02:00:00.000Z" } };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-12T02:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const bodyRows = () => screen.getAllByRole("row").slice(1);

describe("DirectoryTable", () => {
  it("lists people five to a page, with their photo, contact, joined, last active and visits", () => {
    render(<DirectoryTable label="Clients" users={people} profiles={profiles} selectedId="user_1" onSelect={vi.fn()} showVisits />);
    expect(screen.getByRole("table", { name: "Clients" })).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(5);
    const first = within(bodyRows()[0]);
    expect(first.getByRole("img", { name: "Client1 Cruz" })).toHaveAttribute("src", "https://img.clerk.com/1.png");
    expect(first.getByText("c1@x.test")).toBeInTheDocument();
    expect(first.getByText("0917 000 0001")).toBeInTheDocument();
    expect(first.getByText("Jun 2026")).toBeInTheDocument();
    expect(first.getByText("yesterday")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Visits" })).toBeInTheDocument();
    expect(screen.getByText("Showing 1–5 of 13")).toBeInTheDocument();
  });

  it("marks the selected person and selects another on click", () => {
    const onSelect = vi.fn();
    render(<DirectoryTable label="Clients" users={people} profiles={profiles} selectedId="user_1" onSelect={onSelect} showVisits />);
    expect(bodyRows()[0]).toHaveAttribute("aria-selected", "true");
    expect(bodyRows()[1]).toHaveAttribute("aria-selected", "false");
    fireEvent.click(screen.getByRole("button", { name: "Client2 Cruz" }));
    expect(onSelect).toHaveBeenCalledWith(people[1]);
  });

  it("pages through the rest", () => {
    render(<DirectoryTable label="Clients" users={people} profiles={{}} selectedId={null} onSelect={vi.fn()} showVisits />);
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByText("Showing 11–13 of 13")).toBeInTheDocument();
    // the last page keeps room for five rows, so the table (and the card beside it) keep their height
    expect(document.querySelectorAll("tr[data-filler]")).toHaveLength(2);
  });

  it("shows the role instead of visits for admins", () => {
    render(<DirectoryTable label="Admins" users={[person(1, { role: "admin" })]} profiles={{}} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.queryByRole("columnheader", { name: "Visits" })).toBeNull();
    expect(within(bodyRows()[0]).getByText("Admin")).toBeInTheDocument();
    expect(within(bodyRows()[0]).getByText("CC")).toBeInTheDocument(); // initials without a photo
  });

  it("adds no blank rows when everyone fits on one page", () => {
    render(<DirectoryTable label="Clients" users={people.slice(0, 2)} profiles={{}} selectedId={null} onSelect={vi.fn()} showVisits />);
    expect(document.querySelectorAll("tr[data-filler]")).toHaveLength(0);
  });
});

