import "server-only";
import { requireAdmin } from "../auth";
import { buildDashboard, listWarmLeads as warmLeadIds } from "../dashboard";
import { buildUtilization } from "../utilization";
import { ATTENTION_TABS, listAttention, type AttentionTab } from "../attention";
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

// GET /attention?tab=all|confirm|complete|leads (admin only): the Needs attention queue, the five
// most urgent things to act on, and how many of each kind there are. Not on the Worker either.
export const getAttention = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const tab = new URL(req.url).searchParams.get("tab") ?? "all";
  if (!ATTENTION_TABS.includes(tab as AttentionTab)) return Response.json({ error: "Unknown tab." }, { status: 400 });
  return Response.json(await listAttention(tab as AttentionTab));
});
