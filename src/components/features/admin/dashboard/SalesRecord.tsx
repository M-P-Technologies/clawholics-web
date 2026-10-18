import { useState } from "react";
import { useTableLayout } from "@/hooks/useMinWidth";
import { peso } from "@/lib/dashboardFormat";
import { Link } from "@/lib/router";
import type { DashboardResponse } from "@/services/dashboardTypes";
import { CARDS_PER_PAGE, CardFields, RowCard, RowCards, TableFrame } from "@/components/organisms";
import { Pagination, paginate } from "@/components/molecules";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

// The period's sales, one row per visit completed with the booking tracker: the service, the
// customer and the fee (what it sold for: the downpayment and the balance recorded), with the
// total above. It adds up to Sales. Five to a page, as a table, or on a phone as cards.
export default function SalesRecord({ sales }: { sales: DashboardResponse["sales"] }) {
  const [page, setPage] = useState(1);
  const asTable = useTableLayout();
  // Five sales a page, as a table or as cards
  const view = paginate(sales, page, CARDS_PER_PAGE);
  const total = sales.reduce((sum, s) => sum + (s.fee ?? 0), 0);
  const cell = "border-t border-dotted border-crimson-light py-3 pr-3";

  return (
    <section aria-label="Sales record" className="flex min-w-0 flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-6 shadow-petal">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-normal text-gray-red">Sales record</h2>
        <p className="rounded-full bg-crimson-light/30 px-3 py-1 text-[13px] font-bold text-berry">
          {`${peso(total)} from ${sales.length} ${sales.length === 1 ? "visit" : "visits"}`}
        </p>
      </div>

      {sales.length === 0 ? (
        <p className="text-sm text-gray-red">No completed visits in this period.</p>
      ) : (
        <>
          {!asTable ? (
            <RowCards label="Sales record">
              {view.rows.map((s) => (
                <RowCard key={s.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 font-bold">{s.service_name}</span>
                    <span className="shrink-0 font-bold text-berry">{s.fee === null ? "–" : peso(s.fee)}</span>
                  </div>
                  <CardFields
                    fields={[
                      [
                        "Customer",
                        s.user_id === null ? (
                          s.client_name
                        ) : (
                          <Link to={`/clients/${s.user_id}`} className="text-berry underline decoration-crimson-light underline-offset-4">
                            {s.client_name}
                          </Link>
                        ),
                      ],
                      ["Artist", s.nailist_name],
                      ["Date", dateLabel(s.date)],
                    ]}
                  />
                </RowCard>
              ))}
            </RowCards>
          ) : (
          <TableFrame label="Sales record" minWidthClass="min-w-160"
            head={
              <tr className="text-left text-xs text-gray-red">
                {["Service", "Customer", "Artist", "Date", "Fee"].map((h) => (
                  <th key={h} scope="col" className="pb-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            }
          >
          {view.rows.map((s) => (
            <tr key={s.id}>
              <th scope="row" className={`${cell} text-left font-bold`}>{s.service_name}</th>
              <td className={cell}>
                {s.user_id === null ? (
                  s.client_name
                ) : (
                  <Link to={`/clients/${s.user_id}`} className="font-medium text-berry underline decoration-crimson-light underline-offset-4">
                    {s.client_name}
                  </Link>
                )}
              </td>
              <td className={cell}>{s.nailist_name}</td>
              <td className={`${cell} whitespace-nowrap`}>{dateLabel(s.date)}</td>
              <td className={`${cell} pr-0 font-bold`}>{s.fee === null ? "–" : peso(s.fee)}</td>
            </tr>
          ))}
          </TableFrame>
          )}
          <Pagination page={view.current} totalPages={view.pages} onPageChange={setPage} summary={view} />
        </>
      )}
    </section>
  );
}
