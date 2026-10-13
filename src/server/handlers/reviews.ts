import "server-only";
import { requireAdmin, requireUserRow, type RequesterUser } from "../auth";
import { getSql } from "../db";
import { pgErrorCode, readJson, toId } from "../http";
import { MAX_PROOF_SIZE, PROOF_EXTENSIONS } from "../payments";
import { publicBaseUrl, putObject } from "../r2";
import { getPublicReviews } from "../catalog";
import { ported } from "../worker";

// Clients' reviews of their completed visits: a 1-5 rating, a comment and an optional photo, one
// per appointment. Not on the Worker. Table from migration 20261015000000_reviews.sql. Admins
// see them on the client page (GET /clients/:id) and approve the ones the home page may show
// (migration 20261016000000_review_approval.sql).

type IdContext = { params: Promise<{ id: string }> };

const MAX_COMMENT_LENGTH = 1000;
const errorBody = (message: string, status: number) => Response.json({ error: message, message }, { status });

async function requireClient(): Promise<(RequesterUser & { id: number }) | Response> {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;
  if (requester.id === null) return errorBody("Unauthenticated: Please log in.", 401);
  return requester as RequesterUser & { id: number };
}

// GET /reviews: the signed-in client's own reviews, newest first
export const listMyReviews = ported(async () => {
  const requester = await requireClient();
  if (requester instanceof Response) return requester;
  const rows = await getSql()`
    select id, appointment_id, rating, comment, photo_url, created_at, approved
    from reviews where user_id = ${requester.id} order by created_at desc, id desc`;
  return Response.json(rows);
});

// POST /reviews (multipart: appointment_id, rating, comment, optional file): review one of the
// client's own completed visits, once.
export const createReview = ported(async (req) => {
  const requester = await requireClient();
  if (requester instanceof Response) return requester;

  const form = await req.formData();
  const appointmentId = toId(form.get("appointment_id"));
  const rating = Number(form.get("rating"));
  const comment = String(form.get("comment") ?? "").trim();
  const file = form.get("file");
  if (appointmentId === null) return errorBody("A valid appointment_id is required.", 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return errorBody("Pick a rating from 1 to 5 stars.", 400);
  if (comment.length > MAX_COMMENT_LENGTH) return errorBody(`Keep the review under ${MAX_COMMENT_LENGTH} characters.`, 400);

  const photo = file && typeof file !== "string" && file.size > 0 ? file : null;
  const ext = photo ? PROOF_EXTENSIONS[photo.type] : undefined;
  if (photo && !ext) return errorBody("Only JPG, PNG, and WEBP files are allowed.", 400);
  if (photo && photo.size > MAX_PROOF_SIZE) return errorBody("Image must be 1MB or smaller.", 400);

  const sql = getSql();
  const [appt] = await sql<{ user_id: number; status: string }[]>`select user_id, status from appointments where id = ${appointmentId}`;
  if (!appt) return errorBody("Appointment not found.", 404);
  if (appt.user_id !== requester.id) return errorBody("You can only review your own appointment.", 403);
  if (String(appt.status).trim().toUpperCase() !== "COMPLETED") return errorBody("You can review a visit once it's completed.", 400);
  const [existing] = await sql`select 1 from reviews where appointment_id = ${appointmentId}`;
  if (existing) return errorBody("You've already reviewed this visit.", 409);

  let photoUrl: string | null = null;
  if (photo && ext) {
    // Random key so the public URL can't be guessed; the extension comes from the checked MIME type
    const key = `reviews/${crypto.randomUUID()}.${ext}`;
    await putObject(key, new Uint8Array(await photo.arrayBuffer()), photo.type);
    photoUrl = `${publicBaseUrl()}/${key}`;
  }

  try {
    const [row] = await sql`
      insert into reviews (appointment_id, user_id, rating, comment, photo_url)
      values (${appointmentId}, ${requester.id}, ${rating}, ${comment}, ${photoUrl})
      returning id, appointment_id, rating, comment, photo_url, created_at, approved`;
    return Response.json(row, { status: 201 });
  } catch (error) {
    // Two submits at once: the second loses on the unique appointment_id
    if (pgErrorCode(error) === "23505") return errorBody("You've already reviewed this visit.", 409);
    throw error;
  }
});

// GET /reviews/public (anyone): the reviews an admin approved for the home page. Read fresh, not
// cached: they show clients' names, which change outside the catalog writes (a renamed or deleted
// account must leave the home page at once).
export const listPublicReviews = ported(async () => Response.json(await getPublicReviews()));

// PUT /reviews/:id/approval { approved } (admin): show a review on the home page, or take it off
export const setReviewApproval = ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  const { approved } = await readJson<{ approved?: unknown }>(req);
  if (typeof approved !== "boolean") return errorBody("approved must be true or false.", 400);
  if (id === null) return errorBody("Review not found.", 404);

  const sql = getSql();
  const [adminRow] = await sql<{ id: number }[]>`select id from users where clerk_id = ${admin.clerkId}`;
  const [row] = approved
    ? await sql`
        update reviews set approved = 1, approved_by = ${adminRow?.id ?? null}, approved_at = clawholics_utc_now()
        where id = ${id} returning id, appointment_id, approved`
    : await sql`
        update reviews set approved = 0, approved_by = null, approved_at = null
        where id = ${id} returning id, appointment_id, approved`;
  if (!row) return errorBody("Review not found.", 404);
  return Response.json(row);
});
