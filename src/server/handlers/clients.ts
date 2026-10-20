import "server-only";
import { requireAdmin } from "../auth";
import { BOOKED_OPTIONS, SERVICE_PRICE_SQL } from "../appointments";
import { expectedBalance } from "../../lib/visitCompletion";
import { voucherForClientPage } from "../birthdayVouchers";
import { getSql } from "../db";
import { readJson, toId } from "../http";
import { ported } from "../worker";

// The client page (admin only): a client's profile, a summary, every appointment, and the
// admins' private notes, general or about one appointment, plus one "next steps" text.
// Not on the Worker. Tables from migration 20261014000000_client_notes.sql.

type IdContext = { params: Promise<{ id: string }> };
type NoteContext = { params: Promise<{ id: string; noteId: string }> };
type Body = Record<string, unknown>;

const badRequest = (message: string) => Response.json({ message }, { status: 400 });
const notFound = (message = "Client not found") => Response.json({ message }, { status: 404 });

// A client account: not an admin, and not the shared walk-in guest
async function clientExists(id: number | null): Promise<boolean> {
  if (id === null) return false;
  const [row] = await getSql()`
    select 1 from users where id = ${id} and coalesce(role, 'customer') = 'customer' and clerk_id <> 'walkin_guest'`;
  return Boolean(row);
}

async function adminUserId(clerkId: string): Promise<number | null> {
  const [row] = await getSql()<{ id: number }[]>`select id from users where clerk_id = ${clerkId}`;
  return row?.id ?? null;
}

const NOTE_SELECT = `
  select cn.id, cn.client_user_id, cn.appointment_id, cn.author_admin_id,
    nullif(trim(coalesce(ap.first_name, '') || ' ' || coalesce(ap.last_name, '')), '') as author_name,
    cn.note, cn.created_at, cn.updated_at
  from client_notes cn left join admin_profiles ap on ap.user_id = cn.author_admin_id`;

async function noteById(id: number) {
  const [row] = await getSql().unsafe(`${NOTE_SELECT} where cn.id = $1`, [String(id)]);
  return row;
}

// GET /clients/:id
export const getClient = ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (!(await clientExists(id))) return notFound();

  const sql = getSql();
  const [[client], appointments, birthdayVoucher] = await Promise.all([
    sql`
      select u.id, u.clerk_id, u.email, u.created_at, cp.first_name, cp.last_name, cp.phone, cp.alt_phone, cp.dob,
        cp.preferred_contact_method, cp.facebook_handle, cp.instagram_handle, coalesce(cp.stamps, 0)::int as stamps
      from users u left join customer_profiles cp on cp.user_id = u.id
      where u.id = ${id}`,
    sql.unsafe<{
      id: number; appointment_date: string; status: string; price: number | null; paid_downpayment: number;
      completion: { voucher_discount?: number } | null; options: { name: string; price: number }[];
    }[]>(
      `select a.id, a.appointment_date, a.appointment_time, a.service_name, a.nailist_id,
         coalesce(n.name, a.nailist_name) as nailist_name, upper(trim(a.status)) as status,
         ${SERVICE_PRICE_SQL} as price, ${BOOKED_OPTIONS} as options,
         -- For the booking tracker: when it was booked, the latest payment proof and payment
         a.created_at as booked_at,
         lp.created_at as proof_sent_at, lp.status as proof_status,
         case when lp.status in ('APPROVED', 'REJECTED') then lp.updated_at end as proof_reviewed_at,
         upper(lpay.status) as payment_status, lp.image_url as proof_image_url,
         -- For completing the visit: the downpayments paid, and the record once completed
         (select coalesce(sum(p.amount), 0)::int from payments p
          where p.appointment_id = a.id and upper(trim(p.status)) = 'PAID') as paid_downpayment,
         (select json_build_object('balance_amount', vc.balance_amount, 'payment_method', vc.payment_method,
                   'nailist_id', vc.nailist_id, 'nailist_name', vn.name,
                   'arrived_at', vc.arrived_at, 'late_fee', vc.late_fee, 'photos_added', vc.photos_added, 'photo_url', vc.photo_url,
                   'voucher_discount', vc.voucher_discount, 'voucher_code', (select bv.code from birthday_vouchers bv where bv.appointment_id = a.id),
                   'voucher_pct', (select bv.discount_pct from birthday_vouchers bv where bv.appointment_id = a.id))
          from visit_completions vc left join nailists vn on vn.id = vc.nailist_id
          where vc.appointment_id = a.id) as completion,
         -- The client's review of the visit, if they left one
         r.id as review_id, r.rating as review_rating, r.comment as review_comment, r.photo_url as review_photo_url,
         r.approved as review_approved
       from appointments a
       left join nailists n on n.id = a.nailist_id
       left join nailist_categories nc on nc.id = n.category_id
       left join services s on s.id = a.service_id
       left join lateral (
         select pp.created_at, pp.status, pp.updated_at, pp.image_url from payment_proofs pp
         where pp.appointment_id = a.id order by pp.created_at desc, pp.id desc limit 1
       ) lp on true
       left join lateral (
         select p.status from payments p where p.appointment_id = a.id order by p.created_at desc, p.id desc limit 1
       ) lpay on true
       left join reviews r on r.appointment_id = a.id
       where a.user_id = $1
       order by a.appointment_date desc, a.appointment_time desc, a.id desc`,
      [String(id)],
    ),
    // This year's birthday voucher, and the visit it was used on
    voucherForClientPage(id as number),
  ]);

  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10); // Manila
  const upcoming = appointments.filter((a) => a.status === "CONFIRMED" && a.appointment_date >= today);
  const { stamps, ...profile } = client as typeof client & { stamps: number };
  return Response.json({
    client: profile,
    summary: {
      visits: completed.length,
      /** Confirmed visits they didn't come to */
      noShows: appointments.filter((a) => a.status === "NO_SHOW").length,
      totalSpent: completed.reduce((sum, a) => sum + (a.price ?? 0), 0),
      lastVisit: completed[0]?.appointment_date ?? null,
      nextVisit: upcoming[upcoming.length - 1]?.appointment_date ?? null,
      stamps,
    },
    // The service less the birthday voucher's discount (when one was used on the visit), plus the options added
    appointments: appointments.map((a) => {
      const discount = a.completion?.voucher_discount ?? 0;
      const options = a.options.reduce((sum, o) => sum + o.price, 0);
      return { ...a, expected_balance: expectedBalance(a.price === null ? null : Math.max(0, a.price - discount) + options, a.paid_downpayment) };
    }),
    birthday_voucher: birthdayVoucher,
  });
});

// GET /clients/:id/notes
export const listClientNotes = ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (!(await clientExists(id))) return notFound();
  const rows = await getSql().unsafe(`${NOTE_SELECT} where cn.client_user_id = $1 order by cn.created_at desc, cn.id desc`, [String(id)]);
  return Response.json(rows);
});

// POST /clients/:id/notes { note, appointment_id? }
export const addClientNote = ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (!(await clientExists(id))) return notFound();
  const body = await readJson<Body>(req);
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) return badRequest("Write a note first.");

  const sql = getSql();
  let appointmentId: number | null = null;
  if (body.appointment_id !== undefined && body.appointment_id !== null) {
    appointmentId = toId(body.appointment_id);
    const [own] = appointmentId === null ? [] : await sql`select 1 from appointments where id = ${appointmentId} and user_id = ${id}`;
    if (!own) return badRequest("That appointment isn't this client's.");
  }
  const [{ id: noteId }] = await sql<{ id: number }[]>`
    insert into client_notes (client_user_id, appointment_id, author_admin_id, note)
    values (${id}, ${appointmentId}, ${await adminUserId(admin.clerkId)}, ${note}) returning id`;
  return Response.json(await noteById(noteId), { status: 201 });
});

// PUT /clients/:id/notes/:noteId { note }
export const updateClientNote = ported<NoteContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const p = await params;
  const id = toId(p.id);
  const noteId = toId(p.noteId);
  const body = await readJson<Body>(req);
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) return badRequest("Write a note first.");
  const [row] = noteId === null || id === null ? [] : await getSql()`
    update client_notes set note = ${note}, updated_at = clawholics_utc_now()
    where id = ${noteId} and client_user_id = ${id} returning id`;
  if (!row) return notFound("Note not found");
  return Response.json(await noteById(noteId!));
});

// DELETE /clients/:id/notes/:noteId
export const deleteClientNote = ported<NoteContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const p = await params;
  const id = toId(p.id);
  const noteId = toId(p.noteId);
  const [row] = noteId === null || id === null ? [] : await getSql()`
    delete from client_notes where id = ${noteId} and client_user_id = ${id} returning id`;
  if (!row) return notFound("Note not found");
  return new Response(null, { status: 204 });
});

// GET /clients/:id/next-steps
export const getNextSteps = ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (!(await clientExists(id))) return notFound();
  const [row] = await getSql()`select client_user_id, text, updated_by, updated_at from client_next_steps where client_user_id = ${id}`;
  return Response.json(row ?? { client_user_id: id, text: "", updated_by: null, updated_at: null });
});

// PUT /clients/:id/next-steps { text }
export const saveNextSteps = ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (!(await clientExists(id))) return notFound();
  const body = await readJson<Body>(req);
  if (typeof body.text !== "string") return badRequest("text is required.");
  const [row] = await getSql()`
    insert into client_next_steps (client_user_id, text, updated_by)
    values (${id}, ${body.text.trim()}, ${await adminUserId(admin.clerkId)})
    on conflict (client_user_id) do update set text = excluded.text, updated_by = excluded.updated_by, updated_at = clawholics_utc_now()
    returning client_user_id, text, updated_by, updated_at`;
  return Response.json(row);
});
