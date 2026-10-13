import { publicReads } from "@/server/publicCache";
import { updateCarousel } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

export const GET = ported(async () => Response.json(await publicReads.carousel()));

export const PUT = updateCarousel;
