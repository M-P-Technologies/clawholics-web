import "server-only";
import { getSql } from "./db";
import { WARM_LEADS, warmSince } from "./dashboard";
import { PROOF_TO_REVIEW_SQL } from "./proofRules";
import { END_CLOCK_SQL, PHOTOS_TO_ADD_SQL, TO_COMPLETE_SQL, manilaNow } from "./visitsToComplete";

// The dashboard's Needs attention queue: the few things to act on now, most urgent first.
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
/** The queue shows five */
export const ATTENTION_SHOWN = 5;

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

// Each kind's rows (up to `limit`, in its own order) and how many there are in all
function kindQueries(today: string, clock: string): Record<AttentionKind, { rows: string; where: string }> {
  const confirmWhere = `upper(trim(a.status)) = 'AWAITING_CONFIRMATION'`;
  const reviewWhere = `${PROOF_TO_REVIEW_SQL("a")} and upper(trim(a.status)) <> 'AWAITING_CONFIRMATION'`;
  const completeWhere = TO_COMPLETE_SQL("a", today, clock);
  const photosWhere = PHOTOS_TO_ADD_SQL("a");
  return {
    confirm: {
      where: confirmWhere,
      rows: `${BOOKING}, 'confirm' as kind,
          coalesce((select min(p.created_at) from payments p where p.appointment_id = a.id and upper(trim(p.status)) = 'PAID'), a.created_at) as since,
          coalesce(${LATEST_PROOF("a")} in ('PENDING', 'APPROVED'), false) as has_screenshot
        ${BOOKING_FROM} where ${confirmWhere}
        order by has_screenshot desc, since asc, a.id limit $1`,
    },
    review: {
      where: reviewWhere,
      rows: `${BOOKING}, 'review' as kind,
          (select pp.created_at from payment_proofs pp where pp.appointment_id = a.id order by pp.created_at desc, pp.id desc limit 1) as since
        ${BOOKING_FROM} where ${reviewWhere}
        order by since asc, a.id limit $1`,
    },
    complete: {
      where: completeWhere,
      // The visit's end, Manila time, as UTC like the other kinds
      rows: `${BOOKING}, 'complete' as kind,
          to_char((a.appointment_date || ' ' || ${END_CLOCK_SQL("a")})::timestamp - interval '8 hours', 'YYYY-MM-DD HH24:MI:SS') as since
        ${BOOKING_FROM} where ${completeWhere}
        order by a.appointment_date desc, ${END_CLOCK_SQL("a")} desc, a.id limit $1`,
    },
    photos: {
      where: photosWhere,
      rows: `${BOOKING}, 'photos' as kind,
          (select vc.created_at from visit_completions vc where vc.appointment_id = a.id) as since
        ${BOOKING_FROM} where ${photosWhere}
        order by a.appointment_date desc, a.id limit $1`,
    },
    lead: { where: "", rows: "" },
  };
}

export async function listAttention(tab: AttentionTab, now: Date = new Date()): Promise<{ items: AttentionItem[]; counts: Record<"confirm" | "review" | "complete" | "photos" | "leads", number> }> {
  const sql = getSql();
  const { today, clock } = manilaNow(now);
  const queries = kindQueries(today, clock);
  const limit = String(ATTENTION_SHOWN);
  const warm = [warmSince(today)];

  const appointmentKinds = ["confirm", "review", "complete", "photos"] as const;
  const [rows, counts, leads, leadCount] = await Promise.all([
    Promise.all(appointmentKinds.map((kind) => (TAB_KINDS[tab].includes(kind) ? sql.unsafe<AttentionItem[]>(queries[kind].rows, [limit]) : Promise.resolve([])))),
    sql.unsafe<{ confirm: number; review: number; complete: number; photos: number }[]>(
      `select ${appointmentKinds.map((kind) => `count(*) filter (where ${queries[kind].where})::int as ${kind}`).join(", ")} from appointments a`,
      [],
    ),
    TAB_KINDS[tab].includes("lead")
      ? sql.unsafe<AttentionItem[]>(
          `select 'lead' as kind, null::int as appointment_id, u.id as user_id,
             coalesce(nullif(trim(coalesce(cp.first_name, '') || ' ' || coalesce(cp.last_name, '')), ''), u.email) as client_name,
             u.email, null as service_name, null as nailist_name, null as appointment_date, null as appointment_time, u.created_at as since
           from users u left join customer_profiles cp on cp.user_id = u.id
           where u.clerk_id in (${WARM_LEADS})
           order by u.created_at desc, u.id desc limit $2`,
          [...warm, limit],
        )
      : Promise.resolve([]),
    sql.unsafe<{ n: number }[]>(`select count(*)::int as n from (${WARM_LEADS}) w`, warm),
  ]);

  const items = [...rows.flat(), ...leads].slice(0, ATTENTION_SHOWN).map((item) => ({ ...item }));
  const [c] = counts;
  return { items, counts: { confirm: c.confirm, review: c.review, complete: c.complete, photos: c.photos, leads: leadCount[0].n } };
}
