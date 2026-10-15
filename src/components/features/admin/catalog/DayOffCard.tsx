import { ArrowLeft as BackButtonIcon, Check as CheckIcon } from "lucide-react";
import React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import type { NailistDayOffs } from "@/services/nailistService";
import { SectionHeader } from "@/components/molecules";
import { WEEK_DAYS, parseDateKey } from "@/lib/admin/artistEditor";
import { useDayOffs } from "@/hooks/admin/useDayOffs";
import { SectionSkeleton } from "../skeletons/skeletons";

const DayOffCard = ({
  nailistId,
  disabled,
  regularDays,
  customDates,
  setRegularDays,
  setCustomDates,
  onDayOffsLoaded,
}: {
  nailistId?: number;
  disabled: boolean;
  regularDays: number[];
  customDates: string[];
  setRegularDays: React.Dispatch<React.SetStateAction<number[]>>;
  setCustomDates: React.Dispatch<React.SetStateAction<string[]>>;
  onDayOffsLoaded: (dayOffs: NailistDayOffs) => void;
}) => {
  const { month, setMonth, isLoading, isDayOff, isBookedDay, toggleRegularDay, toggleCustomDate } = useDayOffs({
    nailistId,
    disabled,
    regularDays,
    customDates,
    setRegularDays,
    setCustomDates,
    onDayOffsLoaded,
  });

  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeader size="label" title="Day Off" />

      {isLoading ? (
        <SectionSkeleton label="Loading days off" lines={2} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-1">
            <p className="text-[15px] text-gray-red">Regular:</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {WEEK_DAYS.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-1 text-[14px] text-gray-red"
                >
                  <span className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={regularDays.includes(day.value)}
                      disabled={disabled}
                      onChange={() => toggleRegularDay(day.value)}
                      className="
                        peer
                        w-4 h-4 appearance-none rounded-[3px]
                        border border-crimson bg-transparent
                        checked:bg-crimson
                        disabled:cursor-not-allowed
                      "
                    />

                    <CheckIcon
                      size={18} className="pointer-events-none absolute hidden peer-checked:block text-light-orange"
                    />
                  </span>

                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <p className="text-[15px] text-gray-red mb-1">Custom Dates:</p>

          {/* Calendar above its legend: the editor's side panel is narrow at every screen size */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-milk p-2 w-full flex justify-center border border-crimson-light">
              <DayPicker
                mode="multiple"
                month={month}
                onMonthChange={setMonth}
                selected={customDates.map(parseDateKey)}
                onDayClick={toggleCustomDate}
                weekStartsOn={1}
                showOutsideDays={false}
                disabled={disabled}
                modifiers={{
                  booked: isBookedDay,
                  dayOff: (date) => isDayOff(date) && !isBookedDay(date),
                  available: (date) => !isDayOff(date) && !isBookedDay(date),
                }}
                className="day-off-picker text-gray-red w-full"
                classNames={{
                  root: "relative w-full",
                  month: "w-full",
                  month_caption:
                    "flex items-center justify-center h-8 text-[13px] font-bold uppercase tracking-wide text-gray-red",
                  caption_label: "text-[13px] font-bold uppercase",
                  nav: "absolute left-0 right-0 top-0 flex items-center justify-between",
                  button_previous:
                    "w-7 h-7 flex items-center justify-center",
                  button_next:
                    "w-7 h-7 flex items-center justify-center",
                  chevron: "w-4 h-4 fill-crimson text-gray-red",
                  month_grid:
                    "w-full table-fixed border-separate border-spacing-1",
                  weekday:
                    "text-center text-[11px] font-bold text-gray-red pb-1",
                  day: "p-0 text-center",
                  day_button:
                    "w-full aspect-square rounded-sm text-[13px] font-bold text-gray-red transition-colors disabled:cursor-not-allowed",
                  outside: "opacity-0 pointer-events-none",
                }}
                components={{
                  Chevron: ({ orientation }) => (
                    <BackButtonIcon
                      size={24} className={`text-gray-red ${
                        orientation === "right" ? "rotate-180" : ""
                      }`}
                    />
                  ),
                }}
                modifiersClassNames={{
                  booked: "[&>button]:!bg-danger/40",
                  dayOff: "[&>button]:!bg-gray-red/40",
                  available: "[&>button]:!bg-success/50",
                }}
              />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="block w-4 h-4 rounded-sm bg-success/50" />
                <span className="text-[13px] text-gray-red">
                  Available
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="block w-4 h-4 rounded-sm bg-danger/40" />
                <span className="text-[13px] text-gray-red">
                  Booked
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="block w-4 h-4 rounded-sm bg-gray-red/40" />
                <span className="text-[13px] text-gray-red">
                  Day off
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DayOffCard;
