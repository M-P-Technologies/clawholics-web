import clsx from "clsx";
import { Link } from "@/lib/router";
import { ATTENTION_ROWS, ATTENTION_TABS, attentionKind, attentionLink, attentionViewAll, waitingLabel } from "@/lib/admin/attention";
import { dateLabel } from "@/lib/admin/clientPage";
import { timeRangeLabel } from "@/lib/timeFormat";
import { useTableLayout } from "@/hooks/useMinWidth";
import { QUEUE_ROW } from "@/hooks/admin/useQueueRows";
import { useAttentionQueue, type AttentionLoader } from "@/hooks/admin/useAttentionQueue";
import type { AttentionResponse, AttentionTab } from "@/services/dashboardTypes";
import { Card } from "@/components/atoms";
import { Pagination, SectionHeader, SegmentedControl, pageView } from "@/components/molecules";
import { CardFields, RowCard, RowCards, TableFrame } from "@/components/organisms";
import { ListSkeleton } from "@/components/features/admin/skeletons/ListSkeleton";

type Item = AttentionResponse["items"][number];
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

// The dashboard's queue: the things most worth acting on now, a page of `rows` at a time (five unless
// the dashboard fits more beside its notes), one row each with its action.
// Proofs to review first, then visits to complete (the latest first), visit photos to add, then warm leads.
export default function NeedsAttentionQueue({ load, rows = ATTENTION_ROWS }: { load: AttentionLoader; rows?: number }) {
  const { tab, setTab, setPage, data, stale, failed, pageFailed } = useAttentionQueue(load, rows);
  const asTable = useTableLayout();
  const items = data?.items ?? [];
  // Numbered by the rows shown, which are the page before while the next one loads
  const pager = data ? pageView(items, data.page, data.pageSize, data.total) : null;
  const viewAll = data ? attentionViewAll(tab, data.counts) : null;
  const now = Date.now();

  const client = (item: Item) => (
    <span className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-sm text-berry">
        {initials(item.client_name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-bold">{item.client_name}</span>
        {item.email && <span className="block truncate text-xs text-gray-red">{item.email}</span>}
      </span>
    </span>
  );
  const need = (item: Item) => (
    <span className="flex flex-col items-start gap-1">
      <span className={clsx("whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold", attentionKind(item.kind).tone)}>{attentionKind(item.kind).need}</span>
    </span>
  );
  const booking = (item: Item) =>
    item.service_name ? (
      <span className="block min-w-0">
        <span className="block truncate">{[item.service_name, item.nailist_name].filter(Boolean).join(" · ")}</span>
        {item.appointment_date && (
          <span className="block text-xs text-gray-red">{[dateLabel(item.appointment_date), timeRangeLabel(item.appointment_time)].filter(Boolean).join(", ")}</span>
        )}
      </span>
    ) : (
      <span className="text-gray-red">Signed up, no booking yet</span>
    );
  const action = (item: Item) => (
    <Link
      to={attentionLink(item)}
      aria-label={attentionKind(item.kind).actionName(item.client_name)}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-berry px-3 py-1.5 text-[13px] font-bold text-pearl transition-colors hover:bg-gray-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
    >
      {attentionKind(item.kind).action}
    </Link>
  );

  return (
    <Card as="section" aria-label="To act on" aria-busy={stale} className="flex min-w-0 flex-col gap-3">
      {/* The title and the tabs share a row, at either end; the tabs wrap under it when it's narrow */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader size="card" title="To act on" />
        <SegmentedControl label="What to show" options={ATTENTION_TABS} value={tab} onChange={(value) => setTab(value as AttentionTab)} />
      </div>

      {failed ? (
        <p className="text-sm text-gray-red">We couldn&apos;t load what needs attention.</p>
      ) : !data ? (
        <ListSkeleton label="Loading what needs attention" columns={5} />
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-red">Nothing needs attention right now.</p>
      ) : asTable ? (
        <TableFrame
          label="To act on"
          minWidthClass="min-w-200"
          head={
            <tr className="text-left text-xs text-gray-red">
              {["Client", "What's needed", "Booking", "Waiting", ""].map((h, i) => (
                <th key={h || i} scope="col" className={clsx("pb-2 pr-3 font-medium", i === 4 && "pr-0 text-center")}>
                  {h || <span className="sr-only">Action</span>}
                </th>
              ))}
            </tr>
          }
        >
          {items.map((item) => {
            const cell = "border-t border-dotted border-crimson-light py-3 pr-3 align-middle";
            return (
              <tr key={`${item.kind}-${item.appointment_id ?? item.user_id}`} {...{ [QUEUE_ROW]: "" }}>
                <th scope="row" className={clsx(cell, "max-w-60 text-left font-normal")}>{client(item)}</th>
                <td className={cell}>{need(item)}</td>
                <td className={clsx(cell, "max-w-64")}>{booking(item)}</td>
                <td className={clsx(cell, "whitespace-nowrap")}>{waitingLabel(item.since, now)}</td>
                <td className={clsx(cell, "pr-0 text-center")}>{action(item)}</td>
              </tr>
            );
          })}
        </TableFrame>
      ) : (
        <RowCards label="To act on">
          {items.map((item) => (
            <RowCard key={`${item.kind}-${item.appointment_id ?? item.user_id}`}>
              {client(item)}
              <CardFields
                fields={[
                  ["Needed", need(item)],
                  ["Booking", booking(item)],
                  ["Waiting", waitingLabel(item.since, now)],
                ]}
              />
              <div className="flex justify-end">{action(item)}</div>
            </RowCard>
          ))}
        </RowCards>
      )}

      {pageFailed && <p className="text-sm text-danger-ink">We couldn&apos;t load that page.</p>}

      {pager && items.length > 0 && (
        <Pagination page={pager.current} totalPages={pager.pages} onPageChange={setPage} summary={pager.pages > 1 ? pager : undefined} />
      )}

      {viewAll && viewAll.count > 0 && (
        <Link to={viewAll.to} className="self-start text-[13px] font-bold text-berry underline decoration-crimson-light underline-offset-4">
          {`View all (${viewAll.count})`}
        </Link>
      )}
    </Card>
  );
}
