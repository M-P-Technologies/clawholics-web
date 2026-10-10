import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../services/catalogService";
import {
  addNote,
  deleteNote,
  fetchNextSteps,
  fetchNotes,
  isNotesApiUnavailable,
  saveNextSteps,
  updateNote,
} from "../services/clientNotesService";

const auth = { token: "tok", clerkId: "admin_1" };

const mockFetch = (status: number, body: unknown = {}) => {
  const fn = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", fn);
  return fn;
};

afterEach(() => vi.unstubAllGlobals());

describe("clientNotesService", () => {
  it("fetchNotes GETs the client's notes with the auth headers", async () => {
    const fn = mockFetch(200, []);
    await fetchNotes(5, auth);
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toContain("/clients/5/notes");
    expect(init.method).toBe("GET");
    expect(init.headers).toMatchObject({
      "x-clawholics-origin": "frontend",
      Authorization: "Bearer tok",
      clerk_id: "admin_1",
    });
  });

  it("addNote POSTs the note text", async () => {
    const fn = mockFetch(201, { id: 9 });
    await addNote(5, "Prefers short nails", auth);
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toContain("/clients/5/notes");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ note: "Prefers short nails" });
  });

  it("updateNote PUTs to the note's url", async () => {
    const fn = mockFetch(200, { id: 9 });
    await updateNote(5, 9, "Edited", auth);
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toContain("/clients/5/notes/9");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ note: "Edited" });
  });

  it("deleteNote DELETEs and accepts an empty 204", async () => {
    const fn = mockFetch(204);
    await expect(deleteNote(5, 9, auth)).resolves.toBeUndefined();
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toContain("/clients/5/notes/9");
    expect(init.method).toBe("DELETE");
  });

  it("fetchNextSteps and saveNextSteps use the next-steps url", async () => {
    let fn = mockFetch(200, { client_user_id: 5, text: "" });
    await fetchNextSteps(5, auth);
    expect(String(fn.mock.calls[0][0])).toContain("/clients/5/next-steps");

    fn = mockFetch(200, { client_user_id: 5, text: "Book a refill" });
    await saveNextSteps(5, "Book a refill", auth);
    const [, init] = fn.mock.calls[0];
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ text: "Book a refill" });
  });

  it("recognises 404 as 'backend not deployed yet'", async () => {
    mockFetch(404, { message: "Not found" });
    const err = await fetchNotes(5, auth).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(isNotesApiUnavailable(err)).toBe(true);
    expect(isNotesApiUnavailable(new ApiError("x", 500))).toBe(false);
  });
});
