import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClientRow from "@/components/admin/ClientRow";
import type { DirectoryUser } from "@/components/admin/DirectoryProfileCard";

const client: DirectoryUser = {
  id: "clerk_1", firstName: "ana", lastName: "cruz", phoneNumber: "09171234567", email: "ana@example.com",
  user_id: 5, visit_count: 3, is_recurring: true,
};

describe("ClientRow", () => {
  it("shows the name, visits and the recurring badge", () => {
    render(<ClientRow user={client} onNotes={() => {}} />);
    expect(screen.getByText("Ana Cruz")).toBeInTheDocument();
    expect(screen.getByText("3 visits")).toBeInTheDocument();
    expect(screen.getByText("Recurring")).toBeInTheDocument();
  });

  it("tapping the row opens a sheet with the actions, Delete last", () => {
    render(<ClientRow user={client} onEdit={() => {}} onDelete={() => {}} onNotes={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Ana Cruz/ }));
    const sheet = within(screen.getByRole("dialog", { name: "Ana Cruz" }));
    expect(sheet.getAllByRole("button").map((b) => b.textContent)).toEqual(["", "Notes", "Edit", "Delete"]);
    expect(sheet.getByRole("link", { name: "ana@example.com" })).toHaveAttribute("href", "mailto:ana@example.com");
    expect(sheet.getByRole("link", { name: "09171234567" })).toHaveAttribute("href", "tel:09171234567");
  });

  it("each action calls its handler with the client and closes the sheet", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onNotes = vi.fn();
    render(<ClientRow user={client} onEdit={onEdit} onDelete={onDelete} onNotes={onNotes} />);

    fireEvent.click(screen.getByRole("button", { name: /Ana Cruz/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(client);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Ana Cruz/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(client);

    fireEvent.click(screen.getByRole("button", { name: /Ana Cruz/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Notes" }));
    expect(onNotes).toHaveBeenCalledWith(client);
  });

  it("does not offer Notes when there is no handler (a client without an account)", () => {
    render(<ClientRow user={{ ...client, user_id: undefined }} onEdit={() => {}} onDelete={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Ana Cruz/ }));
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Notes" })).toBeNull();
  });

  it("the Notes button on the row opens the notes without opening the sheet", () => {
    const onNotes = vi.fn();
    render(<ClientRow user={client} onNotes={onNotes} />);
    fireEvent.click(screen.getByRole("button", { name: "Notes" }));
    expect(onNotes).toHaveBeenCalledWith(client);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
