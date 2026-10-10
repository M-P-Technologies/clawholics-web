import { afterEach, describe, expect, it, vi } from "vitest";
import { createCategory } from "../services/catalogService";
import { BookingError, createBooking } from "../services/bookingService";

const mockFetch = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }));

afterEach(() => vi.unstubAllGlobals());

const payload = {
  user_id: 1, service_id: 1, service_name: "s", nailist_name: "n", nailist_id: 1,
  appointment_date: "2026-01-01", appointment_time: "10:00",
};

describe("catalogService error text", () => {
  it("uses a string message, then a string error, else the fallback", async () => {
    mockFetch(400, { message: "Bad name" });
    await expect(createCategory("x", { token: null })).rejects.toThrow("Bad name");
    mockFetch(400, { error: "Nope" });
    await expect(createCategory("x", { token: null })).rejects.toThrow("Nope");
    mockFetch(400, { error: true });
    await expect(createCategory("x", { token: null })).rejects.toThrow("Request failed");
  });
});

describe("createBooking errors", () => {
  it("carries status, message and field", async () => {
    mockFetch(400, { error: true, field: "variant_id", message: "Invalid option" });
    const err = await createBooking(payload).catch((e) => e);
    expect(err).toBeInstanceOf(BookingError);
    expect(err).toMatchObject({ status: 400, field: "variant_id", message: "Invalid option" });
  });
});
