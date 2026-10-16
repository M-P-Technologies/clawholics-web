import { Check } from "lucide-react";
import { WEEK } from "../../data/home";
import { readGoodToKnow } from "../../lib/homeSections";
import { type AboutContent } from "../../services/aboutService";
import { Button } from "@/components/atoms";
import MapFrame from "./MapFrame";

// Where we are and when we are open. Everything comes from the About page content, so
// the owner can change it in the admin.
export default function QuickContact({ about }: { about: AboutContent }) {
  const hours = WEEK.map((day) => {
    const raw = about[`about_business_hours_${day}` as keyof AboutContent];
    if (!raw) return null;
    const time = raw.replace(day, "").trim();
    return { day, time, closed: /closed/i.test(time) };
  }).filter((row): row is { day: string; time: string; closed: boolean } => row !== null);

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(about.about_location)}`;

  return (
    <div className="flex flex-col gap-3 md:gap-6">
      <p className="copy-note">Visit us</p>
      <h2 className="font-display text-4xl font-normal uppercase leading-tight tracking-widest text-gray-red md:text-5xl">
        Quick contact
      </h2>

      <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="flex flex-col gap-3 md:gap-6">
          {about.about_location_url ? (
            <MapFrame src={about.about_location_url} className="h-72 w-full overflow-hidden rounded-2xl border border-crimson-light/40 lg:h-80" />
          ) : (
            <p className="flex h-72 items-center justify-center rounded-2xl border border-crimson-light/40 text-gray-red lg:h-80">
              Map not available
            </p>
          )}
          <div className="flex w-full items-center justify-between gap-3">
            <p className="min-w-0 copy-body">{about.about_location}</p>
            <Button href={directionsUrl} variant="bare" arrow className="text-base font-semibold text-gray-red hover:text-crimson-ink gap-3 shrink-0 whitespace-nowrap">
              Directions
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-lg font-normal uppercase tracking-widest text-gray-red">
            Opening times
          </h3>
          <ul>
            {hours.map(({ day, time, closed }) => (
              <li
                key={day}
                className="flex items-center justify-between gap-3 border-b border-crimson-light/80 py-3 text-sm text-gray-red"
              >
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${closed ? "bg-crimson-light" : "bg-crimson"}`}
                  />
                  {day}
                </span>
                <span className={closed ? "text-gray-red" : ""}>{time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="font-display text-lg font-normal uppercase tracking-widest text-gray-red">
            Good to know
          </h3>
          <ul className="flex flex-col gap-3">
            {readGoodToKnow(about).map((item, i) => (
              <li key={i} className="flex items-start gap-3 copy-body">
                <Check size={16} className="mt-0.5 shrink-0 text-crimson" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
