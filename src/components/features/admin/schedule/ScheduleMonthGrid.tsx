import { ArrowLeft as BackButton } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { getDayDotColor, getDayPickerDate, isPastDay, monthLabel, type ArtistSchedule } from "@/lib/admin/schedule";
import { toDateKey } from "@/services/scheduleAgenda";
import { Button } from "@/components/atoms";

interface ScheduleMonthGridProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  onPrevious: () => void;
  onNext: () => void;
  dayData: (date: Date) => ArtistSchedule[];
  onOpenDate: (dateKey: string) => void;
}

// A month of days, each with a dot (phone) or a line (wider) per artist: free, fully booked or off
export default function ScheduleMonthGrid({ month, onMonthChange, onPrevious, onNext, dayData, onOpenDate }: ScheduleMonthGridProps) {
  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <Button variant="bare" type="button" onClick={onPrevious} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center">
          <BackButton size={32} className="text-gray-red" />
        </Button>
        <h3 className="text-base lg:text-lg uppercase">{monthLabel(month)}</h3>
        <Button variant="bare" type="button" onClick={onNext} aria-label="Next month" className="flex h-8 w-8 items-center justify-center">
          <BackButton size={32} className="text-gray-red rotate-180" />
        </Button>
      </div>

      <DayPicker
        month={month}
        onMonthChange={onMonthChange}
        showOutsideDays={false}
        formatters={{ formatWeekdayName: (date) => date.toLocaleDateString("en-US", { weekday: "short" }) }}
        classNames={{
          root: "flex-1 flex flex-col min-w-0",
          months: "flex-1 flex flex-col min-w-0",
          month: "flex-1 flex flex-col min-w-0",
          month_caption: "hidden",
          caption_label: "hidden",
          nav: "hidden",
          weekdays: "grid grid-cols-7 gap-1 lg:gap-3 mb-2 text-center text-gray-red font-bold text-xs sm:text-[13px] lg:text-base",
          weekday: "py-1",
          weeks: "grid grid-rows-6 gap-1 lg:gap-3 lg:flex-1",
          week: "grid grid-cols-7 gap-1 lg:gap-3",
          day: "h-13 sm:h-17 lg:min-h-26.25 lg:h-full w-full",
          day_button: "h-full w-full p-0",
          outside: "invisible",
          today: "",
          selected: "",
        }}
        components={{
          Day: (props) => {
            const validDate = getDayPickerDate(props);
            if (!validDate || validDate.getMonth() !== month.getMonth()) return <td className="p-0" />;
            const artists = dayData(validDate);

            // The day replaces the calendar's own cell, so it must still be a <td> inside the row
            return (
              <td className="flex min-w-0 p-0">
              <Button
                variant="bare"
                type="button"
                onClick={() => onOpenDate(toDateKey(validDate))}
                className={`flex h-full min-h-0 lg:min-h-26.25 w-full flex-col rounded-sm bg-light-orange/40 px-1 py-1 lg:px-2 lg:py-2 text-left transition ${
                  isPastDay(validDate) ? "opacity-40" : "hover:scale-[1.02] hover:shadow"
                }`}
              >
                <p className="mb-1 lg:mb-2 text-[13px] lg:text-base font-semibold leading-none text-gray-red">{validDate.getDate()}</p>

                <div className="flex w-full flex-wrap gap-0.5 lg:hidden">
                  {artists.slice(0, 4).map((artist) => (
                    <span key={artist.id} className={`h-1.5 w-1.5 rounded-full ${getDayDotColor(artist)}`} />
                  ))}
                </div>

                <div className="hidden w-full flex-col gap-1 overflow-hidden lg:flex">
                  {artists.slice(0, 3).map((artist) => (
                    <div key={artist.id} className="flex w-full items-center gap-1 rounded-sm bg-light-orange px-1 lg:px-2 py-0.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${getDayDotColor(artist)}`} />
                      <span className="truncate text-[10px] sm:text-[10px] lg:text-xs leading-tight text-gray-red">{artist.name}</span>
                    </div>
                  ))}
                </div>
              </Button>
              </td>
            );
          },
        }}
      />
    </>
  );
}
