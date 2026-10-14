import { getSettings, updateSettings } from "@/server/handlers/settings";

export const dynamic = "force-dynamic";

export const GET = getSettings;
export const PUT = updateSettings;
