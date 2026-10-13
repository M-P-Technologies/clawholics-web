import { isAdmin } from "@/server/auth";
import { getCategories } from "@/server/catalog";
import { publicReads } from "@/server/publicCache";
import { createCategory } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

// Admins also see inactive categories and each category's service count, read fresh; everyone
// else gets the cached public list
export const GET = ported(async () =>
  Response.json((await isAdmin()) ? await getCategories(true) : await publicReads.categories()),
);

export const POST = createCategory;
