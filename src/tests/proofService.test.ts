import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/uploadService", () => ({ compressImageToWebp: vi.fn() }));

import { compressImageToWebp } from "../services/uploadService";
import { ApiError } from "../services/catalogService";
import {
  PROOF_UPLOAD_OPTIONS,
  fetchProofs,
  isProofApiUnavailable,
  reviewProof,
  uploadProof,
  validateProofFile,
} from "../services/proofService";

const auth = { token: "tok", clerkId: "user_1" };

const mockFetch = (status: number, body: unknown) => {
  const fn = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", fn);
  return fn;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("proofService requests", () => {
  it("fetchProofs sends the appointment id and the auth headers", async () => {
    const fn = mockFetch(200, []);
    await fetchProofs(7, auth);
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toContain("/payment/proofs?appointment_id=7");
    expect(init.headers).toMatchObject({
      "x-clawholics-origin": "frontend",
      Authorization: "Bearer tok",
      clerk_id: "user_1",
    });
  });

  it("uploadProof posts the compressed image and appointment id as multipart", async () => {
    const compressed = new File([new Uint8Array(10)], "p.webp", { type: "image/webp" });
    vi.mocked(compressImageToWebp).mockResolvedValue(compressed);
    const fn = mockFetch(201, { id: 1, status: "PENDING" });
    const file = new File([new Uint8Array(5)], "p.png", { type: "image/png" });

    await uploadProof(7, file, auth);

    expect(compressImageToWebp).toHaveBeenCalledWith(file, PROOF_UPLOAD_OPTIONS);
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toContain("/payment/proofs");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get("file")).toBe(compressed);
    expect(init.body.get("appointment_id")).toBe("7");
    // The browser sets the multipart Content-Type (with its boundary) itself
    expect(init.headers).not.toHaveProperty("Content-Type");
    expect(init.headers).toMatchObject({ "x-clawholics-origin": "frontend", Authorization: "Bearer tok" });
  });

  it("uploadProof does not post when compression fails or the file is invalid", async () => {
    vi.mocked(compressImageToWebp).mockRejectedValue(new Error("too big"));
    const fn = mockFetch(201, {});
    const file = new File([new Uint8Array(5)], "p.png", { type: "image/png" });
    await expect(uploadProof(7, file, auth)).rejects.toThrow("too big");
    await expect(uploadProof(7, new File(["x"], "a.pdf", { type: "application/pdf" }), auth)).rejects.toThrow(/Only JPG/);
    expect(fn).not.toHaveBeenCalled();
  });

  it("uploadProof refuses an image still over the size limit after compression", async () => {
    const huge = new File([new Uint8Array(PROOF_UPLOAD_OPTIONS.maxSizeKB! * 1024 + 1)], "p.webp", { type: "image/webp" });
    vi.mocked(compressImageToWebp).mockResolvedValue(huge);
    const fn = mockFetch(201, {});
    await expect(uploadProof(7, new File(["x"], "p.png", { type: "image/png" }), auth)).rejects.toThrow(/still larger/);
    expect(fn).not.toHaveBeenCalled();
  });

  it("reviewProof PUTs the decision", async () => {
    const fn = mockFetch(200, { id: 3, status: "REJECTED" });
    await reviewProof(3, { status: "REJECTED", admin_note: "Blurry" }, auth);
    const [url, init] = fn.mock.calls[0];
    expect(String(url)).toContain("/payment/proofs/3/review");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ status: "REJECTED", admin_note: "Blurry" });
  });

  it("a 404 is recognised as 'backend not deployed yet'", async () => {
    mockFetch(404, { message: "Not found" });
    const err = await fetchProofs(7, auth).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(isProofApiUnavailable(err)).toBe(true);
    expect(isProofApiUnavailable(new ApiError("x", 500))).toBe(false);
    expect(isProofApiUnavailable(new Error("x"))).toBe(false);
  });
});

describe("validateProofFile", () => {
  it("accepts jpg, png and webp", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateProofFile(new File([new Uint8Array(1)], "a", { type }))).toBeNull();
    }
  });

  it("rejects other types", () => {
    const pdf = new File([new Uint8Array(1)], "a.pdf", { type: "application/pdf" });
    expect(validateProofFile(pdf)).toMatch(/Only JPG, PNG, or WEBP/);
  });

  it("rejects files over 8MB", () => {
    const big = new File([new Uint8Array(1)], "a.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 9 * 1024 * 1024 });
    expect(validateProofFile(big)).toMatch(/8MB or smaller/);
  });
});
