import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface DayCalendarProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  isDisabled: (date: Date) => boolean;
  isFullyBooked: (date: Date) => boolean;
}

// Single-date calendar for choosing a booking day, in the app look (round days on milk).
// It allows the current month and the next one.
export default function DayCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  isDisabled,
  isFullyBooked,
}: DayCalendarProps) {
  const now = new Date();

  return (
    <DayPicker
      mode="single"
      required
      month={month}
      onMonthChange={onMonthChange}
      selected={selected}
      onSelect={onSelect}
      fromMonth={now}
      toMonth={new Date(now.getFullYear(), now.getMonth() + 1)}
      disabled={isDisabled}
      modifiers={{ fullyBooked: isFullyBooked }}
      modifiersClassNames={{ fullyBooked: "[&>button]:text-crimson" }}
      classNames={{
        root: "relative w-fit",
        month: "w-full",
        month_caption: "flex items-center justify-center h-8 text-[13px] font-bold text-gray-red",
        caption_label: "text-[13px] font-bold",
        nav: "absolute left-0 right-0 top-0 flex items-center justify-between",
        button_previous:
          "w-8 h-8 flex items-center justify-center transition hover:scale-110 aria-disabled:opacity-20 cursor-pointer aria-disabled:cursor-not-allowed",
        button_next:
          "w-8 h-8 flex items-center justify-center transition hover:scale-110 aria-disabled:opacity-20 cursor-pointer aria-disabled:cursor-not-allowed",
        chevron: "w-4 h-4 fill-crimson text-crimson",
        month_grid: "w-full border-separate border-spacing-2",
        weekday: "text-center text-[11px] font-bold text-gray-red/70 pb-1",
        day: "h-7 w-7 p-0 text-center",
        day_button: `
          h-9 w-9 rounded-full text-sm font-bold text-gray-red transition-colors duration-200
          bg-milk cursor-pointer
          hover:bg-crimson hover:text-milk
          focus:bg-crimson focus:text-milk
          disabled:opacity-30 disabled:line-through disabled:cursor-not-allowed
          disabled:hover:bg-milk disabled:hover:text-gray-red
        `,
        selected: "rounded-full !bg-crimson !text-milk hover:!bg-crimson focus:!bg-crimson",
        range_start: "!bg-transparent",
        range_middle: "!bg-transparent",
        range_end: "!bg-transparent",
        disabled: "pointer-events-none",
        today: "rounded-full ring-1 ring-crimson",
        outside: "opacity-0 pointer-events-none",
      }}
    />
  );
}
