import "server-only";
import { requireAdmin, requireUserRow } from "../auth";
import { getSql } from "../db";
import { toId } from "../http";
import { NOT_AN_IMAGE, imageBytes } from "../imageFiles";
import { PROOF_EXTENSIONS, MAX_PROOF_SIZE } from "../payments";
import { changesCatalog } from "../publicCache";
import { createImageKey, publicBaseUrl, putObject } from "../r2";
import { ported } from "../worker";
import { BALANCE_METHODS, MAX_COMPLETION_PHOTOS, lateFee, minutesLate } from "../../lib/visitCompletion";

// Completing a visit (admin only): the balance paid at the salon, how it was paid, the artist who
// did it, and photos of the nails, which go to that artist's public gallery. Not on the Worker.
// Table from migration 20261022000000_visit_completions.sql.

type IdContext = { params: Promise<{ id: string }> };

class NoLongerConfirmed extends Error {}
const badRequest = (message: string) => Response.json({ message }, { status: 400 });
const manilaToday = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

// PUT /appointments/:id/completion (multipart: balance_amount, payment_method, nailist_id, file…)
export const saveCompletion = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return Response.json({ message: "Appointment not found" }, { status: 404 });

  const form = await req.formData();
  const balanceText = String(form.get("balance_amount") ?? "").trim();
  if (!/^\d{1,7}$/.test(balanceText)) return badRequest("The balance must be a whole number of pesos, 0 or more.");
  const balance = Number(balanceText);
  const method = String(form.get("payment_method") ?? "");
  if (!(BALANCE_METHODS as readonly string[]).includes(method)) return badRequest("Choose how the balance was paid.");
  const nailistId = toId(form.get("nailist_id"));
  // When the client arrived ("13:17"), for the late fee; empty when on time
  const arrivedText = String(form.get("arrived_at") ?? "").trim();
  if (arrivedText && !/^([01]\d|2[0-3]):[0-5]\d$/.test(arrivedText)) return badRequest("Enter the arrival time like 13:17.");
  const arrivedAt = arrivedText || null;
  const files = form.getAll("file").filter((f): f is File => typeof f !== "string");
  if (files.length > MAX_COMPLETION_PHOTOS) return badRequest(`Add up to ${MAX_COMPLETION_PHOTOS} photos at a time.`);

  const sql = getSql();
  const [nailist] = nailistId === null ? [] : await sql`select id from nailists where id = ${nailistId}`;
  if (!nailist) return badRequest("Choose the artist who did the nails.");
  const [appt] = await sql<{ status: string | null; appointment_date: string; appointment_time: string }[]>`
    select status, appointment_date, appointment_time from appointments where id = ${id}`;
  if (!appt) return Response.json({ message: "Appointment not found" }, { status: 404 });
  const status = String(appt.status ?? "").trim().toUpperCase();
  if (status !== "CONFIRMED" && status !== "COMPLETED") {
    return Response.json({ message: "Only a confirmed visit can be completed." }, { status: 409 });
  }
  if (appt.appointment_date > manilaToday()) return badRequest("A visit can be completed from its day on.");

  // Every photo checked before any is stored
  const photos: { bytes: Uint8Array; type: string; ext: string }[] = [];
  for (const file of files) {
    const ext = PROOF_EXTENSIONS[file.type];
    if (!ext) return badRequest("Photos must be JPG, PNG or WEBP.");
    if (file.size > MAX_PROOF_SIZE) return badRequest("Each photo must be 1MB or smaller.");
    const bytes = await imageBytes(file);
    if (!bytes) return badRequest(NOT_AN_IMAGE);
    photos.push({ bytes, type: file.type, ext });
  }
  const urls: string[] = [];
  for (const [i, photo] of photos.entries()) {
    const key = createImageKey("nailists", `visit-${id}-${i + 1}.${photo.ext}`);
    await putObject(key, photo.bytes, photo.type);
    urls.push(`${publicBaseUrl()}/${key}`);
  }

  // The late fee is worked out here, from the booked time, whatever the form showed
  const fee = arrivedAt ? lateFee(minutesLate(appt.appointment_time, arrivedAt)).fee : 0;
  const adminRow = await requireUserRow();
  const completedBy = adminRow instanceof Response ? null : adminRow.id;
  const completion = await sql.begin(async (tx) => {
    // Still confirmed (or completed) now that the photos are up: a booking cancelled meanwhile stays cancelled
    const [still] = await tx`
      update appointments set status = 'COMPLETED'
      where id = ${id} and upper(trim(status)) in ('CONFIRMED', 'COMPLETED') returning id`;
    if (!still) throw new NoLongerConfirmed();
    const [saved] = await tx`
      insert into visit_completions (appointment_id, balance_amount, payment_method, nailist_id, completed_by, arrived_at, late_fee, photos_added)
      values (${id}, ${balance}, ${method}, ${nailistId}, ${completedBy}, ${arrivedAt}, ${fee}, ${urls.length})
      on conflict (appointment_id) do update set
        balance_amount = excluded.balance_amount, payment_method = excluded.payment_method,
        nailist_id = excluded.nailist_id, completed_by = excluded.completed_by,
        arrived_at = excluded.arrived_at, late_fee = excluded.late_fee,
        photos_added = visit_completions.photos_added + excluded.photos_added, updated_at = clawholics_utc_now()
      returning appointment_id, balance_amount, payment_method, nailist_id, arrived_at, late_fee, photos_added`;
    // The newest work first: each photo goes before the artist's others (the page shows the first 10)
    for (const url of urls) {
      await tx`
        insert into nailist_gallery (nailist_id, image_url, position)
        values (${nailistId}, ${url}, (select coalesce(min(position), 1) - 1 from nailist_gallery where nailist_id = ${nailistId}))`;
    }
    // The gallery keeps its first 10 (what the page and the admin's editor show): the oldest give way
    if (urls.length > 0) {
      await tx`
        delete from nailist_gallery where nailist_id = ${nailistId} and id not in (
          select id from nailist_gallery where nailist_id = ${nailistId} order by position asc, id desc limit 10)`;
    }
    return saved;
  }).catch((error) => {
    if (error instanceof NoLongerConfirmed) return null;
    throw error;
  });
  if (!completion) return Response.json({ message: "Only a confirmed visit can be completed." }, { status: 409 });
  return Response.json({ completion, photos: urls.length });
}));

// PUT /appointments/:id/photo (multipart: one `file`): the visit's nail photo, added after it was
// completed. It goes first in the artist's gallery (kept to 10) and replaces the visit's earlier
// one there. Photos come shrunk from the browser; 1MB at most here.
export const saveVisitPhoto = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return Response.json({ message: "Appointment not found" }, { status: 404 });

  const file = (await req.formData()).get("file");
  if (!file || typeof file === "string") return badRequest("Choose a photo.");
  const ext = PROOF_EXTENSIONS[file.type];
  if (!ext) return badRequest("Photos must be JPG, PNG or WEBP.");
  if (file.size > MAX_PROOF_SIZE) return badRequest("The photo must be 1MB or smaller.");
  const bytes = await imageBytes(file);
  if (!bytes) return badRequest(NOT_AN_IMAGE);

  const sql = getSql();
  const [record] = await sql<{ nailist_id: number; photo_url: string | null }[]>`
    select vc.nailist_id, vc.photo_url from visit_completions vc
    join appointments a on a.id = vc.appointment_id
    where vc.appointment_id = ${id} and upper(trim(a.status)) = 'COMPLETED'`;
  if (!record) return Response.json({ message: "Complete the visit first, then add its photo." }, { status: 409 });

  const key = createImageKey("nailists", `visit-${id}.${ext}`);
  await putObject(key, bytes, file.type);
  const url = `${publicBaseUrl()}/${key}`;

  await sql.begin(async (tx) => {
    if (record.photo_url) await tx`delete from nailist_gallery where nailist_id = ${record.nailist_id} and image_url = ${record.photo_url}`;
    await tx`
      insert into nailist_gallery (nailist_id, image_url, position)
      values (${record.nailist_id}, ${url}, (select coalesce(min(position), 1) - 1 from nailist_gallery where nailist_id = ${record.nailist_id}))`;
    await tx`
      delete from nailist_gallery where nailist_id = ${record.nailist_id} and id not in (
        select id from nailist_gallery where nailist_id = ${record.nailist_id} order by position asc, id desc limit 10)`;
    await tx`
      update visit_completions set photo_url = ${url}, photos_added = greatest(photos_added, 1), updated_at = clawholics_utc_now()
      where appointment_id = ${id}`;
  });
  return Response.json({ photo_url: url });
}));
