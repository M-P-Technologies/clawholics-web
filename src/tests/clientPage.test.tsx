import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientPage from "@/admin/ClientPage";

const fetchClient = vi.fn();
const fetchNotes = vi.fn();
const addNote = vi.fn();
const deleteNote = vi.fn();
const fetchNextSteps = vi.fn();
const saveNextSteps = vi.fn();
vi.mock("@/services/clientNotesService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/clientNotesService")>()),
  fetchClient: (...a: unknown[]) => fetchClient(...a),
  fetchNotes: (...a: unknown[]) => fetchNotes(...a),
  addNote: (...a: unknown[]) => addNote(...a),
  deleteNote: (...a: unknown[]) => deleteNote(...a),
  fetchNextSteps: (...a: unknown[]) => fetchNextSteps(...a),
  saveNextSteps: (...a: unknown[]) => saveNextSteps(...a),
}));
vi.mock("@/lib/router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/router")>()),
  useParams: () => ({ id: "7" }),
}));
vi.mock("@/components/admin/SideBar", () => ({ default: () => <div /> }));
vi.mock("@/components/ui/ToastProvider", () => ({ useToast: () => ({ show: vi.fn() }) }));
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok" };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});

const auth = { token: "tok", clerkId: "admin_1" };
const details = {
  client: {
    id: 7, clerk_id: "user_ana", email: "ana@x.test", created_at: "2026-06-01 05:00:00", first_name: "Ana", last_name: "Cruz",
    phone: "09171234567", alt_phone: null, preferred_contact_method: "Instagram", facebook_handle: null, instagram_handle: "@ana",
  },
  summary: { visits: 2, totalSpent: 1600, lastVisit: "2026-09-05", nextVisit: "2026-11-02", stamps: 3 },
  appointments: [
    { id: 4, appointment_date: "2026-11-02", appointment_time: "10:00-11:00", service_name: "Gel", nailist_name: "Maxine", status: "CONFIRMED", price: 800 },
    { id: 2, appointment_date: "2026-09-05", appointment_time: "10:00-11:00", service_name: "Gel", nailist_name: "Maxine", status: "COMPLETED", price: 800 },
  ],
};
const note = (over: object) => ({
  id: 1, client_user_id: 7, appointment_id: null, author_admin_id: 1, author_name: "Max Owner", note: "Prefers mornings",
  created_at: "2026-10-01 05:00:00", updated_at: "2026-10-01 05:00:00", ...over,
});

beforeEach(() => {
  fetchClient.mockReset().mockResolvedValue(details);
  fetchNotes.mockReset().mockResolvedValue([note({}), note({ id: 2, appointment_id: 2, note: "Asked for almond shape" })]);
  addNote.mockReset().mockResolvedValue(note({ id: 3 }));
  deleteNote.mockReset().mockResolvedValue(undefined);
  fetchNextSteps.mockReset().mockResolvedValue({ client_user_id: 7, text: "Offer a refill", updated_by: 1, updated_at: null });
  saveNextSteps.mockReset().mockResolvedValue({ client_user_id: 7, text: "x" });
});

describe("Client page", () => {
  it("shows the client's profile and summary", async () => {
    render(<ClientPage />);
    expect(await screen.findByRole("heading", { name: "Ana Cruz" })).toBeInTheDocument();
    expect(fetchClient).toHaveBeenCalledWith(7, auth);
    const profile = within(screen.getByRole("region", { name: "Contact" }));
    expect(profile.getByText("ana@x.test")).toBeInTheDocument();
    expect(profile.getByText("09171234567")).toBeInTheDocument();
    expect(profile.getByText("@ana")).toBeInTheDocument();
    expect(profile.getByText("Prefers").nextElementSibling).toHaveTextContent("Instagram");
    const summary = within(screen.getByRole("region", { name: "Summary" }));
    expect(within(summary.getByRole("group", { name: "Visits" })).getByText("2")).toBeInTheDocument();
    expect(within(summary.getByRole("group", { name: "Total spent" })).getByText("₱1,600")).toBeInTheDocument();
    expect(within(summary.getByRole("group", { name: "Loyalty stamps" })).getByText("3")).toBeInTheDocument();
  });

  it("lists every appointment with its own notes, and adds a note to one", async () => {
    render(<ClientPage />);
    const history = within(await screen.findByRole("region", { name: "Appointments" }));
    const sept = within(history.getByRole("row", { name: /Sep 5, 2026/ }));
    expect(sept.getByText("Completed")).toBeInTheDocument();
    expect(sept.getByText("₱800")).toBeInTheDocument();
    expect(history.getByText("Asked for almond shape")).toBeInTheDocument();

    fireEvent.click(sept.getByRole("button", { name: "Add a note" }));
    fireEvent.change(history.getByLabelText("Note about Sep 5, 2026"), { target: { value: "Loved the colour" } });
    fireEvent.click(history.getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(addNote).toHaveBeenCalledWith(7, "Loved the colour", auth, 2));
  });

  it("keeps general notes apart from appointment notes, and adds one", async () => {
    render(<ClientPage />);
    const general = within(await screen.findByRole("region", { name: "Notes" }));
    expect(general.getByText("Prefers mornings")).toBeInTheDocument();
    expect(general.queryByText("Asked for almond shape")).toBeNull();
    expect(general.getByText(/Max Owner/)).toBeInTheDocument();
    fireEvent.change(general.getByLabelText("New note"), { target: { value: "Allergic to acetone" } });
    fireEvent.click(general.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(addNote).toHaveBeenCalledWith(7, "Allergic to acetone", auth));
  });

  it("saves the next steps", async () => {
    render(<ClientPage />);
    const steps = within(await screen.findByRole("region", { name: "Next steps" }));
    const field = steps.getByLabelText("Next steps");
    await waitFor(() => expect(field).toHaveValue("Offer a refill"));
    fireEvent.change(field, { target: { value: "Book a lash fill" } });
    fireEvent.click(steps.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(saveNextSteps).toHaveBeenCalledWith(7, "Book a lash fill", auth));
  });

  it("says so when the client can't be found", async () => {
    fetchClient.mockRejectedValue(Object.assign(new Error("Client not found"), { status: 404 }));
    render(<ClientPage />);
    expect(await screen.findByText("We couldn't find this client")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to clients" })).toHaveAttribute("href", "/client-directory");
  });
});
