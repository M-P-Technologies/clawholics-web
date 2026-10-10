import { isAdmin } from "@/server/auth";
import { getCategories } from "@/server/catalog";
import { createCategory } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

// Admins also see inactive categories and each category's service count
export const GET = ported(async () => Response.json(await getCategories(await isAdmin())));

export const POST = createCategory;
