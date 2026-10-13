// @vitest-environment node
// Integration tests for the client page and its notes against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }),
}));
vi.mock("next/server", () => ({ after: () => {} }));

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });

describe.skipIf(!TEST_DATABASE_URL)("client pages and notes (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let clients: typeof import("../../server/handlers/clients");
  const ids: Record<string, number> = {};
  const call = (
    handler: Parameters<typeof callRoute>[0],
    url: string,
    params: object,
    options: { method?: string; body?: unknown } = {},
  ) => callRoute(handler, url, { ...options, params });

  beforeAll(async () => {
    db = await resetTestDatabase();
    await db`truncate users, scan_history restart identity cascade`;
    const [admin] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin') returning id`;
    await db`insert into admin_profiles (user_id, first_name, last_name) values (${admin.id}, 'Max', 'Owner')`;
    const [ana] = await db<{ id: number }[]>`insert into users (clerk_id, email, role, created_at) values ('user_ana', 'ana@x.test', 'customer', '2026-06-01 05:00:00') returning id`;
    await db`insert into customer_profiles (user_id, first_name, last_name, phone, stamps, instagram_handle, preferred_contact_method)
      values (${ana.id}, 'Ana', 'Cruz', '09171234567', 3, '@ana', 'Instagram')`;
    const [bea] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_bea', 'bea@x.test', 'customer') returning id`;
    await db`insert into customer_profiles (user_id, first_name, last_name) values (${bea.id}, 'Bea', 'Lim')`;
    const [guest] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('walkin_guest', 'walkin-guest@clawholics.local', 'customer') returning id`;

    const [gel] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel', 800, 500, 'tiered') returning id`;
    const [maxine] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Maxine', 1) returning id`;
    const appt = async (user: number, date: string, status: string) =>
      (await db<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status)
        values (${user}, ${gel.id}, 'Gel', ${maxine.id}, 'Maxine', ${date}, '10:00-11:00', ${status}) returning id`)[0].id;
    Object.assign(ids, {
      admin: admin.id, ana: ana.id, bea: bea.id, guest: guest.id,
      a1: await appt(ana.id, "2026-08-01", "COMPLETED"),
      a2: await appt(ana.id, "2026-09-05", "COMPLETED"),
      a3: await appt(ana.id, "2026-09-20", "CANCELLED"),
      a4: await appt(ana.id, "2026-11-02", "CONFIRMED"),
      b1: await appt(bea.id, "2026-10-01", "COMPLETED"),
    });
    clients = await import("../../server/handlers/clients");
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("are for admins only", async () => {
    as("user_ana");
    expect((await call(clients.getClient, `/api/clients/${ids.ana}`, { id: String(ids.ana) })).status).toBe(403);
    as(null);
    expect((await call(clients.listClientNotes, `/api/clients/${ids.ana}/notes`, { id: String(ids.ana) })).status).toBe(401);
  });

  it("show a client's profile, a summary and every appointment, newest first", async () => {
    as("user_admin");
    const { status, body } = await call(clients.getClient, `/api/clients/${ids.ana}`, { id: String(ids.ana) });
    expect(status).toBe(200);
    expect(body).toMatchObject({
      client: {
        id: ids.ana, first_name: "Ana", last_name: "Cruz", email: "ana@x.test", phone: "09171234567",
        instagram_handle: "@ana", preferred_contact_method: "Instagram", created_at: "2026-06-01 05:00:00",
      },
      // two completed Gels with a master: 800 each; the confirmed one is still to come
      summary: { visits: 2, totalSpent: 1600, lastVisit: "2026-09-05", nextVisit: "2026-11-02", stamps: 3 },
    });
    const appts = (body as { appointments: { id: number; status: string; price: number | null }[] }).appointments;
    expect(appts.map((a) => a.id)).toEqual([ids.a4, ids.a3, ids.a2, ids.a1]);
    expect(appts[0]).toMatchObject({ service_name: "Gel", nailist_name: "Maxine", appointment_time: "10:00-11:00", status: "CONFIRMED", price: 800 });
  });

  it("have no page for an unknown user, the shared walk-in guest, or an admin", async () => {
    as("user_admin");
    for (const id of [999999, ids.guest, ids.admin]) {
      expect((await call(clients.getClient, `/api/clients/${id}`, { id: String(id) })).status).toBe(404);
    }
  });

  it("keep general notes and notes on one appointment, with who wrote them", async () => {
    as("user_admin");
    const p = { id: String(ids.ana) };
    const url = `/api/clients/${ids.ana}/notes`;
    expect((await call(clients.addClientNote, url, p, { method: "POST", body: { note: "  " } })).status).toBe(400);
    // an appointment of another client can't carry this client's note
    expect((await call(clients.addClientNote, url, p, { method: "POST", body: { note: "x", appointment_id: ids.b1 } })).status).toBe(400);

    const general = await call(clients.addClientNote, url, p, { method: "POST", body: { note: "Prefers mornings" } });
    expect(general.status).toBe(201);
    expect(general.body).toMatchObject({ client_user_id: ids.ana, appointment_id: null, author_admin_id: ids.admin, author_name: "Max Owner", note: "Prefers mornings" });
    const onVisit = await call(clients.addClientNote, url, p, { method: "POST", body: { note: "Asked for almond shape", appointment_id: ids.a2 } });
    expect(onVisit.body).toMatchObject({ appointment_id: ids.a2, note: "Asked for almond shape" });

    const list = (await call(clients.listClientNotes, url, p)).body as { id: number; note: string }[];
    expect(list.map((n) => n.note).sort()).toEqual(["Asked for almond shape", "Prefers mornings"]);
    expect((await call(clients.listClientNotes, `/api/clients/${ids.bea}/notes`, { id: String(ids.bea) })).body).toEqual([]);

    const noteId = (general.body as { id: number }).id;
    const edited = await call(clients.updateClientNote, `${url}/${noteId}`, { ...p, noteId: String(noteId) }, { method: "PUT", body: { note: "Prefers 9am" } });
    expect(edited.body).toMatchObject({ id: noteId, note: "Prefers 9am" });
    // a note is only reachable through its own client
    expect((await call(clients.updateClientNote, `/api/clients/${ids.bea}/notes/${noteId}`, { id: String(ids.bea), noteId: String(noteId) }, { method: "PUT", body: { note: "x" } })).status).toBe(404);

    expect((await call(clients.deleteClientNote, `${url}/${noteId}`, { ...p, noteId: String(noteId) }, { method: "DELETE" })).status).toBe(204);
    expect(((await call(clients.listClientNotes, url, p)).body as unknown[]).length).toBe(1);
  });

  it("keep one next-steps text per client", async () => {
    as("user_admin");
    const p = { id: String(ids.ana) };
    const url = `/api/clients/${ids.ana}/next-steps`;
    expect((await call(clients.getNextSteps, url, p)).body).toEqual({ client_user_id: ids.ana, text: "", updated_by: null, updated_at: null });
    const saved = await call(clients.saveNextSteps, url, p, { method: "PUT", body: { text: "Offer a refill in 3 weeks" } });
    expect(saved.body).toMatchObject({ client_user_id: ids.ana, text: "Offer a refill in 3 weeks", updated_by: ids.admin });
    await call(clients.saveNextSteps, url, p, { method: "PUT", body: { text: "Book her a lash fill" } });
    expect((await call(clients.getNextSteps, url, p)).body).toMatchObject({ text: "Book her a lash fill" });
  });
});
