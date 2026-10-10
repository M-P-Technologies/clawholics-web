import { getPaymentSettingsRoute, updatePaymentSettings } from "@/server/handlers/payments";

export const dynamic = "force-dynamic";

export const GET = getPaymentSettingsRoute;
export const PUT = updatePaymentSettings;
