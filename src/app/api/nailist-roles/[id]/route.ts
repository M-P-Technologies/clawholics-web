import { deleteNailistRole, updateNailistRole } from "@/server/handlers/nailistRoles";

export const dynamic = "force-dynamic";

export const PUT = updateNailistRole;
export const DELETE = deleteNailistRole;
