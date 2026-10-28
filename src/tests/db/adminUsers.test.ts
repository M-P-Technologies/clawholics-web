// @vitest-environment node
// Integration tests for the ported admin CRUD, directory, profile and loyalty routes against a
// throwaway Postgres (`npm run test:db`). Clerk is mocked; Resend isn't configured, so
// emails are skipped.
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
const clerkUsers = {
  getUser: vi.fn(async () => null as unknown),
  getUserList: vi.fn(async () => ({ data: [] as unknown[], totalCount: 0 })),
  updateUser: vi.fn(async () => ({})),
  updateUserMetadata: vi.fn(async () => ({})),
  deleteUser: vi.fn(async () => ({})),
};
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock(), clerkClient: async () => ({ users: clerkUsers }) }));

const background: Promise<unknown>[] = [];
vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => background.push(fn()) }));

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });

type Handler = (req: Request, ctx: never) => Promise<Response> | Response;

describe.skipIf(!TEST_DATABASE_URL)("admin, directory and loyalty routes (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let catalog: typeof import("../../server/handlers/catalog");
  let nailists: typeof import("../../server/handlers/nailists");
  let users: typeof import("../../server/handlers/users");
  let misc: typeof import("../../server/handlers/misc");
  let settings: typeof import("../../server/handlers/settings");
  let customerId: number;

  const call = (handler: Handler, url: string, options: { method?: string; body?: unknown; params?: object } = {}) =>
    callRoute(handler, url, options);

  beforeAll(async () => {
    db = await resetTestDatabase();
    delete process.env.RESEND_API_KEY;
    await db`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin')`;
    const [customer] = await db<{ id: number }[]>`
      insert into users (clerk_id, email, role, created_at) values ('user_cust', 'cust@x.test', 'customer', '2026-03-05 08:00:00') returning id
    `;
    customerId = customer.id;
    await db`insert into customer_profiles (user_id, first_name, last_name, phone, dob, stamps) values (${customerId}, 'Cara', 'C', '0917', '2000-01-01', 9)`;
    catalog = await import("../../server/handlers/catalog");
    nailists = await import("../../server/handlers/nailists");
    users = await import("../../server/handlers/users");
    misc = await import("../../server/handlers/misc");
    settings = await import("../../server/handlers/settings");
  });

  afterAll(async () => {
    await Promise.allSettled(background);
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("TC-ADM-01: writes need a signed-in admin", async () => {
    as(null);
    expect((await call(catalog.createFaq, "/api/faqs", { method: "POST", body: { question: "q", answer: "a" } })).status).toBe(401);
    as("user_cust");
    expect((await call(catalog.createFaq, "/api/faqs", { method: "POST", body: { question: "q", answer: "a" } })).status).toBe(403);
    expect((await call(catalog.deleteGalleryImage, "/api/gallery/1", { method: "DELETE", params: { id: "1" } })).status).toBe(403);
    expect((await call(users.addStamp, "/api/users/scan/user_cust/stamp", { method: "POST", params: { clerkId: "user_cust" } })).status).toBe(403);
    expect((await call(users.setStamps, "/api/users/stamps", { method: "PUT", body: { clerk_id: "user_cust", stamps: 10 } })).status).toBe(403);
    expect((await call(users.listDirectory, "/api/directory")).status).toBe(403);
  });

  it("TC-ADM-02: content, carousel, FAQs and terms are written like the Worker", async () => {
    as("user_admin");
    const content = await call(catalog.updateContent, "/api/content/home", {
      method: "PUT",
      params: { section: "home" },
      body: { updates: [{ key: "home_title", value: "New title" }, { key: "home_new_key", value: 5 }] },
    });
    expect(content.body).toEqual({ message: "Content updated" });
    const rows = await db`select key, value from content where key in ('home_title', 'home_new_key') order by key`;
    expect(rows).toEqual([{ key: "home_new_key", value: "5" }, { key: "home_title", value: "New title" }]);

    const carousel = await call(catalog.updateCarousel, "/api/carousel", { method: "PUT", body: { images: [{ image_url: "b.webp" }, { image_url: "a.webp" }] } });
    expect(carousel.body).toEqual({ message: "Carousel updated" });
    expect(await db`select image_url, position from home_carousel order by position`).toEqual([
      { image_url: "b.webp", position: 1 },
      { image_url: "a.webp", position: 2 },
    ]);
    expect((await call(catalog.updateCarousel, "/api/carousel", { method: "PUT", body: {} })).status).toBe(400);

    const faq = await call(catalog.createFaq, "/api/faqs", { method: "POST", body: { question: "Q?", answer: "A." } });
    expect(faq.status).toBe(201);
    expect(faq.body).toEqual({ id: expect.any(Number), question: "Q?", answer: "A.", display_order: 0 });
    const faqId = String(faq.body.id);
    const updated = await call(catalog.updateFaq, `/api/faqs/${faqId}`, { method: "PUT", params: { id: faqId }, body: { answer: "B." } });
    expect(updated.body).toMatchObject({ question: "Q?", answer: "B.", display_order: 0 });
    expect((await call(catalog.updateFaq, "/api/faqs/99999", { method: "PUT", params: { id: "99999" }, body: {} })).status).toBe(404);
    expect((await call(catalog.deleteFaq, `/api/faqs/${faqId}`, { method: "DELETE", params: { id: faqId } })).body).toEqual({ message: "FAQ deleted" });

    const tac = await call(catalog.createTac, "/api/tacs", { method: "POST", body: { section: "S", content: "C", display_order: 3 } });
    expect(tac.body).toEqual({ id: expect.any(Number), section: "S", content: "C", display_order: 3 });
  });

  it("TC-ADM-03: categories reject duplicates and need reassign_to while they have services", async () => {
    as("user_admin");
    const created = await call(catalog.createCategory, "/api/categories", { method: "POST", body: { name: "Waxing" } });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Waxing", slug: "waxing", is_active: 1, position: 5 });
    expect((await call(catalog.createCategory, "/api/categories", { method: "POST", body: { name: "waxing" } })).status).toBe(409);

    const renamed = await call(catalog.updateCategory, "/api/categories/2", { method: "PUT", params: { id: "2" }, body: { name: "Pedi" } });
    expect(renamed.body.name).toBe("Pedi");
    expect((await db`select distinct category from services where category_id = 2`)[0].category).toBe("Pedi");

    const blocked = await call(catalog.deleteCategory, "/api/categories/2", { method: "DELETE", params: { id: "2" } });
    expect(blocked.status).toBe(409);
    expect(blocked.body.service_count).toBe(2);
    const moved = await call(catalog.deleteCategory, `/api/categories/2?reassign_to=${created.body.id}`, { method: "DELETE", params: { id: "2" } });
    expect(moved.body).toEqual({ message: "Category deleted", reassigned: 2, reassigned_to: created.body.id });

    const reorder = await call(catalog.reorderCategories, "/api/categories/reorder", { method: "PUT", body: { ids: [created.body.id, 1] } });
    expect(reorder.body).toEqual({ message: "Categories reordered" });
    expect((await call(catalog.reorderCategories, "/api/categories/reorder", { method: "PUT", body: { ids: [1, 1] } })).status).toBe(400);
  });

  it("TC-ADM-04: services validate pricing, create categories by name, and archive when booked", async () => {
    as("user_admin");
    const badPrice = await call(catalog.createService, "/api/services", { method: "POST", body: { name: "X", master_price: 500 } });
    expect(badPrice).toEqual({ status: 400, body: { message: "Fields cannot be empty." } });

    const created = await call(catalog.createService, "/api/services", {
      method: "POST",
      body: { name: "Brow Lamination", category: "Brows", pricing_mode: "single", master_price: 800, duration: "1 hr" },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Brow Lamination", category: "Brows", category_name: "Brows", master_price: 800, junior_price: 800, nailist_ids: null });
    const id = String(created.body.id);

    const updated = await call(catalog.updateService, `/api/services/${id}`, {
      method: "PUT",
      params: { id },
      body: { name: "Brow Lam", master_price: 900, duration: "1 hr" },
    });
    expect(updated.body).toMatchObject({ name: "Brow Lam", category: "Brows", master_price: 900, junior_price: 900, pricing_mode: "single" });

    await db`insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status)
      values (${customerId}, 1, 'Softgel Extensions', 1, 'Miss Max', '2099-02-01', '10:00 AM', 'COMPLETED')`;
    expect((await call(catalog.deleteService, "/api/services/1", { method: "DELETE", params: { id: "1" } })).body.archived).toBe(true);
    expect((await call(catalog.deleteService, `/api/services/${id}`, { method: "DELETE", params: { id } })).body.deleted).toBe(true);
  });

  it("TC-ADM-04b: a service's options are saved, returned in order, and replaced on update", async () => {
    as("user_admin");
    const created = await call(catalog.createService, "/api/services", {
      method: "POST",
      body: {
        name: "Nail Art", category: "Art", pricing_type: "flat", price: 0, master_price: 0, junior_price: 0, duration: "1 hr",
        variants: [{ name: "Simple", price: 300 }, { name: "Full set", price: 900 }],
      },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ pricing_type: "flat", price: 300, master_price: 300, junior_price: 300 });
    expect(created.body.variants.map((v: { name: string; price: number }) => [v.name, v.price])).toEqual([["Simple", 300], ["Full set", 900]]);
    const id = String(created.body.id);

    const updated = await call(catalog.updateService, `/api/services/${id}`, {
      method: "PUT",
      params: { id },
      body: { name: "Nail Art", pricing_type: "flat", price: 250, duration: "1 hr", variants: [{ name: "Chrome", price: 450 }] },
    });
    expect(updated.body).toMatchObject({ pricing_type: "flat", price: 250 });
    expect(updated.body.variants.map((v: { name: string }) => v.name)).toEqual(["Chrome"]);

    const bad = await call(catalog.updateService, `/api/services/${id}`, {
      method: "PUT",
      params: { id },
      body: { name: "Nail Art", pricing_type: "flat", price: 250, variants: [{ name: "", price: 100 }] },
    });
    expect(bad.status).toBe(400);
  });

  it("TC-ADM-05: the gallery holds up to 10 photos", async () => {
    as("user_admin");
    const [{ count }] = await db<{ count: number }[]>`select count(*)::int as count from service_gallery where service_id = 3`;
    for (let i = count; i < 10; i++) {
      const added = await call(catalog.addGalleryImage, "/api/services/3/gallery", { method: "POST", params: { id: "3" }, body: { image_url: `g${i}.webp`, position: i + 1 } });
      expect(added.status).toBe(201);
    }
    const full = await call(catalog.addGalleryImage, "/api/services/3/gallery", { method: "POST", params: { id: "3" }, body: { image_url: "x.webp", position: 11 } });
    expect(full).toEqual({ status: 400, body: { message: "A service can only have up to 10 photos." } });
  });

  it("TC-ADM-06: nailists, their services, time slots and days off", async () => {
    as("user_admin");
    const created = await call(nailists.createNailist, "/api/nailists", { method: "POST", body: { name: "Miss New", position: "Master Technician", bio: "Hi" } });
    expect(created.body).toEqual({ id: expect.any(Number), name: "Miss New", category_id: 1, position: "Master Technician", specialty: null, bio: "Hi", image: null });
    const id = String(created.body.id);
    const params = { id };

    expect((await call(nailists.setNailistServices, `/api/nailists/${id}/services`, { method: "PUT", params, body: { serviceIds: [3, 2] } })).body).toEqual([3, 2]);
    expect((await call(nailists.getNailistServices, `/api/nailists/${id}/services`, { params })).body).toEqual([2, 3]);
    expect((await call(nailists.setNailistServices, `/api/nailists/${id}/services`, { method: "PUT", params, body: { serviceIds: [99999] } })).status).toBe(400);

    await call(nailists.setNailistTimeSlots, `/api/nailists/${id}/time-slots`, { method: "PUT", params, body: { timeSlots: ["13:00-14:00", "9:0-10:00", "bad", "15:00-14:00"] } });
    expect((await call(nailists.getNailistTimeSlots, `/api/nailists/${id}/time-slots`, { params })).body).toEqual(["09:00-10:00", "13:00-14:00"]);

    const dayOffs = { regularDays: [0, 3], customDates: ["2099-01-02"] };
    expect((await call(nailists.setNailistDayOffs, `/api/nailists/${id}/day-offs`, { method: "PUT", params, body: dayOffs })).body).toEqual(dayOffs);
    expect((await call(nailists.getNailistDayOffs, `/api/nailists/${id}/day-offs`, { params })).body).toEqual(dayOffs);
    expect((await call(nailists.setNailistDayOffs, `/api/nailists/${id}/day-offs`, { method: "PUT", params, body: { regularDays: [7], customDates: [] } })).status).toBe(400);

    const full = await call(nailists.getNailistById, `/api/nailists/${id}`, { params });
    expect(full.body).toMatchObject({ name: "Miss New", service_ids: [2, 3] });
    expect((await call(nailists.deleteNailist, `/api/nailists/${id}`, { method: "DELETE", params })).body).toEqual({ message: "Nailist deleted" });
    expect(await db`select 1 from nailist_time_slots where nailist_id = ${Number(id)}`).toHaveLength(0);
  });

  it("TC-USR-01: profiles are the signed-in user's own", async () => {
    as("user_cust");
    const profile = await call(users.getProfile, "/api/users/profile?clerk_id=user_admin");
    expect(profile.body).toMatchObject({ clerk_id: "user_cust", first_name: "Cara", onboarded: true, member_since_month: "March", member_since_year: "2026" });

    const saved = await call(users.updateProfile, "/api/users/profile", {
      method: "PUT",
      body: { firstName: "Carla", lastName: "C", phone: "0917", dob: "2000-01-01", instagramHandle: "@carla", tiktokHandle: "@carla.tok" },
    });
    expect(saved.body).toEqual({ message: "Profile updated" });
    expect((await db`select first_name, instagram_handle, tiktok_handle from customer_profiles where user_id = ${customerId}`)[0]).toEqual({ first_name: "Carla", instagram_handle: "carla", tiktok_handle: "carla.tok" });
    expect(clerkUsers.updateUser).toHaveBeenCalledWith("user_cust", { firstName: "Carla", lastName: "C" });

    // The birthday is set once: a new one is ignored (it would move the birthday voucher)
    await call(users.updateProfile, "/api/users/profile", { method: "PUT", body: { firstName: "Carla", lastName: "C", phone: "0917", dob: "2000-10-01" } });
    expect((await db`select dob from customer_profiles where user_id = ${customerId}`)[0].dob).toBe("2000-01-01");

    // The email comes from Clerk, never the body (it can't be used to claim another identity)
    clerkUsers.getUser.mockResolvedValueOnce({ id: "user_cust", emailAddresses: [{ emailAddress: "cust@x.test" }] });
    await call(users.updateProfile, "/api/users/profile", { method: "PUT", body: { firstName: "Carla", lastName: "C", email: "victim@x.test" } });
    expect((await db`select email from users where id = ${customerId}`)[0].email).toBe("cust@x.test");

    expect((await call(users.getUserAppointments, "/api/users/appointments?clerk_id=user_admin")).status).toBe(403);
    expect((await call(users.getUserAppointments, "/api/users/appointments?clerk_id=user_cust")).body).toHaveLength(1);
    expect((await call(users.getUserByClerkId, "/api/users/clerk/user_admin", { params: { clerkId: "user_admin" } })).status).toBe(403);
  });

  it("TC-USR-01b: the PATCH saves only the contact details (booking's Instagram/Facebook)", async () => {
    as(null);
    expect((await call(users.updateContactDetails, "/api/users/profile", { method: "PATCH", body: { facebook_handle: "x" } })).status).toBe(401);

    as("user_cust");
    const [before] = await db`select first_name, last_name, phone, dob, gender from customer_profiles where user_id = ${customerId}`;
    const saved = await call(users.updateContactDetails, "/api/users/profile", { method: "PATCH", body: { facebook_handle: "Carla C", first_name: "Hacked" } });
    expect(saved.body).toEqual({ message: "Contact details updated" });
    const [after] = await db`select first_name, last_name, phone, dob, gender, facebook_handle, instagram_handle from customer_profiles where user_id = ${customerId}`;
    // The name, phone, birthday and gender are left as they were, and so is the handle not sent
    expect(after).toEqual({ ...before, facebook_handle: "Carla C", instagram_handle: "carla" });

    expect((await call(users.updateContactDetails, "/api/users/profile", { method: "PATCH", body: { instagram_handle: "x".repeat(101) } })).status).toBe(400);
    // An account with no client profile yet (e.g. an admin) has nothing to update
    as("user_admin");
    expect((await call(users.updateContactDetails, "/api/users/profile", { method: "PATCH", body: { facebook_handle: "x" } })).status).toBe(404);
  });

  it("TC-USR-02: stamps are added and redeemed by an admin scan, or redeemed by the client at 10", async () => {
    as("user_cust");
    expect((await call(users.redeemOwnReward, "/api/users/redeem", { method: "POST" })).status).toBe(400);

    as("user_admin");
    const scanned = await call(users.scanClient, "/api/users/scan/user_cust", { params: { clerkId: "user_cust" } });
    expect(scanned.body).toEqual({ id: "user_cust", name: "Carla C", stamps: 9 });
    const stamped = await call(users.addStamp, "/api/users/scan/user_cust/stamp", { method: "POST", params: { clerkId: "user_cust" } });
    expect(stamped.body).toEqual({ success: true, newStamps: 10 });
    expect((await call(users.addStamp, "/api/users/scan/user_nobody/stamp", { method: "POST", params: { clerkId: "user_nobody" } })).status).toBe(404);

    as("user_cust");
    expect((await call(users.redeemOwnReward, "/api/users/redeem", { method: "POST" })).body).toEqual({ success: true, newStamps: 0 });

    as("user_admin");
    // An admin can't redeem a card that isn't full, or stamp one that is
    expect((await call(users.redeemScannedReward, "/api/users/scan/user_cust/redeem", { method: "POST", params: { clerkId: "user_cust" } })).status).toBe(400);
    await db`update customer_profiles set stamps = 10 where user_id = ${customerId}`;
    expect((await call(users.addStamp, "/api/users/scan/user_cust/stamp", { method: "POST", params: { clerkId: "user_cust" } })).status).toBe(400);
    expect(
      (await call(users.redeemScannedReward, "/api/users/scan/user_cust/redeem", { method: "POST", params: { clerkId: "user_cust" } })).body,
    ).toEqual({ success: true, newStamps: 0 });
    const history = await call(users.getScanHistory, "/api/users/scan-history");
    expect(history.body.map((h: { action: string }) => h.action).sort()).toEqual(["redeem", "stamp"]);
    expect(history.body[0]).toEqual({ id: expect.any(String), userId: "user_cust", clientName: "Carla C", action: expect.any(String), time: expect.stringMatching(/^\d{1,2}:\d{2} [AP]M$/) });
    // A page at a time: the rows of the page, and how many scans there are in all
    const paged = await call(users.getScanHistory, "/api/users/scan-history?page=2&pageSize=1");
    expect(paged.body).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(paged.body.rows).toHaveLength(1);
    expect((await call(users.getScanHistory, "/api/users/scan-history?page=0")).status).toBe(400);
  });

  it("the settings set the stamps a reward needs, and the client redeems at that number", async () => {
    const body = { downpayment_amount: 500, payment_methods: ["QRPH"], birthday_discount_pct: 20, loyalty_stamps_required: 3, booking_hold_minutes: 5 };
    as("user_cust");
    expect((await call(settings.updateSettings, "/api/settings", { method: "PUT", body })).status).toBe(403);
    expect((await call(settings.getLoyaltySettings, "/api/settings/loyalty")).body).toEqual({ stamps_required: 10 });

    as("user_admin");
    expect((await call(settings.updateSettings, "/api/settings", { method: "PUT", body: { ...body, loyalty_stamps_required: 21 } })).status).toBe(400);
    expect((await call(settings.updateSettings, "/api/settings", { method: "PUT", body: { ...body, booking_hold_minutes: 0 } })).status).toBe(400);
    expect((await call(settings.updateSettings, "/api/settings", { method: "PUT", body })).body).toEqual(body);
    expect((await call(settings.getSettings, "/api/settings")).body).toEqual(body);
    expect((await call(settings.getLoyaltySettings, "/api/settings/loyalty")).body).toEqual({ stamps_required: 3 });

    await db`update customer_profiles set stamps = 2 where user_id = ${customerId}`;
    as("user_cust");
    expect((await call(users.redeemOwnReward, "/api/users/redeem", { method: "POST" })).status).toBe(400);
    await db`update customer_profiles set stamps = 3 where user_id = ${customerId}`;
    expect((await call(users.redeemOwnReward, "/api/users/redeem", { method: "POST" })).body).toEqual({ success: true, newStamps: 0 });
    await db`update site_settings set value = '10' where key = 'loyalty_stamps_required'`;
  });

  it("TC-USR-03: the directory adds, edits and deletes users", async () => {
    as("user_admin");
    const created = await call(users.createDirectoryUser, "/api/directory", {
      method: "POST",
      body: { firstName: "Walk", lastName: "In", email: "walkin@x.test", phoneNumber: "0918", role: "customer" },
    });
    expect(created.status).toBe(201);
    const dup = await call(users.createDirectoryUser, "/api/directory", { method: "POST", body: { firstName: "W", email: "walkin@x.test" } });
    expect(dup).toEqual({ status: 200, body: { error: "Email already exists in the system." } });

    const id = String(created.body.id);
    const edited = await call(users.updateDirectoryUser, `/api/directory/${id}`, {
      method: "PUT",
      params: { id },
      body: { firstName: "Walker", lastName: "In", phoneNumber: "0919", preferredContactMethod: "sms" },
    });
    expect(edited.body).toMatchObject({ id, firstName: "Walker" });

    const list = await call(users.listDirectory, "/api/directory");
    const row = list.body.find((u: { email: string }) => u.email === "walkin@x.test");
    expect(row).toEqual({
      id: Number(id), clerk_id: expect.stringMatching(/^manual_/), firstName: "Walker", lastName: "In", email: "walkin@x.test",
      phoneNumber: "0919", altPhone: null, preferredContactMethod: "sms", facebookHandle: null, instagramHandle: null, tiktokHandle: null, role: "customer",
    });

    // The customer has an active (COMPLETED) appointment, so they can't be removed
    const blocked = await call(users.deleteDirectoryUser, "/api/directory/user_cust", { method: "DELETE", params: { id: "user_cust" } });
    expect(blocked.body.error).toMatch(/^Cannot delete this user\. They have 1 active/);
    expect((await call(users.deleteDirectoryUser, "/api/directory/user_admin", { method: "DELETE", params: { id: "user_admin" } })).body.error).toBe("You can't delete your own account.");

    const removed = await call(users.deleteDirectoryUser, `/api/directory/${id}`, { method: "DELETE", params: { id } });
    expect(removed.body.message).toMatch(/completely removed/);
    expect(await db`select 1 from users where id = ${Number(id)}`).toHaveLength(0);
  });

  it("TC-USR-04: promote-admin needs a Clerk account and updates both sides", async () => {
    as("user_admin");
    const missing = await call(users.promoteAdmin, "/api/users/promote-admin", { method: "POST", body: { targetEmail: "ghost@x.test" } });
    expect(missing.body.error).toMatch(/must first sign up/);

    clerkUsers.getUserList.mockResolvedValueOnce({
      data: [{ id: "user_cust", firstName: "Carla", lastName: "C", emailAddresses: [{ emailAddress: "cust@x.test" }], publicMetadata: {} }],
      totalCount: 1,
    });
    const promoted = await call(users.promoteAdmin, "/api/users/promote-admin", { method: "POST", body: { targetEmail: "cust@x.test" } });
    expect(promoted.body).toEqual({ message: "User successfully promoted to admin", status: "promoted", email: "cust@x.test" });
    expect(clerkUsers.updateUserMetadata).toHaveBeenCalledWith("user_cust", { publicMetadata: { role: "admin" } });
    const admins = await call(users.listAdmins, "/api/users/admins");
    expect(admins.body.map((a: { email: string }) => a.email)).toContain("cust@x.test");
  });

  it("TC-USR-04b: the admin list pages with ?page, keeping every admin's Clerk id for the stats", async () => {
    as("user_admin");
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const [row] = await db<{ id: number }[]>`
        insert into users (clerk_id, email, role) values (${`user_pg${n}`}, ${`pg${n}@x.test`}, 'admin') returning id
      `;
      await db`insert into admin_profiles (user_id, first_name, last_name) values (${row.id}, ${`Paged${n}`}, 'Lee')`;
    }
    const all = (await call(users.listAdmins, "/api/users/admins")).body as { clerk_id: string; firstName: string }[];
    const first = await call(users.listAdmins, "/api/users/admins?page=1&pageSize=5");
    expect(first.status).toBe(200);
    expect(first.body.total).toBe(all.length);
    expect(first.body.page).toBe(1);
    expect(first.body.pageSize).toBe(5);
    // The same order as the full list
    expect(first.body.rows.map((a: { clerk_id: string }) => a.clerk_id)).toEqual(all.slice(0, 5).map((a) => a.clerk_id));
    expect([...first.body.clerkIds].sort()).toEqual(all.map((a) => a.clerk_id).sort());

    const second = await call(users.listAdmins, "/api/users/admins?page=2&pageSize=5");
    expect(second.body.rows.map((a: { clerk_id: string }) => a.clerk_id)).toEqual(all.slice(5, 10).map((a) => a.clerk_id));
    // Past the end: no rows, the same total
    const past = await call(users.listAdmins, "/api/users/admins?page=99&pageSize=5");
    expect(past.body.rows).toEqual([]);
    expect(past.body.total).toBe(all.length);
    // The default page size is 5
    expect((await call(users.listAdmins, "/api/users/admins?page=1")).body.pageSize).toBe(5);

    for (const bad of ["page=0", "page=x", "page=1&pageSize=0", "page=1&pageSize=51", "page=1.5"]) {
      expect((await call(users.listAdmins, `/api/users/admins?${bad}`)).status).toBe(400);
    }
    // (user_cust was made an admin above)
    await db`insert into users (clerk_id, email, role) values ('user_pgclient', 'pgclient@x.test', 'customer')`;
    as("user_pgclient");
    expect((await call(users.listAdmins, "/api/users/admins?page=1")).status).toBe(403);
    as("user_admin");
  });

  it("TC-USR-05: promotion follows the Clerk id, not a row that holds the same email", async () => {
    as("user_admin");
    await db`insert into users (clerk_id, email, role) values ('user_attacker', 'new.hire@x.test', 'customer')`;
    clerkUsers.getUserList.mockResolvedValueOnce({
      data: [{ id: "user_newhire", firstName: "New", lastName: "Hire", emailAddresses: [{ emailAddress: "new.hire@x.test" }], publicMetadata: {} }],
      totalCount: 1,
    });
    const res = await call(users.promoteAdmin, "/api/users/promote-admin", { method: "POST", body: { targetEmail: "new.hire@x.test" } });
    expect(res.body.error).toMatch(/Another directory entry already uses/);
    expect((await db`select role from users where clerk_id = 'user_attacker'`)[0].role).toBe("customer");
  });

  it("TC-MSC-01: contact form, /emails and /health", async () => {
    as(null);
    expect((await call(misc.submitContactForm, "/api/submit", { method: "POST", body: { name: "A" } })).status).toBe(400);
    const sent = await call(misc.submitContactForm, "/api/submit", { method: "POST", body: { name: "A", email: "a@x.test", description: "Hi" } });
    expect(sent.body).toEqual({ success: true, message: "Message sent successfully" });
    expect((await call(misc.sendConfirmationEmailRoute, "/api/emails", { method: "POST", body: {} })).body).toEqual({ success: true });
    expect((await call(misc.health, "/api/health")).body).toEqual({ status: "ok", service: "clawholics-api-staging" });
  });
});
