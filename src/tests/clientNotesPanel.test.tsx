import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AS_ClientNotesPanel from "../components/admin/AS_ClientNotesPanel";
import { ApiError } from "../services/catalogService";
import * as notes from "../services/clientNotesService";

vi.mock("../services/clientNotesService", async () => {
  const actual = await vi.importActual<typeof import("../services/clientNotesService")>(
    "../services/clientNotesService",
  );
  return {
    ...actual,
    fetchNotes: vi.fn(),
    addNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    fetchNextSteps: vi.fn(),
    saveNextSteps: vi.fn(),
  };
});

const auth = { token: "tok", clerkId: "admin_1" };
const note = (over: Partial<notes.ClientNote> = {}): notes.ClientNote => ({
  id: 1, client_user_id: 5, author_admin_id: 2, author_name: "Admin Ana",
  note: "Prefers short square", created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z",
  ...over,
});

const setup = async () => {
  const user = userEvent.setup();
  render(<AS_ClientNotesPanel clientUserId={5} tokenFetcher={async () => "tok"} clerkId="admin_1" />);
  await screen.findByLabelText("Next steps");
  return user;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(notes.fetchNotes).mockResolvedValue([note()]);
  vi.mocked(notes.fetchNextSteps).mockResolvedValue({ client_user_id: 5, text: "Offer gel removal" });
});

describe("AS_ClientNotesPanel", () => {
  it("loads the notes and the next steps", async () => {
    await setup();
    expect(screen.getByText("Prefers short square")).toBeInTheDocument();
    expect(screen.getByText(/Admin Ana/)).toBeInTheDocument();
    expect(screen.getByLabelText("Next steps")).toHaveValue("Offer gel removal");
    expect(notes.fetchNotes).toHaveBeenCalledWith(5, auth);
  });

  it("will not add a blank or whitespace-only note", async () => {
    const user = await setup();
    const add = screen.getByRole("button", { name: "Add note" });
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText("New note"), "   ");
    expect(add).toBeDisabled();
    expect(notes.addNote).not.toHaveBeenCalled();
  });

  it("adds a note and shows it first", async () => {
    vi.mocked(notes.addNote).mockResolvedValue(note({ id: 2, note: "Allergic to acrylic" }));
    const user = await setup();

    await user.type(screen.getByLabelText("New note"), "  Allergic to acrylic  ");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(notes.addNote).toHaveBeenCalledWith(5, "Allergic to acrylic", auth);
    const items = await screen.findAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Allergic to acrylic");
    expect(screen.getByLabelText("New note")).toHaveValue("");
  });

  it("saves next steps only when they changed, trimmed", async () => {
    vi.mocked(notes.saveNextSteps).mockResolvedValue({ client_user_id: 5, text: "Book a refill" });
    const user = await setup();
    const save = screen.getByRole("button", { name: "Save next steps" });
    expect(save).toBeDisabled();

    const field = screen.getByLabelText("Next steps");
    await user.clear(field);
    await user.type(field, "  Book a refill ");
    await user.click(save);

    expect(notes.saveNextSteps).toHaveBeenCalledWith(5, "Book a refill", auth);
    await waitFor(() => expect(screen.getByRole("button", { name: "Save next steps" })).toBeDisabled());
  });

  it("edits a note", async () => {
    vi.mocked(notes.updateNote).mockResolvedValue(note({ note: "Prefers almond" }));
    const user = await setup();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const field = screen.getByLabelText("Edit note");
    await user.clear(field);
    await user.type(field, "Prefers almond");
    await user.click(screen.getByRole("button", { name: "Save note" }));

    expect(notes.updateNote).toHaveBeenCalledWith(5, 1, "Prefers almond", auth);
    expect(await screen.findByText("Prefers almond")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit note")).not.toBeInTheDocument();
  });

  it("needs a second click to delete a note", async () => {
    vi.mocked(notes.deleteNote).mockResolvedValue(undefined);
    const user = await setup();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(notes.deleteNote).not.toHaveBeenCalled();
    expect(screen.getByText(/delete this note\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(notes.deleteNote).toHaveBeenCalledWith(5, 1, auth);
    await waitFor(() => expect(screen.queryByText("Prefers short square")).not.toBeInTheDocument());
  });

  it("shows note text literally, never as HTML", async () => {
    const evil = "<img src=x onerror=alert(1)>";
    vi.mocked(notes.fetchNotes).mockResolvedValue([note({ note: evil })]);
    await setup();
    expect(screen.getByText(evil)).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("says notes are unavailable when the backend returns 404", async () => {
    vi.mocked(notes.fetchNotes).mockRejectedValue(new ApiError("Not found", 404));
    render(<AS_ClientNotesPanel clientUserId={5} tokenFetcher={async () => "tok"} clerkId="admin_1" />);
    expect(await screen.findByText(/notes aren't available yet/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("New note")).not.toBeInTheDocument();
  });

  it("shows a message when saving fails", async () => {
    vi.mocked(notes.saveNextSteps).mockRejectedValue(new Error("Server down"));
    const user = await setup();
    await user.type(screen.getByLabelText("Next steps"), " more");
    await user.click(screen.getByRole("button", { name: "Save next steps" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Server down");
  });
});
