import { createNailistRole, listNailistRoles } from "@/server/handlers/nailistRoles";

export const dynamic = "force-dynamic";

export const GET = listNailistRoles;
export const POST = createNailistRole;
