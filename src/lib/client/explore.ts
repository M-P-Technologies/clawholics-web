import type { NailService } from "../../services/serviceService";

/** Explore's list: services in a category (empty = all) whose name or description has the words */
export function filterServices(services: NailService[], { q, category }: { q: string; category: string }): NailService[] {
  const words = q.trim().toLowerCase();
  return services.filter(
    (s) =>
      (!category || (s.category ?? "").toLowerCase() === category.toLowerCase()) &&
      (!words || s.name.toLowerCase().includes(words) || (s.description ?? "").toLowerCase().includes(words)),
  );
}
