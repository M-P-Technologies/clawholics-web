// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({ getSql: () => vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { isEligibleForChanges } = await import("../server/appointments");
const { isValidXenditCallback, validatePaymentSettings } = await import("../server/payments");
const { escapeHtml } = await import("../server/email");
const { toId } = await import("../server/http");

afterEach(() => vi.unstubAllEnvs());

describe("isEligibleForChanges (72 hours before, Manila time)", () => {
  // 2026-10-10 00:00 Manila = 2026-10-09 16:00 UTC
  const now = Date.UTC(2026, 9, 9, 16, 0);

  it("TC-HLP-01: exactly 72 hours ahead is eligible, a minute less is not", () => {
    expect(isEligibleForChanges("2026-10-13", "12:00 AM", now)).toBe(true);
    expect(isEligibleForChanges("2026-10-12", "11:59 PM", now)).toBe(false);
  });

  it("TC-HLP-02: reads 12-hour and 24-hour times", () => {
    expect(isEligibleForChanges("2026-10-13", "1:00 PM", now)).toBe(true);
    expect(isEligibleForChanges("2026-10-13", "13:00", now)).toBe(true);
    expect(isEligibleForChanges("2026-10-12", "12:00 PM", now)).toBe(false);
  });

  it("TC-HLP-03: unreadable dates or times are never eligible", () => {
    expect(isEligibleForChanges("next week", "10:00 AM", now)).toBe(false);
    expect(isEligibleForChanges("2026-12-01", "noon", now)).toBe(false);
  });
});

describe("validatePaymentSettings", () => {
  it("TC-HLP-04: accepts a valid update and rejects bad amounts and methods", () => {
    expect(validatePaymentSettings({ downpayment_amount: 500, payment_methods: ["GCASH", "MANUAL"] })).toBeNull();
    expect(validatePaymentSettings({ downpayment_amount: 500, payment_methods: ["PAYMAYA", "GRABPAY", "SHOPEEPAY", "CREDIT_CARD", "QRPH"] })).toBeNull();
    expect(validatePaymentSettings({ downpayment_amount: 0, payment_methods: ["GCASH"] })).toMatch(/whole number/);
    expect(validatePaymentSettings({ downpayment_amount: 1.5, payment_methods: ["GCASH"] })).toMatch(/whole number/);
    expect(validatePaymentSettings({ downpayment_amount: 500, payment_methods: [] })).toMatch(/non-empty/);
    expect(validatePaymentSettings({ downpayment_amount: 500, payment_methods: ["BITCOIN"] })).toMatch(/may only contain/);
    expect(validatePaymentSettings({ downpayment_amount: 500, payment_methods: ["GCASH", "GCASH"] })).toMatch(/duplicates/);
    expect(validatePaymentSettings(null)).toMatch(/whole number/);
  });
});

describe("isValidXenditCallback", () => {
  const req = (token?: string) => new Request("http://x", { method: "POST", headers: token ? { "x-callback-token": token } : {} });

  it("TC-HLP-05: needs the configured token, exactly", () => {
    vi.stubEnv("XENDIT_CALLBACK_TOKEN", "secret-token");
    expect(isValidXenditCallback(req("secret-token"))).toBe(true);
    expect(isValidXenditCallback(req("secret-tokeN"))).toBe(false);
    expect(isValidXenditCallback(req("secret"))).toBe(false);
    expect(isValidXenditCallback(req())).toBe(false);
  });

  it("TC-HLP-06: refuses every callback when no token is configured", () => {
    vi.stubEnv("XENDIT_CALLBACK_TOKEN", "");
    expect(isValidXenditCallback(req(""))).toBe(false);
    expect(isValidXenditCallback(req("anything"))).toBe(false);
  });
});

describe("escapeHtml and toId", () => {
  it("TC-HLP-07: escapes markup in client-entered email values", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">Ana & 'Bea'`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;Ana &amp; &#39;Bea&#39;");
    expect(escapeHtml(null)).toBe("");
  });

  it("TC-HLP-08: toId accepts positive integer ids only, within Postgres integer range", () => {
    expect(toId("42")).toBe(42);
    expect(toId(7)).toBe(7);
    for (const bad of ["abc", "4.2", "-1", "0", "", " ", "1e3", "99999999999", null, undefined, 2 ** 31]) {
      expect(toId(bad)).toBeNull();
    }
  });
});
