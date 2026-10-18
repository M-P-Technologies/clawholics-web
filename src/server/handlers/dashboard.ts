import "server-only";
import { requireAdmin } from "../auth";
import { buildDashboard, listWarmLeads as warmLeadIds } from "../dashboard";
import { buildUtilization } from "../utilization";
import { ATTENTION_TABS, MAX_ATTENTION_PAGE_SIZE, listAttention, type AttentionTab } from "../attention";
import { ATTENTION_MOST } from "../../lib/admin/attention";
import { DEFAULT_RANGE, isDashboardRange, manilaToday } from "../../lib/dashboardPeriods";
import { ported } from "../worker";

// GET /dashboard?range=week|month|last30|last90|year (admin only): every number the dashboard
// shows, for the range and the one before it. Not on the Worker: while API_BACKEND isn't
// `next` the request is forwarded there and answered 404.
export const getDashboard = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const range = new URL(req.url).searchParams.get("range") ?? DEFAULT_RANGE;
  if (!isDashboardRange(range)) return Response.json({ error: "Unknown range." }, { status: 400 });

  return Response.json(await buildDashboard(range));
});

// GET /leads (admin only): the Clerk ids of the warm leads the dashboard counts, so the Client
// Directory can show just them. Not on the Worker either.
export const listWarmLeads = ported(async () => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  return Response.json({ clerkIds: await warmLeadIds() });
});

// GET /utilization?week=YYYY-MM-DD (admin only): artist utilization for the week holding that date
// (this week by default). Not on the Worker either.
export const getUtilization = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const week = new URL(req.url).searchParams.get("week") ?? manilaToday(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || Number.isNaN(Date.parse(`${week}T00:00:00Z`))) {
    return Response.json({ error: "Use a date like 2026-10-12." }, { status: 400 });
  }
  return Response.json(await buildUtilization(week));
});

// GET /attention?tab=all|confirm|complete|leads&page=N&pageSize=M (admin only): the Needs attention
// queue a page at a time, most urgent first, as { items, counts, total, page, pageSize }: counts has
// every kind's count, total how many the tab holds. page defaults to 1, pageSize (1-50) to 15. Not on
// the Worker either.
export const getAttention = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const params = new URL(req.url).searchParams;
  const tab = params.get("tab") ?? "all";
  if (!ATTENTION_TABS.includes(tab as AttentionTab)) return Response.json({ error: "Unknown tab." }, { status: 400 });
  const page = params.has("page") ? Number(params.get("page")) : 1;
  const pageSize = params.has("pageSize") ? Number(params.get("pageSize")) : ATTENTION_MOST;
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_ATTENTION_PAGE_SIZE) {
    return Response.json({ error: `page must be 1 or more, and pageSize 1 to ${MAX_ATTENTION_PAGE_SIZE}` }, { status: 400 });
  }
  return Response.json(await listAttention(tab as AttentionTab, { page, pageSize }));
});
