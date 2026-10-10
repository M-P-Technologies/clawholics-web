import { sendConfirmationEmailRoute } from "@/server/handlers/misc";

export const dynamic = "force-dynamic";

// POST to the API root was the Worker's other path for /emails
export const POST = sendConfirmationEmailRoute;
