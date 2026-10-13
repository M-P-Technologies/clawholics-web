import { describe, expect, it } from "vitest";
import { interleave } from "@/hooks/usePhotoStrip";

const photo = (nailist: number, n: number) => ({ id: nailist * 100 + n, nailist_id: nailist, image_url: `https://img.test/${nailist}-${n}.jpg`, position: n });

describe("Their art strip", () => {
  it("takes the artists' photos in turns, so every artist is near the start", () => {
    const galleries = [[photo(1, 1), photo(1, 2), photo(1, 3)], [photo(2, 1)], [], [photo(3, 1), photo(3, 2)]];
    expect(interleave(galleries).map((p) => p.id)).toEqual([101, 201, 301, 102, 302, 103]);
  });

  it("stops at the most the strip shows", () => {
    const big = Array.from({ length: 30 }, (_, i) => photo(1, i + 1));
    expect(interleave([big], 24)).toHaveLength(24);
    expect(interleave([])).toEqual([]);
  });
});
