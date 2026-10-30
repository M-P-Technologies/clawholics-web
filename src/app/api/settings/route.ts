import { getSettings, updateSettings } from "@/server/handlers/settings";
import { changesCatalog } from "@/server/publicCache";

export const dynamic = "force-dynamic";

export const GET = getSettings;
// Saving drops the cached public reads: the pages quote the downpayment from these settings
export const PUT = changesCatalog(updateSettings);
