import { describe, expect, it } from "vitest";
import {
  contactRowHref, facebookUrl, instagramUrl, mailHref, preferredContact, smsHref, telHref, tiktokUrl,
} from "@/lib/admin/contactMethod";

describe("phone and email links", () => {
  it("keeps only the digits (and a leading +) in a number", () => {
    expect(telHref("0917 123 4567")).toBe("tel:09171234567");
    expect(telHref("+63 917-123-4567")).toBe("tel:+639171234567");
    expect(smsHref("(0917) 123 4567")).toBe("sms:09171234567");
    expect(mailHref(" ana@x.test ")).toBe("mailto:ana@x.test");
  });
});

describe("social links", () => {
  it("opens a profile, without a leading @", () => {
    expect(instagramUrl("@ana")).toBe("https://www.instagram.com/ana/");
    expect(instagramUrl("ana")).toBe("https://www.instagram.com/ana/");
    expect(tiktokUrl("@ana")).toBe("https://www.tiktok.com/@ana");
  });

  it("opens a link as typed, and a Facebook name as a Messenger chat", () => {
    expect(facebookUrl("https://facebook.com/ana.cruz")).toBe("https://facebook.com/ana.cruz");
    expect(facebookUrl("ana.cruz")).toBe("https://m.me/ana.cruz");
    expect(facebookUrl("Ana Cruz")).toBe("https://m.me/Ana%20Cruz");
  });
});

describe("contactRowHref (the client page's rows)", () => {
  it("makes the contact rows links, and leaves the others", () => {
    expect(contactRowHref("Email", "ana@x.test")).toBe("mailto:ana@x.test");
    expect(contactRowHref("Phone", "0917 123 4567")).toBe("tel:09171234567");
    expect(contactRowHref("Other phone", "0918")).toBe("tel:0918");
    expect(contactRowHref("Instagram", "@ana")).toBe("https://www.instagram.com/ana/");
    expect(contactRowHref("Facebook", "ana.cruz")).toBe("https://m.me/ana.cruz");
    expect(contactRowHref("TikTok", "ana")).toBe("https://www.tiktok.com/@ana");
    expect(contactRowHref("Birthday", "Feb 27, 1995")).toBeNull();
    expect(contactRowHref("Phone", "  ")).toBeNull();
  });
});

describe("preferredContact", () => {
  it("is the action to call or text them, by their number", () => {
    expect(preferredContact({ preferred_contact_method: "call", phone: "0917 123 4567" })).toEqual({ label: "Call", detail: "0917 123 4567", href: "tel:09171234567" });
    expect(preferredContact({ preferred_contact_method: "sms", phone: "09171234567" })).toEqual({ label: "Text message", detail: "09171234567", href: "sms:09171234567" });
  });

  it("is the action to message them on Messenger or Instagram, by their handle", () => {
    expect(preferredContact({ preferred_contact_method: "messenger", facebook_handle: "ana.cruz" })).toEqual({ label: "Messenger", detail: "ana.cruz", href: "https://m.me/ana.cruz" });
    expect(preferredContact({ preferred_contact_method: "instagram", instagram_handle: "ana" })).toEqual({ label: "Instagram", detail: "@ana", href: "https://www.instagram.com/ana/" });
  });

  it("says what's missing, with no link, when they prefer a way they gave nothing for", () => {
    expect(preferredContact({ preferred_contact_method: "sms" })).toEqual({ label: "Text message", detail: "No phone number saved", href: null });
    expect(preferredContact({ preferred_contact_method: "instagram", instagram_handle: " " })).toEqual({ label: "Instagram", detail: "No Instagram username saved", href: null });
    expect(preferredContact({ preferred_contact_method: "messenger" })?.href).toBeNull();
  });

  it("reads the value whatever its case, and is null for no preference or an unknown one", () => {
    expect(preferredContact({ preferred_contact_method: "Instagram", instagram_handle: "ana" })?.label).toBe("Instagram");
    expect(preferredContact({ preferred_contact_method: "" })).toBeNull();
    expect(preferredContact({ preferred_contact_method: null })).toBeNull();
    expect(preferredContact({ preferred_contact_method: "pigeon", phone: "0917" })).toBeNull();
    expect(preferredContact({})).toBeNull();
  });
});
