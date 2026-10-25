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
import { playChime, showDesktopAlert } from "@/lib/admin/bookingAlerts";

vi.mock("@/lib/admin/bookingAlerts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin/bookingAlerts")>()),
  playChime: vi.fn(),
  showDesktopAlert: vi.fn(),
}));

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

let answer: { unread: number; notifications: AdminNotification[]; hasMore?: boolean };
// The page older than a notification id, by that id
let olderPages: Record<number, { unread: number; notifications: AdminNotification[]; hasMore: boolean }>;
let profiles: Record<string, { imageUrl: string | null; joinedAt: null; lastSignInAt: null }>;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const before = /[?&]before=(\d+)/.exec(String(url))?.[1];
  const body = String(url).endsWith("/notifications/read")
    ? { success: true }
    : String(url).includes("/directory/profiles")
      ? { profiles }
      : before
        ? olderPages[Number(before)]
        : answer;
  return { ok: true, json: async () => body, init };
});

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
  olderPages = {};
  profiles = {};
  fetchMock.mockClear();
  vi.mocked(playChime).mockClear();
  vi.mocked(showDesktopAlert).mockClear();
  window.localStorage.clear();
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
    expect(list.getByText("New booking paid")).toBeInTheDocument();
    expect(list.getAllByText("New")).toHaveLength(2);
    // Who and what, with the visit's date and time on the line below
    expect(list.getByText("Bea Lim · Gel manicure with Maxine")).toBeInTheDocument();
    expect(list.getAllByText("Oct 20, 2:00 PM")).toHaveLength(2);

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
    expect(screen.queryByText("New booking paid")).toBeNull();

    answer = { unread: 3, notifications: [note(3, { client_name: "Cara Diaz" }), ...answer.notifications] };
    await act(() => client.invalidateQueries({ queryKey: adminKeys.notifications() }));
    expect(await screen.findByText("New booking paid")).toBeInTheDocument();
    expect(screen.getByText("Cara Diaz · Gel manicure with Maxine · Oct 20, 2:00 PM")).toBeInTheDocument();
  });
});

describe("NotificationBell pages", () => {
  const page = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, i) => note(from - i, { client_name: `Client ${from - i}` }));
  const asked = () => fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => /\/notifications(\?|$)/.test(url));

  beforeEach(() => {
    answer = { unread: 7, notifications: page(12, 8), hasMore: true };
    olderPages = { 8: { unread: 7, notifications: page(7, 3), hasMore: true }, 3: { unread: 7, notifications: page(2, 1), hasMore: false } };
  });

  it("shows the newest 5, and the next 5 only once the list is scrolled to its end", async () => {
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 7 new" }));
    const region = within(screen.getByRole("region", { name: "New bookings" }));
    expect(region.getAllByRole("link")).toHaveLength(5);
    expect(asked().some((url) => url.includes("before="))).toBe(false);

    // Scrolled, but not near the end yet: nothing more
    const list = region.getByRole("list");
    Object.defineProperties(list, { scrollHeight: { value: 600, configurable: true }, clientHeight: { value: 288, configurable: true } });
    list.scrollTop = 100;
    fireEvent.scroll(list);
    expect(asked().some((url) => url.includes("before="))).toBe(false);

    list.scrollTop = 300;
    fireEvent.scroll(list);
    await waitFor(() => expect(region.getAllByRole("link")).toHaveLength(10));
    expect(asked().some((url) => url.endsWith("before=8"))).toBe(true);
    expect(region.getByText("Client 3", { exact: false })).toBeInTheDocument();
  });

  it("keeps the older unread ones marked new, and loads the rest with Show older, until there are none", async () => {
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 7 new" }));
    const region = within(screen.getByRole("region", { name: "New bookings" }));
    fireEvent.click(region.getByRole("button", { name: "Show older" }));
    await waitFor(() => expect(region.getAllByRole("link")).toHaveLength(10));
    // 7 were unread when opened: 12 to 6
    expect(region.getAllByText("New")).toHaveLength(7);

    fireEvent.click(region.getByRole("button", { name: "Show older" }));
    await waitFor(() => expect(region.getAllByRole("link")).toHaveLength(12));
    expect(region.queryByRole("button", { name: "Show older" })).toBeNull();
  });

  it("goes back to the newest 5 when closed", async () => {
    view();
    const bell = await screen.findByRole("button", { name: "Notifications, 7 new" });
    fireEvent.click(bell);
    fireEvent.click(screen.getByRole("button", { name: "Show older" }));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(10));
    fireEvent.keyDown(document, { key: "Escape" });
    // The trim waits for any page still on its way to be stopped
    await waitFor(() => expect(client.getQueryData<{ pages: unknown[] }>(adminKeys.notifications())?.pages).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(within(screen.getByRole("region", { name: "New bookings" })).getAllByRole("link")).toHaveLength(5);
  });

  it("counts a burst bigger than the page from the unread count", async () => {
    answer = { unread: 0, notifications: page(12, 8), hasMore: true };
    view();
    // The first answer is in (the bell reads "Notifications" while loading too)
    await waitFor(() => expect(client.getQueryData(adminKeys.notifications())).toBeDefined());
    answer = { unread: 8, notifications: page(20, 16), hasMore: true };
    await act(() => client.invalidateQueries({ queryKey: adminKeys.notifications() }));
    expect(await screen.findByText("8 new bookings")).toBeInTheDocument();
  });

  it("shows each client's photo, or their initials without one", async () => {
    answer = { unread: 0, notifications: [note(2, { client_clerk_id: "user_bea", client_name: "Bea Lim" }), note(1, { client_clerk_id: null, client_name: "Ana Cruz" })] };
    profiles = { user_bea: { imageUrl: "https://img.clerk.test/bea.png", joinedAt: null, lastSignInAt: null } };
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications" }));
    const region = screen.getByRole("region", { name: "New bookings" });
    await waitFor(() => expect(region.querySelector('img[src="https://img.clerk.test/bea.png"]')).not.toBeNull());
    expect(within(region).getByText("AC")).toBeInTheDocument();
  });
});

describe("NotificationBell alerts", () => {
  const arrive = async () => {
    answer = { unread: 3, notifications: [note(3, { client_name: "Cara Diaz" }), ...answer.notifications] };
    await act(() => client.invalidateQueries({ queryKey: adminKeys.notifications() }));
    await screen.findByText("New booking paid");
  };

  it("plays a chime for a new booking, unless the sound is turned off", async () => {
    view();
    await screen.findByRole("button", { name: "Notifications, 2 new" });
    expect(playChime).not.toHaveBeenCalled();
    await arrive();
    expect(playChime).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    const sound = screen.getByRole("button", { name: "Sound: on" });
    fireEvent.click(sound);
    expect(sound).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem("clawholics.admin.alertSound")).toBe("0");
  });

  it("keeps the sound off when it was turned off before", async () => {
    window.localStorage.setItem("clawholics.admin.alertSound", "0");
    view();
    await screen.findByRole("button", { name: "Notifications, 2 new" });
    await arrive();
    expect(playChime).not.toHaveBeenCalled();
  });

  it("shows a desktop notification while the tab is in the background, once allowed", async () => {
    const requestPermission = vi.fn(async () => "granted" as NotificationPermission);
    vi.stubGlobal("Notification", Object.assign(vi.fn(), { permission: "default", requestPermission }));
    view();
    fireEvent.click(await screen.findByRole("button", { name: "Notifications, 2 new" }));
    fireEvent.click(screen.getByRole("button", { name: "Desktop alerts: off" }));
    expect(await screen.findByRole("button", { name: "Desktop alerts: on" })).toBeInTheDocument();
    expect(requestPermission).toHaveBeenCalled();

    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await arrive();
    expect(showDesktopAlert).toHaveBeenCalledWith("New booking paid", expect.stringContaining("Cara Diaz"), "booking-3", expect.any(Function));
    visibility.mockRestore();
  });
});

describe("notification wording", () => {
  it("says what it can when details are missing", () => {
    expect(notificationLine(note(1, { client_name: "", nailist_name: "", appointment_time: "" }))).toBe("A client · Gel manicure · Oct 20");
  });

  it("opens the client's page for a paid booking, or the confirmed bookings for a walk-in", () => {
    expect(notificationLink(note(1))).toBe("/clients/7");
    expect(notificationLink(note(1, { client_user_id: null }))).toBe("/clients?status=CONFIRMED");
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
