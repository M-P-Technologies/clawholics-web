import { deleteNailist, getNailistById, updateNailist } from "@/server/handlers/nailists";

export const dynamic = "force-dynamic";

export const GET = getNailistById;
export const PUT = updateNailist;
export const DELETE = deleteNailist;
