import { getPopularServiceIds } from "@/server/popularServices";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

// GET /services/popular (public): the ids of the services booked most, most first. The pages put
// them in front of the public services list; a few minutes old is fine.
export const GET = ported(async () =>
  Response.json({ ids: await getPopularServiceIds() }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }),
);
