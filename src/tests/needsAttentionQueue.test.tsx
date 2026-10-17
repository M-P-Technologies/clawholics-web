import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NeedsAttentionQueue from "@/components/features/admin/dashboard/NeedsAttentionQueue";
import type { AttentionResponse } from "@/services/dashboardTypes";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const item = (over: Partial<AttentionResponse["items"][number]>): AttentionResponse["items"][number] => ({
  kind: "confirm", appointment_id: 1, user_id: 11, client_name: "Bea Lim", email: "bea@x.test", service_name: "Gel", nailist_name: "Miss Max",
  appointment_date: "2026-10-26", appointment_time: "13:00-15:00", since: "2026-10-19 04:00:00", ...over,
});
const answer: AttentionResponse = {
  items: [
    item({ has_screenshot: true }),
    item({ kind: "review", appointment_id: 2, user_id: 12, client_name: "Ana Cruz" }),
    item({ kind: "complete", appointment_id: 3, user_id: null, client_name: "Walk In" }),
    item({ kind: "photos", appointment_id: 4, user_id: 14, client_name: "Cara Uy" }),
    item({ kind: "lead", appointment_id: null, user_id: 15, client_name: "Dee Go", service_name: null, nailist_name: null, appointment_date: null, appointment_time: null }),
  ],
  counts: { confirm: 3, review: 1, complete: 2, photos: 1, leads: 9 },
};

const load = vi.fn();
const renderQueue = () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NeedsAttentionQueue load={load} />
    </QueryClientProvider>,
  );
  return userEvent.setup();
};

beforeEach(() => {
  load.mockReset().mockResolvedValue(answer);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T04:00:00Z"));
});

describe("the dashboard's queue of what to act on", () => {
  it("lists the five most urgent, each with what's needed and its action", async () => {
    renderQueue();
    const queue = within(await screen.findByRole("region", { name: "To act on" }));
    const rows = await queue.findAllByRole("row");
    // a header row, then the five in the server's order
    expect(rows.slice(1).map((r) => within(r).getAllByText(/Confirm booking|Review screenshot|Complete visit|Add photo|Follow up/)[0].textContent)).toEqual([
      "Confirm booking", "Review screenshot", "Complete visit", "Add photo", "Follow up",
    ]);
    const first = within(rows[1]);
    expect(first.getByText("Bea Lim")).toBeInTheDocument();
    expect(first.getByText("Gel · Miss Max")).toBeInTheDocument();
    expect(first.getByText("Screenshot sent")).toBeInTheDocument();
    expect(first.getByText("1 day")).toBeInTheDocument();
    expect(first.getByRole("link", { name: "Confirm Bea Lim's booking" })).toHaveAttribute("href", "/clients/11");
    // A walk-in has no client page: their visit opens the list it's in
    expect(within(rows[3]).getByRole("link", { name: "Complete Walk In's visit" })).toHaveAttribute("href", "/clients?status=TO_COMPLETE");
    expect(within(rows[5]).getByRole("link", { name: "Open Dee Go" })).toHaveAttribute("href", "/clients/15");
  });

  it("switches tabs, asking the server for that tab, with a link to the whole list", async () => {
    const user = renderQueue();
    await screen.findByRole("region", { name: "To act on" });
    await user.click(screen.getByRole("tab", { name: /To complete/ }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith("complete"));
    expect(screen.getByRole("link", { name: "View all (3)" })).toHaveAttribute("href", "/clients?status=TO_COMPLETE");
  });

  it("says when nothing needs attention", async () => {
    load.mockResolvedValue({ items: [], counts: { confirm: 0, review: 0, complete: 0, photos: 0, leads: 0 } });
    renderQueue();
    expect(await screen.findByText("Nothing needs attention right now.")).toBeInTheDocument();
  });
});
