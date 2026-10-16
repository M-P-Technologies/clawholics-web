import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppointmentsTable, { parseStatusParam } from "@/components/features/admin/bookings/AppointmentsTable";
import type { Appointment } from "@/services/appointmentService";
import { pageOf } from "./fakeAppointmentPages";
import type { AppointmentPageParams } from "@/services/appointmentService";

let params = new URLSearchParams();
vi.mock("@/lib/router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/router")>()),
  useSearchParams: () => [params] as const,
}));
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok" };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});
const show = vi.fn();
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show }) }));
vi.mock("@/hooks/usePolling", () => ({ usePolling: () => {} }));
vi.mock("@/components/features/admin/bookings/AppointmentDetailsModal", async () => {
  const { Dialog } = await import("@/components/organisms");
  return {
    default: ({ appointment, onClose, onStatusChange }: { appointment: Appointment; onClose: () => void; onStatusChange: (id: number, s: string) => void }) => (
      <Dialog open onClose={onClose} title="Appointment details" placement="drawer">
        Details of #{appointment.id}
        <button onClick={() => onStatusChange(appointment.id, "CONFIRMED")}>Set confirmed</button>
      </Dialog>
    ),
  };
});
vi.mock("@/components/features/admin/bookings/CreateAppointmentDialog", () => ({ default: () => <div role="dialog" aria-label="New appointment" /> }));

const fetchAppointments = vi.fn();
// The paged list, answered from fetchAppointments' appointments the way the server would
const fetchAppointmentPage = vi.fn(async (params: AppointmentPageParams) => pageOf(await fetchAppointments(), params));
const updateAppointmentStatus = vi.fn();
vi.mock("@/services/appointmentService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/appointmentService")>()),
  fetchAppointments: (...a: unknown[]) => fetchAppointments(...a),
  fetchAppointmentPage: (params: AppointmentPageParams) => fetchAppointmentPage(params),
  updateAppointmentStatus: (...a: unknown[]) => updateAppointmentStatus(...a),
}));

const HOUR = 3_600_000;
const appt = (id: number, over: Partial<Appointment> = {}): Appointment => ({
  id, user_id: 100 + id, first_name: `Client${id}`, last_name: "Cruz", email: `c${id}@x.test`,
  service_name: "Gel", nailist_name: "Maxine", appointment_date: "2026-11-20", appointment_time: "10:00-11:00",
  status: "CONFIRMED", proof_due_at: null, latest_proof: null, ...over,
});

beforeEach(() => {
  params = new URLSearchParams();
  show.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json([{ id: 1, name: "Maxine" }, { id: 2, name: "Jun" }])));
  fetchAppointments.mockReset().mockResolvedValue([
    appt(1),
    appt(2, { first_name: "Bea", last_name: "Lim", nailist_name: "Jun", status: "PENDING" }),
    appt(3, { status: "AWAITING_PROOF", proof_due_at: new Date(Date.now() - HOUR).toISOString() }),
    appt(4, { status: "AWAITING_PROOF", proof_due_at: new Date(Date.now() + HOUR).toISOString(), latest_proof: { id: 9, status: "PENDING", image_url: "https://img/p.webp", created_at: "2026-10-09T11:00:00Z" } }),
  ]);
  updateAppointmentStatus.mockReset();
});

const rows = () => within(screen.getByRole("table", { name: "Appointments" })).getAllByRole("row").slice(1);

describe("Appointments table", () => {
  it("lists the appointments like the dashboard's bookings table, with proof badges", async () => {
    render(<AppointmentsTable />);
    expect(await screen.findByRole("table", { name: "Appointments" })).toBeInTheDocument();
    expect(rows()).toHaveLength(4);
    const headers = within(screen.getByRole("table", { name: "Appointments" })).getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Client", "Phone", "Joined", "Last active", "Visits", "Service", "Artist", "Date", "Time", "Proof", "Status", "Manage"]);
    expect(within(rows()[0]).getByText("Nov 20, 2026")).toBeInTheDocument();
    const table = within(screen.getByRole("table", { name: "Appointments" }));
    expect(table.getByText("Proof overdue")).toBeInTheDocument();
    expect(table.getByText("Proof to review")).toBeInTheDocument();
  });

  it("asks the server for one page at a time, with the filters, instead of every appointment", async () => {
    params = new URLSearchParams("status=PROOF_PENDING");
    render(<AppointmentsTable />);
    await waitFor(() => expect(fetchAppointmentPage).toHaveBeenCalled());
    expect(fetchAppointmentPage.mock.calls.at(-1)?.[0]).toMatchObject({
      page: 1,
      pageSize: 5,
      proofToReview: true,
      sort: "upcoming",
      statuses: ["PENDING", "AWAITING_PROOF", "AWAITING_CONFIRMATION", "CONFIRMED", "COMPLETED", "CANCELLED", "REFUNDED"],
    });
  });

  it("shows the error, not the previous filter's rows, when a new filter can't load", async () => {
    render(<AppointmentsTable />);
    await screen.findByRole("table", { name: "Appointments" });
    expect(rows()).toHaveLength(4);
    fetchAppointmentPage.mockRejectedValueOnce(new Error("down"));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: "Cancelled" }));
    expect(await screen.findByText(/couldn't load the appointments/i)).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Appointments" })).toBeNull();
  });

  it("opens on the status in the link, and filters with the status dropdown", async () => {
    params = new URLSearchParams("status=PENDING");
    render(<AppointmentsTable />);
    await screen.findByRole("table", { name: "Appointments" });
    const filter = screen.getByRole("button", { name: "Status" });
    expect(filter).toHaveTextContent("Pending");
    expect(rows()).toHaveLength(1);
    const user = userEvent.setup();
    await user.click(filter);
    await user.click(screen.getByRole("option", { name: "Proofs to review" }));
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText("Proof to review")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.click(screen.getByRole("option", { name: "All statuses" }));
    expect(rows()).toHaveLength(4);
  });


  it("searches by client, service, artist or ID", async () => {
    render(<AppointmentsTable />);
    await screen.findByRole("table", { name: "Appointments" });
    // The search asks the server once typing pauses
    fireEvent.change(screen.getByRole("searchbox", { name: "Search appointments" }), { target: { value: "bea" } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search appointments" }), { target: { value: "#3" } });
    await waitFor(() => expect(within(rows()[0]).getByText("#3")).toBeInTheDocument());
    expect(rows()).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search appointments" }), { target: { value: "nobody" } });
    expect(await screen.findByText("No appointments match your search.")).toBeInTheDocument();
  });

  it("changes a status right in the row", async () => {
    updateAppointmentStatus.mockResolvedValue(appt(2, { first_name: "Bea", last_name: "Lim", status: "CONFIRMED" }));
    render(<AppointmentsTable />);
    await screen.findByRole("table", { name: "Appointments" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Status of appointment #2/ }));
    expect(screen.getByRole("option", { name: "Awaiting proof" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Confirmed" }));
    await waitFor(() => expect(updateAppointmentStatus).toHaveBeenCalledWith(2, "CONFIRMED", "tok", "admin_1"));
    expect(show).toHaveBeenCalledWith("success", "Appointment updated", "Appointment #2 is now confirmed.");
  });

  it("sends Manage to the client's page, and opens a proof to review", async () => {
    render(<AppointmentsTable />);
    await screen.findByRole("table", { name: "Appointments" });
    expect(screen.getByRole("link", { name: "Manage Client1 Cruz's client page" })).toHaveAttribute("href", "/clients/101");
    // The details drawer only opens to review a waiting proof
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Review the payment proof for appointment #4" }));
    expect(screen.getByRole("dialog", { name: "Appointment details" })).toHaveTextContent("Details of #4");
  });

  it("shows the slot-taken alert above the open drawer", async () => {
    updateAppointmentStatus.mockRejectedValue(new Error("SLOT_TAKEN"));
    render(<AppointmentsTable />);
    await screen.findByRole("table", { name: "Appointments" });
    fireEvent.click(screen.getByRole("button", { name: "Review the payment proof for appointment #4" }));
    const drawer = screen.getByRole("dialog", { name: "Appointment details" });
    fireEvent.click(screen.getByRole("button", { name: "Set confirmed" }));
    const alert = await screen.findByRole("alertdialog", { name: "Slot already taken" });
    expect(drawer.compareDocumentPosition(alert.parentElement!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("has no client page link for a walk-in, who has none", async () => {
    fetchAppointments.mockResolvedValue([appt(9, { first_name: "Walk", last_name: "In", email: "walkin-guest@clawholics.local", is_walkin: 1 })]);
    render(<AppointmentsTable />);
    await screen.findByRole("table", { name: "Appointments" });
    expect(screen.queryByRole("link", { name: /client page/ })).toBeNull();
  });


  it("shows five to a page", async () => {
    fetchAppointments.mockResolvedValue(Array.from({ length: 13 }, (_, i) => appt(i + 1)));
    render(<AppointmentsTable />);
    await screen.findByRole("table", { name: "Appointments" });
    expect(rows()).toHaveLength(5);
    expect(screen.getByText("Showing 1–5 of 13")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    await waitFor(() => expect(rows()).toHaveLength(3));
  });
});

describe("Appointments table: the client's details", () => {
  it("shows each client's photo, email, phone, joined, last active and visits, and links to their page", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-12T02:00:00Z"));
    try {
      fetchAppointments.mockResolvedValue([
        appt(1, { user_id: 7, phone: "09171234567" }),
        appt(2, { user_id: 7, status: "COMPLETED" }),
        appt(3, { user_id: 7, status: "COMPLETED" }),
        appt(4, { user_id: 1, first_name: "Walk", last_name: "In", email: "walkin-guest@clawholics.local", is_walkin: 1 }),
      ]);
      const clients = { 7: { imageUrl: "https://img.clerk.com/ana.png", joinedAt: "2026-06-01T00:00:00Z", lastSignInAt: "2026-10-11T02:00:00Z" } };
      render(<AppointmentsTable clients={clients} />);
      await screen.findByRole("table", { name: "Appointments" });
      const first = within(rows().find((r) => within(r).queryByText("09171234567"))!);
      expect(first.getByRole("link", { name: "Client1 Cruz" })).toHaveAttribute("href", "/clients/7");
      expect(first.getByText("c1@x.test")).toBeInTheDocument();
      expect(first.getByText("Jun 2026")).toBeInTheDocument();
      expect(first.getByText("yesterday")).toBeInTheDocument();
      expect(first.getByText("2")).toBeInTheDocument(); // two completed visits
      // The photo is decorative (the name is beside it)
      expect(rows().find((r) => within(r).queryByText("09171234567"))!.querySelector("img")).toHaveAttribute("src", "https://img.clerk.com/ana.png");
      // A walk-in has no client page or account details
      const walkin = within(rows().find((r) => within(r).queryByText("Walk In"))!);
      expect(walkin.queryByRole("link")).toBeNull();
      expect(walkin.getByText("Walk-in")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Appointments on a phone", () => {
  it("has the filters in one row, each opening its options in a bottom drawer", async () => {
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      render(<AppointmentsTable />);
      const cards = await screen.findByRole("list", { name: "Appointments" });
      expect(cards.children).toHaveLength(4);
      const statusButton = screen.getByRole("button", { name: "Status: All statuses" });
      expect(statusButton.parentElement?.className).toContain("grid-cols-3");
      fireEvent.click(statusButton);
      const drawer = within(screen.getByRole("listbox", { name: "Status" }));
      fireEvent.click(drawer.getByRole("button", { name: "Pending" }));
      expect(screen.queryByRole("listbox", { name: "Status" })).toBeNull();
      expect(screen.getByRole("button", { name: "Status: Pending" })).toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole("list", { name: "Appointments" }).children).toHaveLength(1));
    } finally {
      delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });
});

describe("parseStatusParam", () => {
  it("accepts a known status and falls back to All", () => {
    expect(parseStatusParam("PROOF_PENDING")).toBe("PROOF_PENDING");
    expect(parseStatusParam("nope")).toBe("ALL");
    expect(parseStatusParam(null)).toBe("ALL");
  });
});

describe("the payment screenshot column", () => {
  it("shows the latest screenshot as a thumbnail that opens it, or None yet", async () => {
    fetchAppointments.mockResolvedValue([
      appt(1, { status: "AWAITING_CONFIRMATION", latest_proof: { id: 9, status: "PENDING", image_url: "https://img/s.webp", created_at: "2026-10-16T10:00:00Z" } }),
      appt(2),
    ]);
    render(<AppointmentsTable />);
    expect(await screen.findByRole("columnheader", { name: "Proof" })).toBeInTheDocument();
    const thumb = screen.getByRole("button", { name: "View payment screenshot for appointment #1" });
    expect(screen.getAllByText("None yet").length).toBeGreaterThan(0);
    await userEvent.click(thumb);
    expect(await screen.findByRole("img", { name: "Payment screenshot for appointment #1" })).toHaveAttribute("src", "https://img/s.webp");
  });
});

describe("completing visits from the list", () => {
  it("doesn't offer Completed in the status menu: a visit is completed with its form", async () => {
    fetchAppointments.mockResolvedValue([appt(1)]);
    render(<AppointmentsTable />);
    await userEvent.click(await screen.findByRole("button", { name: "Status of appointment #1" }));
    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options).toContain("Confirmed");
    expect(options).not.toContain("Completed");
  });

  it("opens a walk-in's details from Manage, since they have no client page", async () => {
    fetchAppointments.mockResolvedValue([appt(5, { email: "walkin-guest@clawholics.local", first_name: "Walk", last_name: "In" })]);
    render(<AppointmentsTable />);
    await userEvent.click(await screen.findByRole("button", { name: "Open Walk In's appointment #5" }));
    expect(await screen.findByText("Details of #5")).toBeInTheDocument();
  });
});
