import "server-only";
import { requireAdmin, requireUserRow } from "../auth";
import { getSql } from "../db";
import { toId } from "../http";
import { NOT_AN_IMAGE, imageBytes } from "../imageFiles";
import { PROOF_EXTENSIONS, MAX_PROOF_SIZE } from "../payments";
import { changesCatalog } from "../publicCache";
import { createImageKey, publicBaseUrl, putObject } from "../r2";
import { ported } from "../worker";
import { BALANCE_METHODS, MAX_COMPLETION_PHOTOS } from "../../lib/visitCompletion";

// Completing a visit (admin only): the balance paid at the salon, how it was paid, the artist who
// did it, and photos of the nails, which go to that artist's public gallery. Not on the Worker.
// Table from migration 20261021000000_visit_completions.sql.

type IdContext = { params: Promise<{ id: string }> };

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
  const files = form.getAll("file").filter((f): f is File => typeof f !== "string");
  if (files.length > MAX_COMPLETION_PHOTOS) return badRequest(`Add up to ${MAX_COMPLETION_PHOTOS} photos at a time.`);

  const sql = getSql();
  const [nailist] = nailistId === null ? [] : await sql`select id from nailists where id = ${nailistId}`;
  if (!nailist) return badRequest("Choose the artist who did the nails.");
  const [appt] = await sql<{ status: string | null; appointment_date: string }[]>`
    select status, appointment_date from appointments where id = ${id}`;
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

  const adminRow = await requireUserRow();
  const completedBy = adminRow instanceof Response ? null : adminRow.id;
  const completion = await sql.begin(async (tx) => {
    const [saved] = await tx`
      insert into visit_completions (appointment_id, balance_amount, payment_method, nailist_id, completed_by)
      values (${id}, ${balance}, ${method}, ${nailistId}, ${completedBy})
      on conflict (appointment_id) do update set
        balance_amount = excluded.balance_amount, payment_method = excluded.payment_method,
        nailist_id = excluded.nailist_id, completed_by = excluded.completed_by, updated_at = clawholics_utc_now()
      returning appointment_id, balance_amount, payment_method, nailist_id`;
    await tx`update appointments set status = 'COMPLETED' where id = ${id}`;
    // The newest work first: each photo goes before the artist's others (the page shows the first 10)
    for (const url of urls) {
      await tx`
        insert into nailist_gallery (nailist_id, image_url, position)
        values (${nailistId}, ${url}, (select coalesce(min(position), 1) - 1 from nailist_gallery where nailist_id = ${nailistId}))`;
    }
    return saved;
  });
  return Response.json({ completion, photos: urls.length });
}));
