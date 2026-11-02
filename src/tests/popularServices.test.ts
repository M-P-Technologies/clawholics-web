import { describe, expect, it } from "vitest";
import { popularServices } from "@/lib/client/popularServices";
import type { NailService } from "@/services/serviceService";

const list = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `Service ${i + 1}` }) as NailService);
const names = (services: NailService[]) => services.map((s) => s.name);

describe("popular services", () => {
  it("puts the services booked most first, then fills with the admin's order", () => {
    expect(names(popularServices(list(8), [6, 3], 4))).toEqual(["Service 6", "Service 3", "Service 1", "Service 2"]);
  });

  it("is the admin's order when nothing has been booked, or the ranking hasn't loaded", () => {
    expect(names(popularServices(list(8), [], 4))).toEqual(["Service 1", "Service 2", "Service 3", "Service 4"]);
  });

  it("skips services the public list doesn't have (hidden ones), and repeats", () => {
    expect(names(popularServices(list(5), [99, 4, 4, 2], 3))).toEqual(["Service 4", "Service 2", "Service 1"]);
  });

  it("shows fewer when there aren't enough services", () => {
    expect(names(popularServices(list(2), [2], 4))).toEqual(["Service 2", "Service 1"]);
  });
});
