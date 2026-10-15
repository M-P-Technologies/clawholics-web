import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DirectoryProfileCard from "@/components/features/admin/directory/DirectoryProfileCard";
import { fetchDirectoryUsers } from "../services/directoryService";


afterEach(() => vi.unstubAllGlobals());

const stubDirectory = (rows: unknown[]) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => rows }));

describe("fetchDirectoryUsers: notes-related fields", () => {
  it("reads user_id, visit stats and the recurring flag", async () => {
    stubDirectory([
      {
        id: "clerk_1", user_id: 5, first_name: "Ana", last_name: "Cruz", role: "customer",
        visit_count: 3, last_visit: "2026-09-30T08:00:00Z", is_recurring: 1,
      },
    ]);
    const [user] = await fetchDirectoryUsers("tok", "admin_1");
    expect(user).toMatchObject({
      user_id: 5, visit_count: 3, last_visit: "2026-09-30T08:00:00Z", is_recurring: true,
    });
  });

  it("falls back safely when the backend has not added the fields yet", async () => {
    stubDirectory([{ id: "clerk_2", first_name: "Bea", last_name: "Lim", role: "customer" }]);
    const [user] = await fetchDirectoryUsers("tok", "admin_1");
    expect(user.user_id).toBeUndefined();
    expect(user.visit_count).toBeUndefined();
    expect(user.last_visit).toBeNull();
    expect(user.is_recurring).toBe(false);
  });

  it("ignores a non-numeric user_id", async () => {
    stubDirectory([{ id: "c", user_id: "abc", first_name: "C", last_name: "D", role: "customer" }]);
    const [user] = await fetchDirectoryUsers("tok", "admin_1");
    expect(user.user_id).toBeUndefined();
  });
});

describe("DirectoryProfileCard", () => {
  const client = {
    id: "clerk_1", user_id: 5, firstName: "Ana", lastName: "Cruz", phoneNumber: "0917", email: "a@x.com",
    role: "Client", visit_count: 3, last_visit: "2026-09-30T08:00:00Z", is_recurring: true,
  };

  it("shows the Recurring badge and the visit count", () => {
    render(<DirectoryProfileCard user={client} onNotes={() => {}} />);
    expect(screen.getByText("Recurring")).toBeInTheDocument();
    expect(screen.getByText("Visits").nextElementSibling).toHaveTextContent("3");
  });

  it("shows no badge for a first-time client", () => {
    render(<DirectoryProfileCard user={{ ...client, is_recurring: false, visit_count: 1 }} onNotes={() => {}} />);
    expect(screen.queryByText("Recurring")).not.toBeInTheDocument();
    expect(screen.getByText("Visits").nextElementSibling).toHaveTextContent("1");
  });

  it("opens notes", async () => {
    const onNotes = vi.fn();
    const user = userEvent.setup();
    render(<DirectoryProfileCard user={client} onNotes={onNotes} />);

    await user.click(screen.getByRole("button", { name: "Notes" }));

    expect(onNotes).toHaveBeenCalledWith(client);
  });

  it("has no action buttons when there are no actions", () => {
    render(<DirectoryProfileCard user={client} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
