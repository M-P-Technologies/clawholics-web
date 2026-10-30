import "server-only";
import { getSql } from "../db";
import { isValidUnsubscribe } from "../unsubscribe";
import { ported } from "../worker";

// GET and POST /unsubscribe?u=<user id>&t=<signature> (public: the link in a rebooking email, and
// the one-click unsubscribe mail apps send as a POST). Turns off the rebooking emails for that
// client; their booking emails are not affected. Safe to repeat.

const page = (title: string, message: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} | Clawholics by Max</title></head>
<body style="margin:0;background:#f6e9e1;color:#3d2b28;font-family:system-ui,sans-serif;">
<main style="max-width:460px;margin:64px auto;padding:0 20px;text-align:center;">
<h1 style="font-weight:normal;font-size:28px;">${title}</h1>
<p style="font-size:16px;line-height:1.6;">${message}</p>
<p><a href="/" style="color:#78404c;font-weight:bold;">Back to Clawholics by Max</a></p>
</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );

async function unsubscribe(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  const userId = Number(params.get("u"));
  if (!Number.isInteger(userId) || userId < 1 || !isValidUnsubscribe(userId, params.get("t") ?? "")) {
    return page("This link isn't valid", "It may have been copied incompletely. If you'd like to stop these emails, reply to one of them and we'll take care of it.", 400);
  }
  await getSql()`update customer_profiles set nudge_emails_off = 1 where user_id = ${userId}`;
  return page("You're unsubscribed", "You won't get rebooking reminders from us anymore. You'll still get emails about your bookings.");
}

export const unsubscribeNudges = ported(unsubscribe, { requireOrigin: false });
