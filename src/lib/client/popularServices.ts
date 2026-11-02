import type { NailService } from "../../services/serviceService";

/** The services to show as popular: the ones booked most first (`rankedIds`, most first), then the
 *  rest in the admin's order, up to `count`. Ids the list doesn't have (a hidden service) are skipped. */
export function popularServices(services: NailService[], rankedIds: number[], count: number): NailService[] {
  const byId = new Map(services.map((service) => [service.id, service]));
  const ranked = [...new Set(rankedIds)].map((id) => byId.get(id)).filter((service): service is NailService => !!service);
  const rest = services.filter((service) => !ranked.includes(service));
  return [...ranked, ...rest].slice(0, count);
}
