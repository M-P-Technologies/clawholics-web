import clsx from "clsx";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

const SIZE = {
  sm: {
    day: "h-7 w-7 p-0 text-center sm:h-8 sm:w-8",
    button: "h-7 w-7 text-[12px] sm:h-8 sm:w-8 sm:text-[13px]",
    grid: "border-spacing-1 sm:border-spacing-1.5",
  },
  md: { day: "h-9 w-9 p-0 text-center", button: "h-9 w-9 text-sm", grid: "border-spacing-1.5" },
} as const;

interface DayCalendarProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  isDisabled: (date: Date) => boolean;
  isFullyBooked: (date: Date) => boolean;
  /** sm for a narrow dialog, md (default) on a page */
  size?: keyof typeof SIZE;
  /** Only this month and the next N can be shown; without it, any month */
  monthsAhead?: number;
}

// Single-date calendar for choosing a booking day: soft rounded days, the chosen one filled, today ringed,
// fully booked days in the brand colour and unavailable ones struck through.
export default function DayCalendar({ month, onMonthChange, selected, onSelect, isDisabled, isFullyBooked, size = "md", monthsAhead }: DayCalendarProps) {
  const now = new Date();
  const s = SIZE[size];

  return (
    <DayPicker
      mode="single"
      required
      month={month}
      onMonthChange={onMonthChange}
      selected={selected}
      onSelect={onSelect}
      {...(monthsAhead !== undefined && {
        startMonth: new Date(now.getFullYear(), now.getMonth()),
        endMonth: new Date(now.getFullYear(), now.getMonth() + monthsAhead),
      })}
      disabled={isDisabled}
      modifiers={{ fullyBooked: isFullyBooked }}
      modifiersClassNames={{ fullyBooked: "[&>button]:text-crimson" }}
      classNames={{
        root: "relative w-fit max-w-full",
        month: "w-full",
        month_caption: "flex h-7 items-center justify-center text-[12px] font-bold uppercase tracking-wide text-gray-red sm:text-[13px]",
        caption_label: "text-[13px] font-bold uppercase sm:text-[14px]",
        nav: "absolute left-0 right-0 top-0 flex items-center justify-between",
        button_previous: "flex h-7 w-7 items-center justify-center transition hover:scale-110 aria-disabled:cursor-not-allowed aria-disabled:opacity-20",
        button_next: "flex h-7 w-7 items-center justify-center transition hover:scale-110 aria-disabled:cursor-not-allowed aria-disabled:opacity-20",
        chevron: "h-3.5 w-3.5 fill-crimson text-gray-red",
        month_grid: clsx("w-full border-separate", s.grid),
        weekday: "pb-1 text-center text-[12px] font-bold text-gray-red sm:text-[13px]",
        day: s.day,
        day_button: clsx(
          s.button,
          "rounded-md bg-crimson-light/40 font-bold text-gray-red transition-colors duration-200 hover:bg-crimson hover:text-light-orange focus:bg-crimson focus:text-light-orange disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through disabled:hover:bg-crimson-light/40 disabled:hover:text-gray-red",
        ),
        // On the cell: fill its button, which would otherwise hide a background on the cell
        selected: "[&>button]:!bg-berry [&>button]:!text-pearl",
        range_start: "!bg-transparent",
        range_middle: "!bg-transparent",
        range_end: "!bg-transparent",
        disabled: "pointer-events-none",
        today: "[&>button]:ring-2 [&>button]:ring-crimson/60",
        outside: "opacity-0 pointer-events-none",
      }}
    />
  );
}
