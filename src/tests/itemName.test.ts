import { describe, expect, it } from "vitest";
import { itemName, quotedName, upperFirst } from "@/lib/itemName";

describe("itemName", () => {
  it("is the name, tidied", () => {
    expect(itemName("  Miss   Max ", "this artist")).toBe("Miss Max");
  });
  it("falls back when there is no name yet", () => {
    expect(itemName("", "this artist")).toBe("this artist");
    expect(itemName("   ", "this artist")).toBe("this artist");
    expect(itemName(null, "this artist")).toBe("this artist");
    expect(itemName(undefined, "this artist")).toBe("this artist");
  });
  it("cuts a long name short", () => {
    const long = "A".repeat(80);
    const out = itemName(long, "x", 20);
    expect(out).toHaveLength(20);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("quotedName", () => {
  it("puts the text in quotes", () => {
    expect(quotedName("How do I book?", "this FAQ")).toBe("“How do I book?”");
  });
  it("shortens a long question and falls back when empty", () => {
    expect(quotedName("Q".repeat(100), "this FAQ", 30)).toMatch(/^“Q{29}…”$/);
    expect(quotedName("", "this FAQ")).toBe("this FAQ");
  });
});

describe("upperFirst", () => {
  it("capitalises the first letter only", () => {
    expect(upperFirst("this artist")).toBe("This artist");
    expect(upperFirst("Miss Max")).toBe("Miss Max");
    expect(upperFirst("")).toBe("");
  });
});
