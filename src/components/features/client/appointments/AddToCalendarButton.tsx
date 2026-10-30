"use client";

import { Button } from "@/components/atoms";
import { useSalonAddress } from "@/hooks/useSalonAddress";
import { googleCalendarUrl, icsContent, icsFilename, type CalendarEvent } from "@/lib/calendarEvent";
import { CLIENT_PATHS } from "@/lib/client/clientNav";
import { SITE_URL } from "@/lib/seo";
import { downloadTextFile } from "@/utils/downloadTextFile";

interface AddToCalendarButtonProps {
  id: number;
  service: string;
  artist?: string;
  date: string;
  time: string;
}

// Adds one visit to the client's calendar: a calendar file (Apple Calendar, Outlook, Google) or a
// Google Calendar link. Left out when the visit's date or time can't be read.
export default function AddToCalendarButton({ id, service, artist, date, time }: AddToCalendarButtonProps) {
  const address = useSalonAddress();
  const event: CalendarEvent = { id, service, artist, date, time, location: address || undefined, manageUrl: `${SITE_URL}${CLIENT_PATHS.appointments}` };
  const google = googleCalendarUrl(event);
  if (!google) return null;

  const download = () => {
    const text = icsContent(event);
    if (text) downloadTextFile(icsFilename(event), text, "text/calendar");
  };

  return (
    <div role="group" aria-label="Add to your calendar" className="flex flex-wrap items-center gap-3">
      <Button type="button" size="sm" variant="secondary" onClick={download}>
        Add to calendar
      </Button>
      <Button size="sm" variant="secondary" href={google}>
        Google Calendar<span className="sr-only"> (opens in a new tab)</span>
      </Button>
    </div>
  );
}
