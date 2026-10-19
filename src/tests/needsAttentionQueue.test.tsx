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
  kind: "review", appointment_id: 1, user_id: 11, client_name: "Bea Lim", email: "bea@x.test", service_name: "Gel", nailist_name: "Miss Max",
  appointment_date: "2026-10-26", appointment_time: "13:00-15:00", since: "2026-10-19 04:00:00", ...over,
});
const answer: AttentionResponse = {
  items: [
    item({}),
    item({ kind: "review", appointment_id: 2, user_id: 12, client_name: "Ana Cruz" }),
    item({ kind: "complete", appointment_id: 3, user_id: null, client_name: "Walk In" }),
    item({ kind: "photos", appointment_id: 4, user_id: 14, client_name: "Cara Uy" }),
    item({ kind: "lead", appointment_id: null, user_id: 15, client_name: "Dee Go", service_name: null, nailist_name: null, appointment_date: null, appointment_time: null }),
  ],
  counts: { review: 2, complete: 2, photos: 1, leads: 9 },
  total: 5, page: 1, pageSize: 5,
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
    expect(rows.slice(1).map((r) => within(r).getAllByText(/Review screenshot|Complete visit|Add photo|Follow up/)[0].textContent)).toEqual([
      "Review screenshot", "Review screenshot", "Complete visit", "Add photo", "Follow up",
    ]);
    const first = within(rows[1]);
    expect(first.getByText("Bea Lim")).toBeInTheDocument();
    expect(first.getByText("Gel · Miss Max")).toBeInTheDocument();
    expect(first.getByText("1 day")).toBeInTheDocument();
    expect(first.getByRole("link", { name: "Review Bea Lim's screenshot" })).toHaveAttribute("href", "/clients/11");
    // A walk-in has no client page: their visit opens the list it's in
    expect(within(rows[3]).getByRole("link", { name: "Complete Walk In's visit" })).toHaveAttribute("href", "/clients?status=TO_COMPLETE");
    expect(within(rows[5]).getByRole("link", { name: "Open Dee Go" })).toHaveAttribute("href", "/clients/15");
  });

  it("asks the server for a page of as many rows as it's given room for", async () => {
    load.mockResolvedValue({ ...answer, items: answer.items.slice(0, 3), total: 5, pageSize: 3 });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <NeedsAttentionQueue load={load} rows={3} />
      </QueryClientProvider>,
    );
    const queue = within(await screen.findByRole("region", { name: "To act on" }));
    expect((await queue.findAllByRole("row")).slice(1)).toHaveLength(3);
    expect(load).toHaveBeenCalledWith({ tab: "all", page: 1, pageSize: 3 });
  });

  it("pages through the queue, a page from the server at a time, fetching the next ahead", async () => {
    const pageOf = (page: number) => ({ ...answer, items: page === 1 ? answer.items : [item({ kind: "lead", appointment_id: null, user_id: 20, client_name: "Eve On" })], total: 6, page });
    load.mockImplementation(async ({ page }: { page: number }) => pageOf(page));
    const user = renderQueue();
    const queue = within(await screen.findByRole("region", { name: "To act on" }));
    expect(await queue.findByText("Showing 1–5 of 6")).toBeInTheDocument();
    // The next page is fetched before it's asked for
    await waitFor(() => expect(load).toHaveBeenCalledWith({ tab: "all", page: 2, pageSize: 5 }));
    await user.click(queue.getByRole("button", { name: "Page 2" }));
    expect(await queue.findByText("Eve On")).toBeInTheDocument();
    expect(queue.getByText("Showing 6–6 of 6")).toBeInTheDocument();
    expect(queue.queryByText("Bea Lim")).toBeNull();
  });

  it("goes back a page when acting on the last page's rows leaves fewer pages, and stays there", async () => {
    let total = 6;
    load.mockImplementation(async ({ page }: { page: number }) =>
      page === 1 ? { ...answer, total } : { ...answer, items: total > 5 ? [item({ kind: "lead", appointment_id: null, user_id: 20, client_name: "Eve On" })] : [], total, page },
    );
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <NeedsAttentionQueue load={load} />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();
    const queue = within(await screen.findByRole("region", { name: "To act on" }));
    await user.click(await queue.findByRole("button", { name: "Page 2" }));
    expect(await queue.findByText("Eve On")).toBeInTheDocument();
    // Eve's lead is dealt with: one page left
    total = 5;
    await client.invalidateQueries();
    expect(await queue.findByText("Bea Lim")).toBeInTheDocument();
    // (the first page's cached copy shows until its own refresh comes back)
    await waitFor(() => expect(queue.queryByRole("navigation", { name: "Pages" })).toBeNull());
    // A new one comes in: still on the first page
    total = 6;
    await client.invalidateQueries();
    expect(await queue.findByText("Showing 1–5 of 6")).toBeInTheDocument();
    expect(queue.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
  });

  it("has no pager when everything fits on one page", async () => {
    renderQueue();
    const queue = within(await screen.findByRole("region", { name: "To act on" }));
    await queue.findByText("Bea Lim");
    expect(queue.queryByRole("navigation", { name: "Pages" })).toBeNull();
  });

  it("switches tabs, asking the server for that tab, with a link to the whole list", async () => {
    const user = renderQueue();
    await screen.findByRole("region", { name: "To act on" });
    await user.click(screen.getByRole("tab", { name: /To complete/ }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith({ tab: "complete", page: 1, pageSize: 5 }));
    expect(screen.getByRole("link", { name: "View all (3)" })).toHaveAttribute("href", "/clients?status=TO_COMPLETE");
  });

  it("keeps only the proofs to review under To confirm, with a link to them", async () => {
    const user = renderQueue();
    await screen.findByRole("region", { name: "To act on" });
    await user.click(screen.getByRole("tab", { name: /To confirm/ }));
    await waitFor(() => expect(load).toHaveBeenLastCalledWith({ tab: "confirm", page: 1, pageSize: 5 }));
    expect(screen.getByRole("link", { name: "View all (2)" })).toHaveAttribute("href", "/clients?status=PROOF_PENDING");
    expect(screen.queryByText("Confirm booking")).toBeNull();
  });

  it("says when nothing needs attention", async () => {
    load.mockResolvedValue({ items: [], counts: { review: 0, complete: 0, photos: 0, leads: 0 }, total: 0, page: 1, pageSize: 5 });
    renderQueue();
    expect(await screen.findByText("Nothing needs attention right now.")).toBeInTheDocument();
  });
});
