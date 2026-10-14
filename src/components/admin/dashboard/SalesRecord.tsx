import { useState } from "react";
import { useTableLayout } from "../../../hooks/useMinWidth";
import { peso } from "../../../lib/dashboardFormat";
import { Link } from "../../../lib/router";
import type { DashboardResponse } from "../../../services/dashboardTypes";
import { CARDS_PER_PAGE, CardFields, RowCard, RowCards, TableFrame } from "@/components/organisms";
import { Pagination, paginate, PAGE_SIZE } from "@/components/molecules";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

// The period's sales, one row per completed visit: the service, the customer and the fee (its
// list price), with the total above. It adds up to Estimated sales. On a phone each sale is a
// card, five to a page.
export default function SalesRecord({ sales }: { sales: DashboardResponse["sales"] }) {
  const [page, setPage] = useState(1);
  const asTable = useTableLayout();
  const view = paginate(sales, page, asTable ? PAGE_SIZE : CARDS_PER_PAGE);
  const total = sales.reduce((sum, s) => sum + (s.fee ?? 0), 0);
  const cell = "border-t border-dotted border-crimson-light py-3 pr-3";

  return (
    <section aria-label="Sales record" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-normal text-gray-red">Sales record</h2>
        <p className="rounded-full bg-crimson-light/30 px-3 py-1 text-[13px] font-bold text-berry">
          {`${peso(total)} from ${sales.length} ${sales.length === 1 ? "visit" : "visits"}`}
        </p>
      </div>

      {sales.length === 0 ? (
        <p className="text-sm text-gray-red/70">No completed visits in this period.</p>
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
          <TableFrame label="Sales record" minWidthClass="min-w-[640px]"
            head={
              <tr className="text-left text-[12px] text-gray-red/70">
                {["Service", "Customer", "Artist", "Date", "Fee"].map((h) => (
                  <th key={h} scope="col" className={h === "Fee" ? "pb-2 text-right font-medium" : "pb-2 font-medium"}>
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
              <td className={`${cell} pr-0 text-right font-bold`}>{s.fee === null ? "–" : peso(s.fee)}</td>
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
