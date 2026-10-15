// The admin bell: the unread count, the list of new bookings (opening it marks them read), where
// each leads, and a toast when a new one arrives while a screen is open.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationBell from "@/components/features/admin/shell/NotificationBell";
import { ToastProvider } from "@/components/molecules";
import { adminKeys } from "@/lib/adminQueries";
import { notificationAge, notificationLine, notificationLink } from "@/lib/admin/notifications";
import type { AdminNotification } from "@/services/notificationService";

vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok", isLoaded: true };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});

const note = (id: number, change: Partial<AdminNotification> = {}): AdminNotification => ({
  id,
  kind: "booking_paid",
  appointment_id: 100 + id,
  client_user_id: 7,
  client_name: "Ana Cruz",
  service_name: "Gel manicure",
  nailist_name: "Maxine",
  appointment_date: "2026-10-20",
  appointment_time: "2:00 PM",
  created_at: "2026-10-14 01:00:00",
  unread: true,
  ...change,
});

let answer: { unread: number; notifications: AdminNotification[] };
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => ({
  ok: true,
  json: async () => (String(url).endsWith("/notifications/read") ? { success: true } : answer),
  init,
}));

let client: QueryClient;
const view = () =>
  render(<NotificationBell />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    ),
  });

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  answer = {
    unread: 2,
    notifications: [note(2, { kind: "proof_uploaded", client_name: "Bea Lim" }), note(1)],
  };
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("NotificationBell", () => {
  it("shows how many are new, and lists them, marked new, once opened", async () => {
    view();
    const bell = await screen.findByRole("button", { name: "Notifications, 2 new" });
    expect(within(bell).getByText("2")).toBeInTheDocument();

    fireEvent.click(bell);
    const list = within(screen.getByRole("region", { name: "New bookings" }));
    expect(list.getByText("Payment proof to review")).toBeInTheDocument();
    expect(list.getByText("Booking paid")).toBeInTheDocument();
    expect(list.getAllByText("New")).toHaveLength(2);
    expect(list.getByText("Bea Lim · Gel manicure with Maxine · Oct 20, 2:00 PM")).toBeInTheDocument();

    // A proof opens the proofs to review, a paid booking its client's page
    const links = list.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/clients?status=PROOF_PENDING");
    expect(links[1]).toHaveAttribute("href", "/clients/7");
  });

  it("marks them read for this admin when opened", async () => {
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 2 new" }));
    await waitFor(() => {
      const read = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/notifications/read"));
      expect(read?.[1]?.body).toBe(JSON.stringify({ upTo: 2 }));
    });
    // The count is gone at once
    expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("closes on Escape and on a click outside", async () => {
    view();
    const bell = await screen.findByRole("button", { name: /Notifications/ });
    fireEvent.click(bell);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "New bookings" })).toBeNull();
    fireEvent.click(bell);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("region", { name: "New bookings" })).toBeNull();
  });

  it("says when there's nothing yet", async () => {
    answer = { unread: 0, notifications: [] };
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    expect(screen.getByText(/Nothing yet/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/notifications/read"))).toBe(false);
  });

  it("announces a booking that arrives while the screen is open, but not the ones already there", async () => {
    view();
    await screen.findByRole("button", { name: "Notifications, 2 new" });
    expect(screen.queryByText("Booking paid")).toBeNull();

    answer = { unread: 3, notifications: [note(3, { client_name: "Cara Diaz" }), ...answer.notifications] };
    await act(() => client.invalidateQueries({ queryKey: adminKeys.notifications() }));
    expect(await screen.findByText("Booking paid")).toBeInTheDocument();
    expect(screen.getByText("Cara Diaz · Gel manicure with Maxine · Oct 20, 2:00 PM")).toBeInTheDocument();
  });
});

describe("notification wording", () => {
  it("says what it can when details are missing", () => {
    expect(notificationLine(note(1, { client_name: "", nailist_name: "", appointment_time: "" }))).toBe("A client · Gel manicure · Oct 20");
  });

  it("opens the proofs to review when the booking has no client page", () => {
    expect(notificationLink(note(1, { client_user_id: null }))).toBe("/clients?status=PROOF_PENDING");
  });

  it("tells how long ago it came", () => {
    const now = Date.parse("2026-10-14T01:00:00Z");
    expect(notificationAge("2026-10-14 01:00:20", now + 20_000)).toBe("just now");
    expect(notificationAge("2026-10-14 01:00:00", now + 5 * 60_000)).toBe("5 min ago");
    expect(notificationAge("2026-10-14 01:00:00", now + 3 * 3_600_000)).toBe("3 h ago");
    expect(notificationAge("2026-10-14 01:00:00", now + 26 * 3_600_000)).toBe("yesterday");
    expect(notificationAge("2026-10-14 01:00:00", now + 3 * 86_400_000)).toBe("3 days ago");
  });
});
