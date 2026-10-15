import { PAGES, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { publicReads } from "@/server/publicCache";
import { specialtiesOf } from "@/server/seo";
import { artistPath, servicePath } from "@/utils/slug";

// /llms.txt (llmstxt.org): a plain summary of the site for AI assistants and answer engines, built
// from the same content as the pages: what the salon is, where and when, every service with its
// price and page, the artists, and the main pages. Rebuilt when the catalog changes, and hourly.
export const revalidate = 3600;

type Row = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function read<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

export async function GET() {
  const [home, about, services, artists] = await Promise.all([
    read(() => publicReads.content("home") as Promise<Row>, {}),
    read(() => publicReads.content("about") as Promise<Row>, {}),
    read(() => publicReads.services() as Promise<Row[]>, []),
    read(() => publicReads.nailists() as Promise<Row[]>, []),
  ]);

  const lines: string[] = [`# ${SITE_NAME}`, "", `> ${SITE_DESCRIPTION}`, ""];

  const address = text(about.about_location) || text(home.contact_location);
  const hours = DAYS.map((day) => text(about[`about_business_hours_${day}`])).filter(Boolean);
  lines.push("## The salon", "");
  if (address) lines.push(`- Address: ${address}, Philippines`);
  if (text(home.contact_phone)) lines.push(`- Phone: ${text(home.contact_phone)}`);
  if (text(home.contact_email)) lines.push(`- Email: ${text(home.contact_email)}`);
  if (hours.length) lines.push(`- Opening hours: ${hours.join("; ")}`);
  lines.push(`- Booking: online at ${SITE_URL}${PAGES.services.path} (a downpayment holds the slot)`, "");

  if (services.length) {
    lines.push("## Services", "");
    for (const s of services) {
      const prices = [Number(s.junior_price), Number(s.master_price)].filter((p) => p > 0);
      const price = prices.length
        ? Math.min(...prices) === Math.max(...prices)
          ? peso(prices[0])
          : `${peso(Math.min(...prices))} to ${peso(Math.max(...prices))} (junior to master technician)`
        : "";
      const details = [price, text(s.duration)].filter(Boolean).join(", ");
      lines.push(`- [${text(s.name)}](${SITE_URL}${servicePath({ name: text(s.name) })})${details ? `: ${details}` : ""}`);
    }
    lines.push("");
  }

  if (artists.length) {
    lines.push("## Nail artists", "");
    for (const a of artists) {
      const skills = specialtiesOf(a);
      const about = [text(a.position), skills.length ? `specializes in ${skills.join(", ")}` : ""].filter(Boolean).join(", ");
      lines.push(`- [${text(a.name)}](${SITE_URL}${artistPath({ name: text(a.name) })})${about ? `: ${about}` : ""}`);
    }
    lines.push("");
  }

  lines.push("## Pages", "");
  for (const key of ["about", "contact", "faq", "terms", "privacy"] as const) {
    lines.push(`- [${PAGES[key].title}](${SITE_URL}${PAGES[key].path}): ${PAGES[key].description}`);
  }

  return new Response(`${lines.join("\n")}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
