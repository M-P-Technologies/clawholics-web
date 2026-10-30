import { getPaymentSettingsRoute, updatePaymentSettings } from "@/server/handlers/payments";
import { changesCatalog } from "@/server/publicCache";

export const dynamic = "force-dynamic";

export const GET = getPaymentSettingsRoute;
// Saving drops the cached public reads: the pages quote the downpayment from these settings
export const PUT = changesCatalog(updatePaymentSettings);
