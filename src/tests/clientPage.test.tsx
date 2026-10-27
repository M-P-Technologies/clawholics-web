import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientPage from "@/app/(admin)/clients/[id]/page";

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
const setReviewApproval = vi.fn();
vi.mock("@/services/reviewService", () => ({ setReviewApproval: (...a: unknown[]) => setReviewApproval(...a) }));
vi.mock("@/lib/router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/router")>()),
  useParams: () => ({ id: "7" }),
}));
vi.mock("@/components/features/admin/shell/SideBar", () => ({ default: () => <div /> }));
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show: vi.fn() }) }));
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
    { id: 2, appointment_date: "2026-09-05", appointment_time: "10:00-11:00", service_name: "Gel", nailist_name: "Maxine", status: "COMPLETED", price: 800,
      review_id: 9, review_approved: 0, review_rating: 5, review_comment: "Best set yet", review_photo_url: "https://images.test/reviews/a.webp" },
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
  setReviewApproval.mockReset().mockResolvedValue({ id: 9, appointment_id: 2, approved: 1 });
});

const openTab = async (name: RegExp | string) => {
  fireEvent.click(await screen.findByRole("tab", { name }));
  return within(screen.getByRole("tabpanel"));
};

describe("Client page", () => {
  it("keeps the client's name out of the top bar, and goes back to the clients with a round button", async () => {
    render(<ClientPage />);
    await screen.findByRole("complementary", { name: "Client profile" });
    // The name is only in the profile panel; the top bar says "Client" and has the back button
    expect(screen.getAllByRole("heading", { name: "Ana Cruz" })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Client" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to clients" })).toHaveAttribute("href", "/clients");
  });

  it("shows the profile on the left, and the overview tab first", async () => {
    render(<ClientPage />);
    const profile = within(await screen.findByRole("complementary", { name: "Client profile" }));
    expect(fetchClient).toHaveBeenCalledWith(7, auth);
    expect(profile.getByRole("heading", { name: "Ana Cruz" })).toBeInTheDocument();
    expect(profile.getByText("Client")).toBeInTheDocument();
    expect(profile.getByText("3 stamps")).toBeInTheDocument();
    expect(profile.getByText("ana@x.test")).toBeInTheDocument();
    expect(profile.getByText("09171234567")).toBeInTheDocument();
    expect(profile.getByText("@ana")).toBeInTheDocument();
    expect(profile.getByText("Prefers").nextElementSibling).toHaveTextContent("Instagram");
    // The next visit, highlighted, and the last and next visits with the client info
    expect(profile.getAllByText("Nov 2, 2026").length).toBe(2);
    expect(profile.getByText("Last visit").nextElementSibling).toHaveTextContent("Sep 5, 2026");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    const overview = within(screen.getByRole("tabpanel"));
    expect(within(overview.getByRole("group", { name: "Visits" })).getByText("2")).toBeInTheDocument();
    expect(within(overview.getByRole("group", { name: "Total spent" })).getByText("₱1,600")).toBeInTheDocument();
    expect(within(overview.getByRole("group", { name: "Loyalty stamps" })).getByText("3 / 10")).toBeInTheDocument();
  });

  it("tracks the current booking from booking to the visit", async () => {
    render(<ClientPage />);
    const progress = within(await screen.findByRole("list", { name: "Booking progress" }));
    const steps = progress.getAllByRole("listitem");
    expect(steps.map((li) => li.querySelector("p")?.textContent?.split(":")[0])).toEqual(["Booked", "Downpayment", "Confirmed", "Completed"]);
    // The Nov 2 booking is confirmed: everything up to the visit is done, the visit is next
    expect(steps[2]).toHaveTextContent("Booked for Nov 2, 2026");
    expect(steps[3]).toHaveAttribute("aria-current", "step");
  });

  it("keeps a visit's notes behind a link that opens them in a window, where a note is added", async () => {
    render(<ClientPage />);
    const history = await openTab(/Appointments/);
    const sept = within(history.getByRole("row", { name: /Sep 5, 2026/ }));
    expect(sept.getByText("Completed")).toBeInTheDocument();
    expect(sept.getByText("₱800")).toBeInTheDocument();
    // Not laid out under the row
    expect(history.queryByText("Asked for almond shape")).toBeNull();

    fireEvent.click(sept.getByRole("button", { name: "Notes (1)" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Notes · Sep 5, 2026" }));
    expect(dialog.getByText("Asked for almond shape")).toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText("Note about Sep 5, 2026"), { target: { value: "Loved the colour" } });
    fireEvent.click(dialog.getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(addNote).toHaveBeenCalledWith(7, "Loved the colour", auth, 2));
    // A visit without notes says Add a note
    expect(within(history.getByRole("row", { name: /Nov 2, 2026/ })).getByRole("button", { name: "Add a note" })).toBeInTheDocument();
  });

  it("offers Add photo for a completed visit without one, opening the upload window", async () => {
    fetchClient.mockResolvedValue({
      ...details,
      appointments: [
        { id: 5, appointment_date: "2026-10-01", appointment_time: "10:00-11:00", service_name: "Gel", nailist_name: "Maxine", status: "COMPLETED", price: 800,
          completion: { balance_amount: 300, payment_method: "Cash", nailist_id: 1, nailist_name: "Maxine", photos_added: 0, photo_url: null } },
      ],
    });
    render(<ClientPage />);
    const history = await openTab(/Appointments/);
    fireEvent.click(within(history.getByRole("row", { name: /Oct 1, 2026/ })).getByRole("button", { name: "Add photo" }));
    expect(await screen.findByRole("dialog", { name: "Add a visit photo" })).toBeInTheDocument();
  });

  it("shows a visit's review and opens its photo", async () => {
    render(<ClientPage />);
    const history = await openTab(/Appointments/);
    expect(history.getByRole("columnheader", { name: "Review" })).toBeInTheDocument();
    expect(history.getByRole("columnheader", { name: "Photo" })).toBeInTheDocument();
    const sept = within(history.getByRole("row", { name: /Sep 5, 2026/ }));
    expect(sept.getByRole("img", { name: "5 out of 5 stars" })).toBeInTheDocument();
    expect(sept.getByText("Best set yet")).toBeInTheDocument();
    // The visit still to come has no review
    expect(within(history.getByRole("row", { name: /Nov 2, 2026/ })).queryByRole("button", { name: "View review photo" })).toBeNull();
    fireEvent.click(sept.getByRole("button", { name: "View review photo" }));
    expect(await screen.findByRole("img", { name: "Preview" })).toHaveAttribute("src", "https://images.test/reviews/a.webp");
  });

  it("approves a review for the home page, and takes it off again", async () => {
    render(<ClientPage />);
    const history = await openTab(/Appointments/);
    const sept = () => within(history.getByRole("row", { name: /Sep 5, 2026/ }));
    expect(sept().getByText("Not on the home page")).toBeInTheDocument();
    fireEvent.click(sept().getByRole("button", { name: "Approve for the home page" }));
    await waitFor(() => expect(setReviewApproval).toHaveBeenCalledWith(9, true, auth));
    expect(await history.findByText("On the home page")).toBeInTheDocument();
    fireEvent.click(sept().getByRole("button", { name: "Take it off" }));
    await waitFor(() => expect(setReviewApproval).toHaveBeenCalledWith(9, false, auth));
    expect(await history.findByText("Not on the home page")).toBeInTheDocument();
  });

  it("shows every note on the notes tab, saying which visit one is about, and adds one", async () => {
    render(<ClientPage />);
    const tab = await openTab(/Notes & next steps/);
    const notes = within(tab.getByRole("region", { name: "Notes" }));
    expect(notes.getByText("Prefers mornings")).toBeInTheDocument();
    expect(notes.getByText("Asked for almond shape")).toBeInTheDocument();
    expect(notes.getByText("About the Sep 5, 2026 visit (Gel)")).toBeInTheDocument();
    expect(notes.getAllByText("Max Owner").length).toBeGreaterThan(0);
    fireEvent.change(notes.getByLabelText("New note"), { target: { value: "Allergic to acetone" } });
    fireEvent.click(notes.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(addNote).toHaveBeenCalledWith(7, "Allergic to acetone", auth));
  });

  it("saves the next steps", async () => {
    render(<ClientPage />);
    const tab = await openTab(/Notes & next steps/);
    const steps = within(tab.getByRole("region", { name: "Next steps" }));
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
    expect(screen.getByRole("link", { name: "Back to clients" })).toHaveAttribute("href", "/clients");
  });
});
