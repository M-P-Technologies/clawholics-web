import { getNailistServices, setNailistServices } from "@/server/handlers/nailists";

export const dynamic = "force-dynamic";

export const GET = getNailistServices;
export const PUT = setNailistServices;
