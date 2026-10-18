import "server-only";
import { getSql } from "./db";
import { WARM_LEADS, warmSince } from "./dashboard";
import { PROOF_TO_REVIEW_SQL } from "./proofRules";
import { ATTENTION_MOST } from "@/lib/admin/attention";
import { END_CLOCK_SQL, PHOTOS_TO_ADD_SQL, TO_COMPLETE_SQL, manilaNow } from "./visitsToComplete";

// The dashboard's Needs attention queue: the things to act on now, most urgent first, a page at a time.
// 1 bookings to confirm (paid; with a screenshot first, then the longest waiting), 2 payment proofs
// to review, 3 visits to complete (the latest first), 4 visit photos to add, 5 warm leads (the
// newest first). Each tab lists its own kinds.

export type AttentionKind = "confirm" | "review" | "complete" | "photos" | "lead";
export type AttentionTab = "all" | "confirm" | "complete" | "leads";
export const ATTENTION_TABS: AttentionTab[] = ["all", "confirm", "complete", "leads"];
const TAB_KINDS: Record<AttentionTab, AttentionKind[]> = {
  all: ["confirm", "review", "complete", "photos", "lead"],
  confirm: ["confirm", "review"],
  complete: ["complete", "photos"],
  leads: ["lead"],
};
/** The kinds in the queue's order */
const KIND_ORDER: AttentionKind[] = ["confirm", "review", "complete", "photos", "lead"];
/** The largest page the queue answers */
export const MAX_ATTENTION_PAGE_SIZE = 50;

export interface AttentionItem {
  kind: AttentionKind;
  /** The booking, or null for a warm lead */
  appointment_id: number | null;
  /** The client's users.id, or null for the walk-in guest (who has no page) */
  user_id: number | null;
  client_name: string;
  email: string | null;
  service_name: string | null;
  nailist_name: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  /** Waiting since (UTC "YYYY-MM-DD HH:MM:SS"): the payment, the proof, the visit's end, the completion, the sign-up */
  since: string;
  /** A confirmation whose client sent the screenshot */
  has_screenshot?: boolean;
}

export interface AttentionPage {
  items: AttentionItem[];
  /** Each kind's count, whichever tab is open */
  counts: Record<"confirm" | "review" | "complete" | "photos" | "leads", number>;
  /** How many the tab holds in all */
  total: number;
  page: number;
  pageSize: number;
}

// The booking's client and details, shared by the appointment kinds
const BOOKING = `
  select a.id as appointment_id,
    case when u.clerk_id = 'walkin_guest' then null else a.user_id end as user_id,
    coalesce(nullif(trim(coalesce(a.walkin_first_name, cp.first_name, '') || ' ' || coalesce(a.walkin_last_name, cp.last_name, '')), ''), 'Client') as client_name,
    coalesce(a.walkin_email, u.email) as email, a.service_name, coalesce(n.name, a.nailist_name) as nailist_name,
    a.appointment_date, a.appointment_time`;
const BOOKING_FROM = `
  from appointments a
  left join users u on u.id = a.user_id
  left join customer_profiles cp on cp.user_id = a.user_id
  left join nailists n on n.id = a.nailist_id`;
const LATEST_PROOF = (alias: string) =>
  `(select pp.status from payment_proofs pp where pp.appointment_id = ${alias}.id order by pp.created_at desc, pp.id desc limit 1)`;

// Each kind's rows (the same columns in each, so they can be put together), their order within the
// kind, and which appointments it counts. `warm` is the parameter holding the warm leads' cut-off.
function kindQueries(today: string, clock: string, warm: string): Record<AttentionKind, { rows: string; order: string; where: string }> {
  const confirmWhere = `upper(trim(a.status)) = 'AWAITING_CONFIRMATION'`;
  const reviewWhere = `${PROOF_TO_REVIEW_SQL("a")} and upper(trim(a.status)) <> 'AWAITING_CONFIRMATION'`;
  const completeWhere = TO_COMPLETE_SQL("a", today, clock);
  const photosWhere = PHOTOS_TO_ADD_SQL("a");
  const leadWhere = `u.clerk_id in (${WARM_LEADS.replaceAll("$1", warm)})`;
  return {
    confirm: {
      where: confirmWhere,
      rows: `${BOOKING}, 'confirm' as kind,
          coalesce((select min(p.created_at) from payments p where p.appointment_id = a.id and upper(trim(p.status)) = 'PAID'), a.created_at) as since,
          coalesce(${LATEST_PROOF("a")} in ('PENDING', 'APPROVED'), false) as has_screenshot
        ${BOOKING_FROM} where ${confirmWhere}`,
      order: "has_screenshot desc, since asc, appointment_id",
    },
    review: {
      where: reviewWhere,
      rows: `${BOOKING}, 'review' as kind,
          (select pp.created_at from payment_proofs pp where pp.appointment_id = a.id order by pp.created_at desc, pp.id desc limit 1) as since,
          null::boolean as has_screenshot
        ${BOOKING_FROM} where ${reviewWhere}`,
      order: "since asc, appointment_id",
    },
    complete: {
      where: completeWhere,
      // The visit's end, Manila time, as UTC like the other kinds; the latest visit first
      rows: `${BOOKING}, 'complete' as kind,
          to_char((a.appointment_date || ' ' || ${END_CLOCK_SQL("a")})::timestamp - interval '8 hours', 'YYYY-MM-DD HH24:MI:SS') as since,
          null::boolean as has_screenshot
        ${BOOKING_FROM} where ${completeWhere}`,
      order: "since desc, appointment_id",
    },
    photos: {
      where: photosWhere,
      rows: `${BOOKING}, 'photos' as kind,
          (select vc.created_at from visit_completions vc where vc.appointment_id = a.id) as since,
          null::boolean as has_screenshot
        ${BOOKING_FROM} where ${photosWhere}`,
      order: "appointment_date desc, appointment_id",
    },
    lead: {
      where: leadWhere,
      rows: `select null::int as appointment_id, u.id as user_id,
          coalesce(nullif(trim(coalesce(cp.first_name, '') || ' ' || coalesce(cp.last_name, '')), ''), u.email) as client_name,
          u.email, null::text as service_name, null::text as nailist_name, null::text as appointment_date, null::text as appointment_time,
          'lead' as kind, u.created_at as since, null::boolean as has_screenshot
        from users u left join customer_profiles cp on cp.user_id = u.id
        where ${leadWhere}`,
      order: "since desc, user_id desc",
    },
  };
}

/** One page of a tab's queue (the kinds in their order, each in its own), and each kind's count */
export async function listAttention(
  tab: AttentionTab,
  { page = 1, pageSize = ATTENTION_MOST }: { page?: number; pageSize?: number } = {},
  now: Date = new Date(),
): Promise<AttentionPage> {
  const sql = getSql();
  const { today, clock } = manilaNow(now);
  const warm = warmSince(today);
  const kinds = KIND_ORDER.filter((kind) => TAB_KINDS[tab].includes(kind));
  // The page's rows: $1 the page size, $2 the offset, and $3 the warm leads' cut-off when the tab lists them
  const queries = kindQueries(today, clock, "$3");
  const appointmentKinds = ["confirm", "review", "complete", "photos"] as const;

  const [rows, [c]] = await Promise.all([
    sql.unsafe<(AttentionItem & { has_screenshot: boolean | null })[]>(
      `select appointment_id, user_id, client_name, email, service_name, nailist_name, appointment_date, appointment_time, kind, since, has_screenshot
       from (${kinds
         // A kind's rows can't come before their place within it, so none past the page's end is needed
         .map((kind) => `select k.*, ${KIND_ORDER.indexOf(kind)} as kind_rank, row_number() over (order by ${queries[kind].order}) as kind_row
           from (${queries[kind].rows} order by ${queries[kind].order} limit ($1::int + $2::int)) k`)
         .join(" union all ")}) q
       order by kind_rank, kind_row limit $1 offset $2`,
      [String(pageSize), String((page - 1) * pageSize), ...(kinds.includes("lead") ? [warm] : [])],
    ),
    // Every kind's count, the warm leads' with them ($1 their cut-off)
    sql.unsafe<AttentionPage["counts"][]>(
      `select ${appointmentKinds.map((kind) => `count(*) filter (where ${queries[kind].where})::int as ${kind}`).join(", ")},
         (select count(*)::int from users u where ${kindQueries(today, clock, "$1").lead.where}) as leads
       from appointments a`,
      [warm],
    ),
  ]);

  const counts = { confirm: c.confirm, review: c.review, complete: c.complete, photos: c.photos, leads: c.leads };
  const total = kinds.reduce((sum, kind) => sum + counts[kind === "lead" ? "leads" : kind], 0);
  // Only a confirmation says whether its screenshot was sent
  const items = rows.map(({ has_screenshot, ...item }) => (item.kind === "confirm" ? { ...item, has_screenshot: Boolean(has_screenshot) } : { ...item }));
  return { items, counts, total, page, pageSize };
}
