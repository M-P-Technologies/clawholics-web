// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forwardToWorker, ported } from "../server/worker";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_PROXY_TARGET", "https://worker.example.com/");
  fetchMock.mockResolvedValue(Response.json({ from: "worker" }, { status: 201 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("forwardToWorker", () => {
  it("TC-API-01: forwards method, path without /api, query, headers and body", async () => {
    const req = new Request("http://localhost:5174/api/faqs/3?x=1", {
      method: "PUT",
      headers: { "x-clawholics-origin": "frontend", clerk_id: "user_1", host: "localhost:5174" },
      body: JSON.stringify({ question: "Q" }),
    });

    const res = await forwardToWorker(req);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://worker.example.com/faqs/3?x=1");
    expect(init.method).toBe("PUT");
    expect(init.headers.get("x-clawholics-origin")).toBe("frontend");
    expect(init.headers.get("clerk_id")).toBe("user_1");
    expect(init.headers.has("host")).toBe(false);
    expect(new TextDecoder().decode(init.body)).toBe('{"question":"Q"}');
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ from: "worker" });
  });

  it("TC-API-02: sends no body for GET", async () => {
    await forwardToWorker(new Request("http://localhost/api/faqs"));
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it("TC-API-03: answers 502 when API_PROXY_TARGET is missing", async () => {
    vi.stubEnv("API_PROXY_TARGET", "");
    const res = await forwardToWorker(new Request("http://localhost/api/faqs"));
    expect(res.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ported", () => {
  const handler = vi.fn(async () => Response.json({ from: "next" }));

  afterEach(() => handler.mockClear());

  it("TC-API-04: forwards to the Worker while API_BACKEND is not next", async () => {
    vi.stubEnv("API_BACKEND", "worker");
    const res = await ported(handler)(new Request("http://localhost/api/faqs"), {});
    expect(handler).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ from: "worker" });
  });

  it("TC-API-05: forwards when API_BACKEND is unset", async () => {
    await ported(handler)(new Request("http://localhost/api/faqs"), {});
    expect(handler).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  const fromFrontend = (url = "http://localhost/api/faqs") =>
    new Request(url, { headers: { "x-clawholics-origin": "frontend" } });

  it("TC-API-06: runs the Next handler when API_BACKEND=next", async () => {
    vi.stubEnv("API_BACKEND", "next");
    const res = await ported(handler)(fromFrontend(), {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await res.json()).toEqual({ from: "next" });
  });

  it("TC-API-07: keeps the Worker's 403 for requests without x-clawholics-origin", async () => {
    vi.stubEnv("API_BACKEND", "next");
    const res = await ported(handler)(new Request("http://localhost/api/faqs"), {});
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/^Forbidden: Direct API access is disabled/);
    expect(handler).not.toHaveBeenCalled();
  });

  it("TC-API-08: turns a handler error into a JSON 500 without leaking the error text", async () => {
    vi.stubEnv("API_BACKEND", "next");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = ported(async () => {
      throw new Error("relation \"faqs\" does not exist");
    });
    const res = await failing(fromFrontend(), {});
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal Server Error" });
  });
});

describe("forwardToWorker headers", () => {
  it("TC-API-09: drops connection-level and Clerk-internal headers", async () => {
    const req = new Request("http://localhost/api/booking/create", {
      method: "POST",
      headers: {
        authorization: "Bearer t",
        "x-clerk-auth-token": "secret-session",
        "x-clerk-auth-status": "signed-in",
        "x-middleware-subrequest": "1",
        "keep-alive": "timeout=5",
        connection: "keep-alive",
        "accept-encoding": "gzip",
      },
      body: "{}",
    });
    await forwardToWorker(req);
    const sent: Headers = fetchMock.mock.calls[0][1].headers;
    expect(sent.get("authorization")).toBe("Bearer t");
    for (const name of ["x-clerk-auth-token", "x-clerk-auth-status", "x-middleware-subrequest", "keep-alive", "connection", "accept-encoding"]) {
      expect(sent.has(name)).toBe(false);
    }
  });
});
