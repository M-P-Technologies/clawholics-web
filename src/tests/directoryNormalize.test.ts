import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDirectoryUsers } from "@/features/admins/api/directoryService";

afterEach(() => vi.unstubAllGlobals());

describe("fetchDirectoryUsers", () => {
  it("keeps the contact details and the database id the cards and client pages need", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([
      { id: 7, clerk_id: "user_ana", firstName: "Ana", lastName: "Cruz", email: "ana@x.test", phoneNumber: "0917", altPhone: "0918",
        preferredContactMethod: "Instagram", facebookHandle: "ana.cruz", instagramHandle: "@ana", role: "customer" },
      { id: 8, clerk_id: null, firstName: "Walk", lastName: "In", email: "", phoneNumber: "0919", role: "customer" },
    ]), { headers: { "content-type": "application/json" } })));
    const [ana, manual] = await fetchDirectoryUsers("tok", "admin_1");
    expect(ana).toMatchObject({
      id: "user_ana", clerk_id: "user_ana", user_id: 7, altPhone: "0918", preferredContactMethod: "Instagram", facebookHandle: "ana.cruz", instagramHandle: "@ana",
    });
    // a row added by hand has no Clerk id: its id is its database id
    expect(manual).toMatchObject({ id: "8", user_id: 8 });
  });
});
