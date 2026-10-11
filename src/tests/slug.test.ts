import { describe, expect, it } from "vitest";
import { artistPath, findBySlugOrId, findServiceByParam, servicePath, slugify } from "../utils/slug";

const services = [
  { id: 1, name: "Softgel Extensions" },
  { id: 2, name: "Hard Gel" },
  { id: 3, name: "Hard Gel & BIAB Overlay" },
  { id: 4, name: "Café Nails!" },
];

describe("slugify", () => {
  it("lower-cases and joins words with hyphens", () => {
    expect(slugify("Hard Gel")).toBe("hard-gel");
    expect(slugify("Softgel Extensions")).toBe("softgel-extensions");
  });

  it("handles symbols, accents, spacing and ampersands", () => {
    expect(slugify("Hard Gel & BIAB Overlay")).toBe("hard-gel-and-biab-overlay");
    expect(slugify("  Café Nails!  ")).toBe("cafe-nails");
    expect(slugify("Gel -- Manicure (Classic)")).toBe("gel-manicure-classic");
  });

  it("gives a service its address", () => {
    expect(servicePath({ name: "Hard Gel" })).toBe("/services/hard-gel");
  });
});

describe("findServiceByParam", () => {
  it("finds a service by the slug of its name, ignoring case", () => {
    expect(findServiceByParam(services, "hard-gel")?.id).toBe(2);
    expect(findServiceByParam(services, "Hard-Gel")?.id).toBe(2);
    expect(findServiceByParam(services, "hard-gel-and-biab-overlay")?.id).toBe(3);
  });

  it("still follows the older numeric addresses", () => {
    expect(findServiceByParam(services, "2")?.name).toBe("Hard Gel");
    expect(findServiceByParam(services, "99")).toBeNull();
  });

  it("finds nothing for a name that doesn't exist", () => {
    expect(findServiceByParam(services, "soft-gel")).toBeNull();
  });
});

describe("artists", () => {
  const artists = [
    { id: 1, name: "Miss Max" },
    { id: 3, name: "Miss Pring" },
  ];

  it("get an address named after them", () => {
    expect(artistPath({ name: "Miss Max" })).toBe("/artists/miss-max");
  });

  it("are found by the slug of their name, or by the older id address", () => {
    expect(findBySlugOrId(artists, "miss-pring")?.id).toBe(3);
    expect(findBySlugOrId(artists, "1")?.name).toBe("Miss Max");
    expect(findBySlugOrId(artists, "miss-nobody")).toBeNull();
    expect(findServiceByParam).toBe(findBySlugOrId); // the older name still works
  });
});
